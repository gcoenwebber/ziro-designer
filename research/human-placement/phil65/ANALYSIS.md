# How a human places a PCB: Phil's Lab #65 (STM32 "black-pill", 2-layer)

**Source:** [KiCad 6 STM32 PCB Design Full Tutorial – Phil's Lab #65](https://www.youtube.com/watch?v=aVUqaB0IMh4)
(Phil Salmony, 2022-07-05, 1h40m). Placement is at **57:03–79:54**, setup at 52:11, routing at 79:54–93:00.

**Board:** STM32F103 (LQFP-48), 16 MHz HSE crystal and load caps, one 100 nF decoupling cap per VDD/VBAT pin
plus a bulk cap, a VDDA pi-filter (1 µF, ferrite, 1 µF, 10 nF), USB micro-B with a 1.5 k D+ pull-up, an AMS1117-3.3 LDO
with in/out caps, a power LED, SWD/UART/I2C 1×4 headers, a BOOT0 switch and resistor, an NRST cap, and 4× M2 holes.
That's about 32 footprints. Two layers: top for signals, bottom a solid GND plane.

**Files in this folder**

| File | What it is |
|---|---|
| `placement_trace.jsonl` | 54 timestamped human actions (setup, placement, the fixes he makes during routing). Each has the target, anchor, stated reason, the signals he looked at, and a criticality level. Each row links to the exact second of the video. |
| `final_positions_recreation.csv` | Final x/y/rotation of every part, from a learner's public recreation of this board ([abda-s/STM32-Phill-s-Lab-PCB-Course](https://github.com/abda-s/STM32-Phill-s-Lab-PCB-Course)). **Not Phil's own file**: the designators differ (e.g. its R2 is the USB pull-up). Use it for spatial relationships, not as ground truth. |
| `../fetch_transcript.py` | Regenerates the timestamped transcript locally. Transcripts are not committed. |

---

## 1. The algorithm he actually runs

Below is his process written as pseudo-code. Almost every line is something he says out loud. The `# tacit` lines are things he does but never states.

```
setup: stackup (2L, bottom = GND plane) → fab design rules → track/via/diff-pair sizes
import all footprints, dump them off to one side
coarse grid (1 / 0.5 mm); schematic on one screen, PCB on the other (cross-probe)

anchor = most important IC (MCU); drop it anywhere          # absolute position is irrelevant
for part in parts sorted by CRITICALITY(part):              # explicit ranking, see §2
    if criticality is low and its spot is crowded: DEFER(part)       # bulk cap, NRST cap
    target = pin(s) of anchor the ratsnest points to
    place part next to target
    rotate so that:
        - its pins face the pins they connect to (no crossed ratsnest lines)
        - power pad faces the VDD pin and GND pad faces the VSS pin (smallest loop)
        - the *future route* is a straight line                      # he pictures the trace
    series/shunt passives go IN LINE with the net, never on a stub
    tidy the silkscreen label right away
    every ~3-5 actions: open the 3D view; fix footprint problems     # changes the BOM!
    if a cluster gets cramped: select the whole cluster and move it as a unit
place the remaining islands, ordered by the schematic's bounding boxes
    (USB/SWD → BOOT/UART/I2C → power section)
resolve the deferred parts (bulk cap goes on the side away from the power source)
add mounting holes → snap them to whole-mm spacing → globally re-pack everything to fit
board outline = holes + 3 mm keep-out, corners are arcs on the hole centres
push edge connectors out to the edge (USB lip flush, switch sticks out)
during routing: nudge parts when a route fails or a pad gets in the way
```

**Main takeaway:** he never optimises a global objective. There's no "minimise wirelength" pass and no "minimise area" pass. Each part is placed **relative to one anchor pin** and **rotated to make one imagined route trivial**. The overall quality comes from the *ordering* (most critical first gets the best spots) plus local rules. That shape fits an autoregressive model well.

## 2. The priority order (in his own words)

| Rank | What | When | Why he says it ranks there |
|---|---|---|---|
| 0 | MCU | 58:10 | "start with the most important parts first" |
| 1 | Small decoupling caps, one per VDD pin | 59:03 | "always start with proper decoupling capacitor placement" |
| 2 | Crystal + load caps | 60:20 | "sensitive components such as the crystal" |
| 3 | VDDA 10 nF, then the pi filter | 61:46 | analog supply; the filter itself is "not too critical" |
| 4 | USB connector + D+ pull-up | 63:53 | "might have an impact on performance" |
| 5 | SWD header | 65:30 | next most performance-relevant |
| 6 | BOOT0, NRST, UART, I2C (+ pull-ups) | 69:38 | low-speed, "pretty much DC… not really critical" |
| 7 | Power island (LDO, caps, LED) | 72:11 | placed next to its source (USB VBUS pin) |
| 8 | Deferred bulk cap | 73:55 | "anywhere close" |
| 9 | Mounting holes → outline → edge alignment | 74:50 | mechanical, comes last |

**Check against the final geometry:** sort the parts in the recreation by distance from the MCU centre and the
order is almost the same as the priority order above:

```
100 nF/1 µF decoupling  6.1–7.0 mm   (LQFP-48 pad edge ≈ 4.5 mm, so a gap of ≈ 2 mm; he measured "just under 2 mm")
ferrite / load caps     7.9–8.2 mm
bulk cap / 10 nF        8.4–8.8 mm
crystal                 10.5 mm
pull-ups                10.6–12.4 mm
LDO                     12.7 mm
headers                 14.6–16.0 mm
switch / USB / LED      17.8–19.2 mm
mounting holes          20.8–24.2 mm
```

So **criticality ≈ how close to the anchor**, and **placement order ≈ criticality**. If you only extract one label per part, extract this rank.

## 3. The local rules he uses (ready to encode)

| # | Rule | Evidence | Type |
|---|---|---|---|
| R1 | Decoupling cap ~2 mm from its VDD pin, not touching the pin | 59:03, measured | distance |
| R2 | Decoupling cap orientation: power pad faces VDD and GND pad faces VSS, so the current loop is smallest | 59:40 | rotation |
| R3 | Rotate any part so its ratsnest lines don't cross | 60:41, 65:30, 70:40 | rotation |
| R4 | Rotate so the *future trace* is straight (e.g. OSC_IN routes under the crystal) | 60:41 | rotation, needs lookahead |
| R5 | Series and pull-up passives sit in line with their net, never on a stub | 61:00, 64:58, 71:20 | position |
| R6 | Crystal load caps in line with the crystal traces | 61:00 | position |
| R7 | Crystal may sit further away than decoupling caps | 61:20 | distance (relative) |
| R8 | Low-criticality parts give up proximity for routing room (NRST cap) | 70:10 | trade-off |
| R9 | Line the connector up with the MCU pins it serves (USB D± on pins 32/33 → straight pair, under 10 mm) | 63:53 | position |
| R10 | Don't put a connector so close that hand soldering is hard | 64:26 | assembly |
| R11 | Same pin order on every header (GND and 3V3 always on the same side) | 70:54 | consistency |
| R12 | Without a power plane, turn the power pads of neighbouring parts toward each other | 71:20 | rotation |
| R13 | Put the regulator next to where power comes in, rotated toward that pin | 72:11 | position, rotation |
| R14 | Regulator caps close, with *both* the forward and return (GND) paths short | 72:50 | position |
| R15 | Bulk cap on the far side of the IC from the power source | 73:55 | position |
| R16 | Mounting holes at whole-mm spacing (35 × 25 mm) for the mechanical team | 76:15 | mechanical |
| R17 | Outline = hole + 3 mm keep-out; corner arcs centred on the holes | 77:18 | mechanical |
| R18 | Edge connectors: lip flush with the edge; switch sticks out so you can flick it | 78:25 | mechanical, UX |
| R19 | Keep spacing between signal groups; if cramped, move the whole cluster | 62:00 | spacing |

## 4. What he looks at, and how often

| Signal | Approx. uses | Role |
|---|---|---|
| **Schematic cross-probe** | always on (split screen) | Defines the islands (schematic bounding boxes) and "what connects to what" |
| **Ratsnest** | almost every placement | "KiCad is indirectly telling me, somewhere up here", used for position *and* rotation |
| **Pin names** | rotation decisions | reads SWCLK/SWDIO/OSC_IN labels to choose a rotation |
| **3D view** | ~6× in 23 min | sanity checks; caught an oversized footprint and a missing model |
| **Measure tool** | ~4× | checks a rule (2 mm, under 10 mm, 35 × 25 mm, 3 mm) |

For a model, this means the input context needs the **netlist grouped by schematic section**, the **pin names and positions
on the anchor IC**, and the **current partial placement**. The ratsnest is just a view of that information.

## 5. Things he does but never says (the tacit part)

1. **The board size is never chosen. It comes out of the placement.** He says "connectors start to define the board outline" (64:40).
   Then the mounting-hole spacing forces a global re-pack (76:15). The outline is drawn *last*.
2. **Which side of the MCU a section goes on is decided by the MCU pinout**, which was itself chosen in the schematic step
   (CubeIDE pin-out at 21:15). Placement starts in the schematic.
3. **Placement and part selection are coupled.** The 3D check led to a footprint swap (DIP → SMD switch, 67:06).
4. **Placement isn't finished when routing starts.** At least 3 fixes happen *during routing* (84:55, 86:33, 88:11).
   The human loop is place → route → nudge.
5. **He tidies as he goes.** Silkscreen tidying is mixed in with placement, which keeps the canvas readable for the next decision.
6. **Thinking about the next step.** Several rotations are justified by "this makes my routing life so much easier". He is
   simulating the router in his head. A placement model that never sees routing outcomes won't learn R4.
7. **Coarse to fine.** "Very rough layout… then hone in". He starts on a coarse grid and refines.

## 6. What this means for an autoregressive placement model

- **Sequence order = criticality order**, not netlist or BOM order. Train on traces sorted the way §2 sorts them, or
  let the model pick the next part (pointer over unplaced parts). The order is half of what the human knows.
- **Use relative actions, not absolute coordinates.** Nearly every action has the form
  `(part, anchor_pin, side/offset, rotation)`. Absolute xy only matters for holes, the outline and edge connectors, which all come at the end.
- **Small action vocabulary:** `place_relative`, `rotate`, `group_move`, `defer`, `nudge`, `snap_to_edge`,
  `add_mechanical`. All 54 rows in the trace fit into these.
- **Keep the deferrals and revisions** in the training sequences. A clean "one placement per part" dataset
  throws away the edits, and the edits are a large part of how he actually works.
- **Reason as an optional output.** Each step has a short stated reason that maps to R1–R19, so you can train
  `reason → action` (chain-of-thought style) cheaply.
- **Two-stage generation looks natural:** (a) islands relative to the anchor, which is the electrical part; (b) mechanical
  fit-up with holes, outline, edge connectors and a global re-pack. Phil's process already has this split.
- **Feedback from routing is the open question.** R4/R12 and the routing-time nudges need some view of routability.
  The cheapest proxy is "is the ratsnest straight and uncrossed".

## 7. Limitations of this analysis

- From this cloud environment YouTube allowed the captions but **blocked the video stream**, so this analysis is built from the narration
  plus the final geometry of a recreation. To get frame-accurate coordinates per step, download the video locally and
  sample frames at the `t_sec` values in `placement_trace.jsonl`.
- The narration is an *expert explaining for students*. That's more explicit than a working engineer would be, but also a bit
  idealised (it's a planned tutorial, and some trial and error was edited out, e.g. "let me just do that now", 76:15).
- One board and one engineer. Before generalising, cross-check the rules against 2–3 more videos (Phil's Lab #166, #128, and
  the uncut 4 h "Smart IO Board" session).
