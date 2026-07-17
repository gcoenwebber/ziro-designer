/**
 * Group tool. Counterpart: `eeschema/tools/sch_group_tool.cpp` (SCH_GROUP_TOOL)
 * + `common/tool/group_tool.cpp` (GROUP_TOOL) — Group Items / Ungroup Items:
 *
 *  - Group: the groupable selected items (those with uuids) become the members
 *    of a fresh SCH_GROUP; fewer than two groupable items is a no-op, and an
 *    item already in a group *moves* into the new one (the old group is
 *    modified in the same commit). The new group is what's selected after.
 *  - Ungroup: every selected group is removed and its members stay behind
 *    (selected). Nested member groups survive intact.
 *  - Selection promotion (SCH_SELECTION_TOOL group handling): clicking a
 *    member selects the whole top-level group, so the promotion helper expands
 *    a selection to every member of every touched group, transitively.
 *
 * Selection ids are item uuids (refId returns the uuid when present), so group
 * members and selection ids share one namespace.
 */

import type { Schematic, SchGroup } from '../types.js';
import type { EditCommand } from './command.js';
import { newUuid } from './build.js';
import { list, atom, str } from '@ziroeda/sexpr/src/types.js';

/** Every item uuid a group member can reference (groups included, for nesting). */
export function collectItemUuids(doc: Schematic): Set<string> {
  const out = new Set<string>();
  const add = (u?: string): void => {
    if (u) out.add(u);
  };
  doc.symbols.forEach((i) => add(i.uuid));
  doc.lines.forEach((i) => add(i.uuid));
  doc.junctions.forEach((i) => add(i.uuid));
  doc.noConnects.forEach((i) => add(i.uuid));
  doc.labels.forEach((i) => add(i.uuid));
  doc.sheets.forEach((i) => add(i.uuid));
  doc.busEntries.forEach((i) => add(i.uuid));
  doc.images.forEach((i) => add(i.uuid));
  // Sheet-level graphic shapes are render-only pass-throughs without typed
  // uuids yet; they simply can't join groups until that changes.
  doc.textBoxes.forEach((i) => add(i.uuid));
  doc.tables.forEach((i) => add(i.uuid));
  doc.groups.forEach((g) => add(g.uuid));
  return out;
}

/** Build a fresh SchGroup (SCH_GROUP constructor + AddItem). */
function makeGroup(members: readonly string[], name = ''): SchGroup {
  const uuid = newUuid();
  return {
    name,
    uuid,
    members,
    source: list(
      atom('group'),
      str(name),
      list(atom('uuid'), str(uuid)),
      list(atom('members'), ...[...members].sort().map(str)),
    ),
  };
}

/** Snapshot-restore of the groups array (the inverse of any group edit). */
function restoreGroups(saved: readonly SchGroup[]): EditCommand {
  return {
    label: 'Group Items',
    apply(doc: Schematic): Schematic {
      return { ...doc, groups: saved };
    },
    invert(before: Schematic): EditCommand {
      return restoreGroups(before.groups);
    },
  };
}

/**
 * Group Items (SCH_GROUP_TOOL::Group): the selected ids that are groupable
 * item uuids become one new group; members leave any group they were in.
 */
export function groupItemsCommand(ids: ReadonlySet<string>): EditCommand {
  return {
    label: 'Group Items',
    apply(doc: Schematic): Schematic {
      const valid = collectItemUuids(doc);
      const members = [...ids].filter((id) => valid.has(id));
      if (members.length < 2) return doc; // canGroupItem gate: nothing to group
      const memberSet = new Set(members);
      // An item joining the new group leaves its old one (AddItem reparents).
      const groups = doc.groups.map((g) =>
        g.members.some((m) => memberSet.has(m))
          ? { ...g, members: g.members.filter((m) => !memberSet.has(m)) }
          : g,
      );
      return { ...doc, groups: [...groups, makeGroup(members)] };
    },
    invert(before: Schematic): EditCommand {
      return restoreGroups(before.groups);
    },
  };
}

/**
 * Ungroup Items (GROUP_TOOL::Ungroup): every group touched by the selection —
 * selected directly by uuid or through any selected member — is removed;
 * members stay behind.
 */
export function ungroupItemsCommand(ids: ReadonlySet<string>): EditCommand {
  return {
    label: 'Ungroup Items',
    apply(doc: Schematic): Schematic {
      return {
        ...doc,
        groups: doc.groups.filter(
          (g) => !(g.uuid && ids.has(g.uuid)) && !g.members.some((m) => ids.has(m)),
        ),
      };
    },
    invert(before: Schematic): EditCommand {
      const cmd = restoreGroups(before.groups);
      return { ...cmd, label: 'Ungroup Items' };
    },
  };
}

/**
 * Selection promotion: expand `ids` so that touching any member (or a group's
 * own uuid) selects every member of that group, resolving nested groups
 * transitively — the whole-group selection SCH_SELECTION_TOOL produces.
 */
export function expandSelectionToGroups(
  doc: Schematic,
  ids: ReadonlySet<string>,
): ReadonlySet<string> {
  if (doc.groups.length === 0) return ids;
  const out = new Set(ids);
  const byUuid = new Map(doc.groups.filter((g) => g.uuid).map((g) => [g.uuid!, g]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of doc.groups) {
      const touched = (g.uuid && out.has(g.uuid)) || g.members.some((m) => out.has(m));
      if (!touched) continue;
      // Mark the group itself selected, so a parent group holding it as a
      // member is touched on the next pass (top-level group promotion).
      if (g.uuid && !out.has(g.uuid)) {
        out.add(g.uuid);
        changed = true;
      }
      for (const m of g.members) {
        if (!out.has(m)) {
          out.add(m);
          changed = true;
        }
        // A member that is itself a group brings its own members along.
        const nested = byUuid.get(m);
        if (nested) {
          for (const nm of nested.members) {
            if (!out.has(nm)) {
              out.add(nm);
              changed = true;
            }
          }
        }
      }
    }
  }
  return out;
}

/** Whether any selected id belongs to (or is) a group — the Ungroup enable test. */
export function selectionHasGroup(doc: Schematic, ids: ReadonlySet<string>): boolean {
  return doc.groups.some(
    (g) => (g.uuid !== undefined && ids.has(g.uuid)) || g.members.some((m) => ids.has(m)),
  );
}

/** Drop member uuids whose item no longer exists (delete keeps groups tidy;
 *  a group emptied this way stops being written, per saveGroup). */
export function pruneGroupMembers(doc: Schematic): Schematic {
  if (doc.groups.length === 0) return doc;
  const valid = collectItemUuids(doc);
  let dirty = false;
  const groups = doc.groups.map((g) => {
    const members = g.members.filter((m) => valid.has(m));
    if (members.length !== g.members.length) {
      dirty = true;
      return { ...g, members };
    }
    return g;
  });
  return dirty ? { ...doc, groups } : doc;
}
