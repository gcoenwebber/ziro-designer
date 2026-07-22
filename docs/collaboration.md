# Real-time collaboration — design & working documentation

> Status: design doc for roadmap item 6 (*Collaboration — sharing, review,
> multiplayer*). Nothing here is built yet; this is the plan, the options, and
> reference implementations for the frontend and backend.

This document specifies how to add a Canva-style "who's doing what"
collaboration experience to Ziro Designer: live cursors, presence, selection
highlights, soft edit locks, and — as a later phase — true concurrent
co-editing of the document.

## Contents

1. [Framing: two separate problems](#1-framing-two-separate-problems)
2. [How this fits the existing architecture](#2-how-this-fits-the-existing-architecture)
3. [Options at a glance](#3-options-at-a-glance)
4. [Layer 1 — Presence & awareness](#4-layer-1--presence--awareness)
5. [Layer 2 — Soft edit locks](#5-layer-2--soft-edit-locks)
6. [Layer 3 — Concurrent co-editing](#6-layer-3--concurrent-co-editing)
7. [Backend: sharing, membership & authorization](#7-backend-sharing-membership--authorization)
8. [Additional options (beyond Supabase)](#8-additional-options-beyond-supabase)
9. [Non-functional concerns](#9-non-functional-concerns)
10. [Phased rollout](#10-phased-rollout)

---

## 1. Framing: two separate problems

Canva's "collaborator mode" feel is really **two** features, and they have
wildly different costs. Keep them separate.

| | **Awareness** (who's here / what they're doing) | **Co-editing** (concurrent changes to the doc) |
|---|---|---|
| Data | Ephemeral: cursors, selections, "editing X" | Durable: the actual `.kicad_sch` / `.kicad_pcb` content |
| On conflict | Doesn't matter — last cursor wins | Must not lose work — needs OT/CRDT or locks |
| Persistence | Never saved to the file | Saved, round-trip-critical |
| Effort | Days | Weeks–months |
| User-visible payoff | High (this *is* the Canva feel) | High but invisible until it works perfectly |

**The strategic point:** ~80% of the "wow" is the awareness layer, and it
carries *zero* correctness risk because it never touches the saved file. Ship
that first. Treat true co-editing as a separate, later project.

---

## 2. How this fits the existing architecture

Three properties of the current codebase make this tractable:

- **Supabase is already a dependency** (`@supabase/supabase-js` in
  `designer/package.json`), and auth/session is already wired through
  `designer/src/auth/AuthProvider.tsx` (`useAuth()` → `session.user`). Supabase
  **Realtime** gives us Presence + Broadcast channels with no new backend.
- **Edits are already serializable commands.** `eeschema/src/tools/command.ts`
  defines `EditCommand { apply(doc), invert(before) }`, and its own header
  anticipates "scripting / AI-driven edits later — they all just submit
  commands." That command is exactly the unit we broadcast for remote editing.
- **Items have stable ids** (`refId`, uuid-based, in `eeschema/src/tools/…`) and
  coordinates are **integer internal units** (100 nm). Stable ids make
  "Alice selected symbol X" trivial to express; integers serialize cleanly.

Two constraints from `PHILOSOPHY.md` bound the design:

- **Format-compatibility promise.** Anything beyond the KiCad format lives in
  sidecar storage (a `.ziro/` folder or a Supabase table), *never* inside
  `.kicad_*` files. All collaboration/presence state is sidecar/ephemeral.
- **Round-trip fidelity is a release blocker.** This is why Layer 3 (CRDT) is
  hard: the live editing representation must still serialize back to the
  lossless S-expression model byte-for-byte.

Current persistence (for contrast with Layer 3): `designer/src/cloud/sync.ts` is
**last-write-wins on whole-project gzipped blobs**. Fine for multi-device sync;
it will silently clobber a concurrent co-editor. Layer 3 replaces this for the
live-editing path.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React app — designer/)                             │
│                                                              │
│  Editor frame (SchematicEditor.tsx)                          │
│   ├─ doc: Schematic (immutable)   ◀─ History (command bus)   │
│   ├─ selection: Set<refId>                                   │
│   └─ CollabProvider ───────────┐                             │
│        ├─ presence (self)      │                             │
│        ├─ remote peers[]       │  overlay canvas:            │
│        └─ soft locks           │  cursors, name tags,        │
│                                │  selection tints            │
└────────────────────────────────┼─────────────────────────────┘
                                 │  WebSocket
                    ┌────────────▼─────────────┐
                    │  Supabase Realtime        │
                    │  channel "project:<id>"   │
                    │   • Presence (who/where)  │
                    │   • Broadcast (cursors,   │
                    │     commands, locks)      │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Supabase Postgres + RLS  │
                    │   projects, project_members│
                    │   (+ doc_updates for CRDT)│
                    └──────────────────────────┘
```

---

## 3. Options at a glance

For the transport/sync engine. Presence (Layer 1) is nearly identical across all
of them; they diverge at Layer 3.

| Option | Presence | Co-edit model | New infra | Cost | Best when |
|---|---|---|---|---|---|
| **Supabase Realtime** (recommended) | ✅ built-in | Command broadcast + server ordering, or Yjs-over-broadcast | None (already have it) | Included in Supabase plan | You want to reuse existing stack |
| **Liveblocks** | ✅ excellent | CRDT storage (LiveObject/LiveList) or Yjs | Managed SaaS | Per-MAU | Fastest path to polished multiplayer |
| **Yjs + Hocuspocus** (self-host) | ✅ (awareness protocol) | Yjs CRDT | A Node WS server | Hosting only | You want CRDT + full control |
| **PartyKit / Cloudflare DO** | ✅ | Anything (you write the server) | Cloudflare Workers | Cheap at scale | Edge latency, custom logic |
| **y-webrtc (P2P)** | ✅ | Yjs CRDT, peer-to-peer | Signaling only | ~free | Small rooms, no server persistence |
| **Ably / Pusher** | ✅ | You build on top | Managed SaaS | Per-message | Presence-only, don't want Supabase RT |
| **ElectricSQL / PowerSync** | partial | Local-first Postgres sync | Sync service | Varies | Whole-app offline-first sync |

**Recommendation:** Supabase Realtime for Layers 1–2 (zero new infra, on-brand
with the existing stack). For Layer 3, choose between **Yjs transported over
Supabase Broadcast** (no new infra, but you own persistence) and **Liveblocks**
(fastest, managed, costs per-user) when you actually commit to concurrent
editing. Everything below documents the Supabase path in full and the others as
alternatives.

---

## 4. Layer 1 — Presence & awareness

The Canva feel. Ship this first.

### 4.1 What's transported

Two kinds of message on one channel per open project:

- **Presence state** (per user, synced & deduplicated by Realtime): identity +
  low-frequency state.
  ```ts
  interface CollabPresence {
    userId: string;
    name: string;         // display name / email local-part
    color: string;        // stable per-user hue
    file: string;         // which sheet/board they're viewing (e.g. "root.kicad_sch")
    selection: string[];  // refIds they have selected
    cursor: { x: number; y: number } | null;  // world coords (internal units)
    editing: string | null;  // refId being actively dragged/edited (soft lock)
  }
  ```
- **Broadcast events** (high-frequency, not persisted): cursor moves. Sent on a
  separate throttled path so they don't spam the presence-sync fan-out.

> Cursor position is sent in **world coordinates (internal units)**, not screen
> pixels — every peer has a different pan/zoom, so each transforms into its own
> viewport on render (see 4.4).

### 4.2 Backend: enable Realtime

Supabase Realtime needs no schema for Broadcast/Presence, but you should make
the channel **private** so only project members can join. Two steps:

1. Turn on Realtime for the project (Dashboard → Project → Realtime is on by
   default). Presence/Broadcast work out of the box.
2. **Authorize private channels** with RLS on `realtime.messages`. A user may
   use channel `project:<id>` only if they're a member of that project. See
   [§7](#7-backend-sharing-membership--authorization) for the `project_members`
   table this policy references.

```sql
-- docs reference; ship in designer/supabase/realtime.sql
-- Restrict who can join / broadcast on a "project:<uuid>" channel.
-- Requires the project_members table from §7.

alter table realtime.messages enable row level security;

create policy "project_members_can_use_channel"
  on realtime.messages
  for select                       -- receiving (subscribe)
  to authenticated
  using (
    exists (
      select 1 from public.project_members m
      where m.project_id = split_part(realtime.messages.topic, ':', 2)::uuid
        and m.user_id = auth.uid()
    )
  );

create policy "project_members_can_broadcast"
  on realtime.messages
  for insert                       -- sending (broadcast/presence track)
  to authenticated
  with check (
    exists (
      select 1 from public.project_members m
      where m.project_id = split_part(realtime.messages.topic, ':', 2)::uuid
        and m.user_id = auth.uid()
    )
  );
```

On the client, private channels require handing the auth token to Realtime:

```ts
// after sign-in, and on token refresh:
supabase.realtime.setAuth(); // pulls the current access token from the session
```

### 4.3 Frontend: the collaboration hook

A single hook owns the channel lifecycle and exposes peers + a way to publish
your own state. Put it in `designer/src/collab/`.

```ts
// designer/src/collab/useCollab.ts
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../auth/supabaseClient.js';
import { useAuth } from '../auth/AuthProvider.js';

export interface Peer {
  userId: string;
  name: string;
  color: string;
  file: string;
  selection: readonly string[];
  cursor: { x: number; y: number } | null;
  editing: string | null;
}

// Deterministic, distinct color per user (stable across sessions).
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 70% 55%)`;
}

export function useCollab(projectId: string | null) {
  const { session } = useAuth();
  const [peers, setPeers] = useState<Peer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Local mirror of our own presence so partial updates can be merged cheaply.
  const selfRef = useRef<Peer | null>(null);

  useEffect(() => {
    const user = session?.user;
    if (!supabase || !projectId || !user) return;

    void supabase.realtime.setAuth(); // authorize the private channel

    const self: Peer = {
      userId: user.id,
      name: (user.email ?? 'anon').split('@')[0]!,
      color: colorFor(user.id),
      file: '',
      selection: [],
      cursor: null,
      editing: null,
    };
    selfRef.current = self;

    const channel = supabase.channel(`project:${projectId}`, {
      config: { private: true, presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const recomputePeers = () => {
      const state = channel.presenceState<Peer>();
      const list: Peer[] = [];
      for (const key of Object.keys(state)) {
        if (key === user.id) continue; // exclude ourselves
        const entry = state[key]?.[0];
        if (entry) list.push(entry);
      }
      setPeers(list);
    };

    channel
      .on('presence', { event: 'sync' }, recomputePeers)
      .on('presence', { event: 'join' }, recomputePeers)
      .on('presence', { event: 'leave' }, recomputePeers)
      // High-frequency cursor stream, kept off the presence path.
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        setPeers((prev) =>
          prev.map((p) =>
            p.userId === payload.userId ? { ...p, cursor: payload.cursor } : p,
          ),
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track(self);
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [projectId, session?.user?.id]);

  // Merge a partial update into our presence (selection, file, editing).
  const update = useCallback((patch: Partial<Peer>) => {
    const ch = channelRef.current;
    const self = selfRef.current;
    if (!ch || !self) return;
    selfRef.current = { ...self, ...patch };
    void ch.track(selfRef.current);
  }, []);

  // Cursor goes over broadcast (throttled by the caller), not presence.
  const sendCursor = useCallback((cursor: { x: number; y: number } | null) => {
    const ch = channelRef.current;
    const self = selfRef.current;
    if (!ch || !self) return;
    void ch.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: self.userId, cursor },
    });
  }, []);

  return { peers, update, sendCursor };
}
```

### 4.4 Frontend: publishing local state from the editor

Wire the hook into `SchematicEditor.tsx` (which already holds `doc`,
`selection`, `currentFile`, and a `toWorld` transform in `SchematicCanvas.tsx`).

```ts
// inside SchematicEditor, after existing state:
const { peers, update, sendCursor } = useCollab(projectId);

// Publish selection changes (low frequency → presence).
useEffect(() => {
  update({ selection: [...selection], file: currentFile });
}, [selection, currentFile, update]);

// Cursor movement (high frequency → throttled broadcast).
// SchematicCanvas already computes world coords via toWorld(clientX, clientY);
// forward them through an onCursorMove prop.
const lastSent = useRef(0);
const onCursorMove = useCallback((world: Vec2) => {
  const now = performance.now();
  if (now - lastSent.current < 40) return; // ~25 Hz
  lastSent.current = now;
  sendCursor(world);
}, [sendCursor]);
```

`SchematicCanvas.tsx` already derives world coordinates in its pointer handlers
(`const world = toWorld(e.clientX, e.clientY)`); add an `onCursorMove?(world)`
callback next to the existing `onMeasure`/`onPick` props and call it from the
move handler.

### 4.5 Frontend: rendering the overlay

Draw remote cursors, name tags, and selection tints on a transparent canvas (or
SVG) layered over the editor canvas. Convert each peer's **world** cursor to the
local viewport — the inverse of `toWorld` (`viewport = { offsetX, offsetY, scale }`,
`dpr` for HiDPI):

```ts
// world → screen (CSS px), inverse of SchematicCanvas.toWorld
function worldToScreen(w: Vec2, vp: Viewport, dpr: number) {
  return {
    x: (w.x * vp.scale + vp.offsetX) / dpr,
    y: (w.y * vp.scale + vp.offsetY) / dpr,
  };
}
```

```tsx
// designer/src/collab/CollabOverlay.tsx (sketch)
export function CollabOverlay({ peers, vp, dpr, file }: {
  peers: Peer[]; vp: Viewport; dpr: number; file: string;
}) {
  return (
    <div className="collab-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {peers
        .filter((p) => p.file === file && p.cursor)     // only peers on this sheet
        .map((p) => {
          const s = worldToScreen(p.cursor!, vp, dpr);
          return (
            <div key={p.userId} style={{ position: 'absolute', left: s.x, top: s.y }}>
              <CursorArrow color={p.color} />
              <span className="collab-tag" style={{ background: p.color }}>{p.name}</span>
            </div>
          );
        })}
    </div>
  );
}
```

Selection tint: for every `refId` in a peer's `selection`, draw the item's
bounding box in that peer's color inside the editor's own render pass (the
painter already knows how to outline selected items — reuse that with the peer
color and a lower alpha). This is what makes "Bob is working on U3" legible.

**Avatar stack / presence list:** just render `peers` (plus self) as a row of
colored initials in the editor toolbar — the same `peers` array drives it.

### 4.6 Cost & throughput notes

- Presence `track()` fans out on every change → keep it to **low-frequency**
  state (selection, file, editing flag). Never put the raw cursor in presence.
- Cursor broadcast at ~25 Hz × N peers is fine for small teams. If you later
  need big rooms, drop to ~15 Hz and interpolate on the receiver.
- `broadcast: { self: false }` avoids echoing your own messages back.

---

## 5. Layer 2 — Soft edit locks

Cheap conflict avoidance without a CRDT. When a user starts dragging/editing an
item, they set `editing: <refId>` in presence. Other clients:

- render that item with a "busy" affordance (peer-colored lock badge), and
- **gate their own edit** on it — refuse to start a move on an item another peer
  is actively editing.

```ts
// before starting a drag/edit in the editor:
function canEdit(refId: string, peers: Peer[]): boolean {
  return !peers.some((p) => p.editing === refId);
}

// on grab (SchematicEditor already has a grabRequest concept):
if (!canEdit(hit.refId, peers)) return; // someone else holds it
update({ editing: hit.refId });
// … on drop / escape:
update({ editing: null });
```

This is *advisory*, not a hard mutex (two people can still grab within the same
network round-trip), but for EDA work — where people rarely fight over the exact
same net — it removes the overwhelming majority of conflicts and is enough to
let a team genuinely work in one project at once. It pairs naturally with the
whole-file save model you already have: only one person is editing a given item,
so last-write-wins at save time stops losing work in practice.

---

## 6. Layer 3 — Concurrent co-editing

The real engineering lift: two people editing the **same** sheet at the same
time with no lost work. Current `sync.ts` (whole-blob last-write-wins) cannot do
this. Two viable designs.

### 6.1 Option A — Command broadcast + server ordering (lightest)

Leans directly on the existing command bus. Every local edit already goes
through `History.execute(doc, cmd)` (`eeschema/src/tools/command.ts`). Instead of
keeping the command local:

1. Serialize the `EditCommand` (it's a plain description — kind + payload; the
   `apply`/`invert` closures are reconstructed from a registry on receipt).
2. Broadcast it on the project channel.
3. Every client applies incoming commands in a **server-assigned order** and
   rebases its own un-acknowledged local commands on top.

```ts
// designer/src/collab/commandCodec.ts — commands must be data, not closures.
type WireCommand =
  | { t: 'add'; batch: ItemsBatch }
  | { t: 'delete'; ids: string[] }
  | { t: 'replaceLine'; index: number; next: SchLine }
  | { t: 'placeSymbol'; libId: string; sym: SchSymbol }
  /* … one variant per constructor in mutate.ts … */;

export function encode(cmd: WireCommand): WireCommand { return cmd; }
export function decode(w: WireCommand): EditCommand {
  switch (w.t) {
    case 'add':          return addItems(w.batch);
    case 'delete':       return deleteByIds(new Set(w.ids));
    case 'replaceLine':  return replaceLine(w.index, w.next);
    // …
  }
}
```

```ts
// broadcast on local edit
function executeShared(cmd: EditCommand, wire: WireCommand) {
  setDoc((d) => history.current.execute(d!, cmd));
  channel.send({ type: 'broadcast', event: 'edit', payload: { wire, seq: localSeq++ } });
}

// apply remote edit
channel.on('broadcast', { event: 'edit' }, ({ payload }) => {
  setDoc((d) => decode(payload.wire).apply(d!));
});
```

**Caveats.** Broadcast ordering isn't globally serialized by default; for
correctness under true concurrency you need a sequencer. Two ways:

- Route edits through a tiny **Edge Function / server** that assigns a monotonic
  `seq` per project and re-broadcasts. Clients apply in `seq` order and buffer
  gaps.
- Or persist each command to a Postgres `doc_updates` table (append-only, ordered
  by a `bigserial`), and use Realtime Postgres-changes as the ordered feed. This
  also gives you durable history + late-joiner replay for free.

Index-based commands (`replaceLine(index, …)`) are **not** safe under
concurrency — an insert elsewhere shifts indices. Migrate those to id-based
addressing (you already have `refId`) before enabling co-editing. Add/delete
(id-based) and field replacements are fine.

This design is a good match if paired with soft locks (§5): locks keep true
concurrent edits on the *same item* rare, so command replay rarely has to merge.

### 6.2 Option B — CRDT (most robust)

Model the live document as a CRDT so concurrent edits merge deterministically
with no central sequencer. **Yjs** is the pragmatic choice (mature, small,
`awareness` protocol doubles as your presence layer).

Shape:

- Represent the schematic as Yjs types: a `Y.Map` of items keyed by `uuid`, each
  item a `Y.Map` of fields; lists (e.g. wire chains) as `Y.Array`. Concurrent
  edits to different items never conflict; edits to different fields of the same
  item merge; edits to the *same* field resolve last-writer per Yjs rules.
- Transport the Yjs update stream over **Supabase Broadcast** (no new infra) or a
  dedicated **Hocuspocus**/**y-websocket** server (more control, built-in
  persistence). Persist Yjs document state (a binary blob) to Postgres/Storage,
  replacing the per-file gzip blob for the live path.

```ts
import * as Y from 'yjs';
const ydoc = new Y.Doc();
const items = ydoc.getMap('items');       // uuid -> Y.Map(field -> value)

// local edit
ydoc.transact(() => {
  const sym = items.get(uuid) as Y.Map<unknown>;
  sym.set('at', { x, y });
});

// ship updates (Supabase Broadcast transport)
ydoc.on('update', (update: Uint8Array) => {
  channel.send({ type: 'broadcast', event: 'yjs', payload: { u: [...update] } });
});
channel.on('broadcast', { event: 'yjs' }, ({ payload }) => {
  Y.applyUpdate(ydoc, new Uint8Array(payload.u));
});
```

**The hard part — the round-trip promise.** `PHILOSOPHY.md` requires that a file
opened and saved round-trips into desktop KiCad byte-for-byte for untouched
items, and every modeled item keeps its source AST node. So the CRDT is the
*live editing representation only*; on save you must serialize the Yjs state back
through the existing lossless S-expression model, preserving the untouched
source AST for items nobody edited. Design the Yjs↔model bridge so each item
carries (and round-trips) its original AST node reference. This bridge is the
bulk of the work and must be covered by the existing round-trip test corpus in
`qa/`.

### 6.3 Recommendation for Layer 3

Start with **Option A** (command broadcast + `doc_updates` ordering + soft
locks). It reuses the command bus you already have, needs no CRDT, and the
append-only update log gives durable history and late-joiner replay. Move to
**Option B (Yjs)** only if real usage shows people genuinely need
character-level / same-item concurrent editing that locks make awkward — and
budget the round-trip bridge as its own hardening project.

---

## 7. Backend: sharing, membership & authorization

Independent of transport: you need a way to say "these users can access this
project." This extends the existing `projects` table (`designer/supabase/projects.sql`)
without breaking its per-user RLS.

```sql
-- designer/supabase/collaboration.sql (reference)

-- Membership: who can access a project, and at what level.
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id)     on delete cascade,
  role       text not null default 'editor'
             check (role in ('owner', 'editor', 'viewer')),
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx
  on public.project_members (user_id);

alter table public.project_members enable row level security;

-- A member can see the membership rows of projects they belong to.
create policy "members_read_own_projects"
  on public.project_members for select to authenticated
  using (
    exists (select 1 from public.project_members m
            where m.project_id = project_members.project_id
              and m.user_id = auth.uid())
  );

-- Only owners manage membership (invite/remove).
create policy "owners_manage_members"
  on public.project_members for all to authenticated
  using (
    exists (select 1 from public.project_members m
            where m.project_id = project_members.project_id
              and m.user_id = auth.uid() and m.role = 'owner')
  )
  with check (
    exists (select 1 from public.project_members m
            where m.project_id = project_members.project_id
              and m.user_id = auth.uid() and m.role = 'owner')
  );
```

Then **broaden the existing `projects` RLS** so membership (not just ownership)
grants access. Today `projects_select_own` is `auth.uid() = user_id`; add a
membership path:

```sql
-- Replace the owner-only SELECT with a membership-aware one.
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_member"
  on public.projects for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.project_members m
               where m.project_id = projects.id and m.user_id = auth.uid())
  );

-- UPDATE allowed for owner or editor (viewers read-only).
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_member"
  on public.projects for update to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.project_members m
               where m.project_id = projects.id
                 and m.user_id = auth.uid() and m.role in ('owner','editor'))
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from public.project_members m
               where m.project_id = projects.id
                 and m.user_id = auth.uid() and m.role in ('owner','editor'))
  );
```

Do the equivalent for the Storage policies in `designer/supabase/storage.sql`
(the object path is `<userId>/<projectId>/…`; a membership check needs the
`projectId` segment, so either add a lookup or store objects under
`<projectId>/…` going forward).

**Backfill:** every existing project's owner should get an `owner` membership row
so current RLS keeps working:

```sql
insert into public.project_members (project_id, user_id, role)
select id, user_id, 'owner' from public.projects
on conflict do nothing;
```

**Invite flow (frontend):** owner enters an email → look up / invite the user →
insert a `project_members` row. For not-yet-registered users, store a pending
invite keyed by email and materialize the membership on first sign-in. The
`doc_updates` table for Layer 3 Option A (append-only edit log) also lives here:

```sql
create table if not exists public.doc_updates (
  seq        bigserial primary key,          -- global order within a project
  project_id uuid not null references public.projects (id) on delete cascade,
  file       text not null,                  -- which sheet/board
  author     uuid not null references auth.users (id),
  wire       jsonb not null,                 -- the encoded WireCommand
  created_at timestamptz not null default now()
);
create index if not exists doc_updates_project_seq
  on public.doc_updates (project_id, seq);
-- RLS: insert if editor+ member; select if any member. (mirror the policies above)
```

---

## 8. Additional options (beyond Supabase)

Options I didn't cover in the first pass, with when each wins.

### 8.1 Liveblocks (managed, fastest to polished)
Purpose-built for exactly this. Gives presence, "others" hooks, live cursors,
comments/threads, and conflict-free storage (`LiveObject`/`LiveList`) or a Yjs
integration — all managed. Least code to a Canva-grade result. Trade-off: a
third-party dependency and per-MAU pricing, and your document state lives in
their storage (mitigated by keeping the `.kicad_*` file as source of truth and
Liveblocks as the live layer). Strong candidate if speed-to-market on
multiplayer matters more than owning the stack.

### 8.2 Yjs + Hocuspocus (self-hosted CRDT)
Hocuspocus is a batteries-included Yjs WebSocket server (auth hooks, persistence
to Postgres, webhooks). You run one Node service; you get robust CRDT
co-editing and awareness. Trade-off: new infra to operate. Best if you commit to
CRDT (Layer 3 Option B) and want to own it rather than pay Liveblocks.

### 8.3 PartyKit / Cloudflare Durable Objects (edge, custom logic)
One Durable Object per project = a single authoritative in-memory room at the
edge, ideal for being the **command sequencer** in Layer 3 Option A (it can
assign `seq` and fan out with sub-50ms latency globally). You write the server
logic. Best for low latency at scale and custom server-side rules (e.g.
server-side DRC gating). Trade-off: another platform + you build the protocol.

### 8.4 y-webrtc (peer-to-peer, minimal infra)
Yjs over WebRTC: peers connect directly, you host only a tiny signaling server.
Near-zero backend cost and great latency for **small** rooms. Trade-offs: no
server-side persistence (need a "host" peer or periodic snapshot to Supabase),
NAT/firewall traversal issues, and it doesn't scale past a handful of peers per
room. Good for a cheap MVP of true co-editing among 2–4 people.

### 8.5 Ably / Pusher (managed pub/sub + presence)
Mature managed presence/broadcast if you'd rather not use Supabase Realtime for
the awareness layer. Functionally similar to Layer 1 here; you'd still build
co-editing yourself on top. Per-message pricing. Little reason to add if you're
already on Supabase, but a fallback if Realtime limits bite.

### 8.6 ElectricSQL / PowerSync (local-first Postgres sync)
Different philosophy: sync a subset of Postgres to a local database in the
browser and edit locally-first, with the sync engine reconciling. Interesting
long-term fit with your offline/IndexedDB story, and could unify device-sync +
collaboration. Heavier conceptual shift and still needs a merge story for the
document model. Worth watching, not the first move.

### 8.7 Automerge (alternative CRDT)
Rust/WASM CRDT with strong history/branching semantics (`automerge-repo` handles
sync/storage). Comparable to Yjs; Yjs is lighter and has the ready-made
awareness protocol, so prefer Yjs unless Automerge's richer history model is
specifically wanted.

---

## 9. Non-functional concerns

- **Security / authz.** All access flows through RLS (§7) *and* Realtime channel
  authorization (§4.2). Never trust the client's claimed `projectId` — the RLS
  policy on `realtime.messages` is what actually gates the channel. Presence
  payloads are user-controlled; treat `name`/`selection` as untrusted on render
  (escape, clamp counts).
- **Format compatibility.** Presence, locks, cursors, and the `doc_updates` log
  are all sidecar/ephemeral — none of it is ever written into `.kicad_*` files.
  The saved file always goes through the existing lossless serializer.
- **Offline / degraded.** `authEnabled` is already `false` when Supabase env
  vars are absent (`supabaseClient.ts`); collaboration must no-op cleanly in that
  mode (single-player local editing, exactly as today).
- **Scale.** Supabase Realtime limits concurrent connections and
  messages/second per plan; cursor broadcast is the hot path — throttle and
  consider interpolation for large rooms. Presence state size counts against
  message limits; keep it lean.
- **Late joiners (Layer 3).** With the `doc_updates` log, a client that joins
  mid-session loads the last saved file + replays updates since that save's
  `seq`. With Yjs, it syncs the current CRDT state vector on join.
- **Undo semantics under multiplayer.** Undo should be *per-user* (undo my last
  command, not the other person's). Option A: filter the undo stack by author.
  Yjs: use `Y.UndoManager` scoped to the local origin.
- **Testing.** Add multi-client simulation tests to `qa/` (two in-memory
  documents + a command relay, assert convergence). For Layer 3 Option B, the
  Yjs↔lossless-model round-trip must join the existing round-trip corpus.

---

## 10. Phased rollout

Each phase is independently shippable and independently valuable.

1. **Phase 1 — Presence (schematic editor).** `project_members` table + RLS,
   Realtime channel authorization, `useCollab` hook, cursor broadcast, overlay
   with cursors + name tags + selection tint, avatar stack. *This is the Canva
   feel.* No change to saved files. **Recommended first PR.**
2. **Phase 2 — Presence everywhere + soft locks.** Extend the hook to the PCB,
   symbol, and footprint editors; add the `editing` flag and edit-gating (§5).
3. **Phase 3 — Sharing UI.** Invite-by-email, role management, "shared with me"
   in the launcher, membership-aware project list.
4. **Phase 4 — Concurrent co-editing (Option A).** id-address the remaining
   index-based commands, `doc_updates` log + ordering, command replay, per-user
   undo. Keep soft locks on.
5. **Phase 5 (optional) — CRDT.** Only if usage proves it's needed; budget the
   Yjs↔lossless-model round-trip bridge as its own project.

**Suggested first PR:** Phase 1, schematic-only — self-contained, mergeable, and
it delivers the visible "who's doing what" experience with zero risk to the file
format.
