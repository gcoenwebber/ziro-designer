/**
 * Rotate / mirror command for placed symbols.
 *
 * Grounded in KiCad's SCH_SYMBOL::Rotate / MirrorHorizontally / MirrorVertically:
 *  - the symbol's orientation (angle + mirror) is advanced via the same transform
 *    algebra KiCad uses (see geom/transform.ts);
 *  - the symbol's position is rotated/mirrored about a center point;
 *  - fields are *translated* by the symbol's position delta (they do not spin),
 *    keeping their offset from the symbol and staying readable.
 *
 * The center is captured at construction so undo is exact (the inverse op about the
 * same center restores positions and fields). Rotation's inverse is the opposite
 * spin; a mirror is its own inverse.
 */

import type { Schematic, SchSymbol, SchField, Vec2 } from '../model/types.js';
import { rotateOrientation, mirrorOrientation } from '../geom/transform.js';
import { refId } from './hittest.js';
import type { EditCommand } from './command.js';

export type TransformOp = 'rotateCW' | 'rotateCCW' | 'mirrorX' | 'mirrorY';

const INVERSE: Record<TransformOp, TransformOp> = {
  rotateCW: 'rotateCCW',
  rotateCCW: 'rotateCW',
  mirrorX: 'mirrorX',
  mirrorY: 'mirrorY',
};

/** Rotate a point 90° about a center (CCW unless `cw`), KiCad's RotatePoint. */
function rotatePoint(p: Vec2, c: Vec2, cw: boolean): Vec2 {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  // Screen space is +Y-down: CCW (mathematical) is (x,y) -> (y, -x).
  return cw ? { x: c.x - dy, y: c.y + dx } : { x: c.x + dy, y: c.y - dx };
}

function transformSymbol(s: SchSymbol, op: TransformOp, center: Vec2): SchSymbol {
  const prev = s.at;
  let at: Vec2;
  let orient: { angle: number; mirror?: 'x' | 'y' };

  if (op === 'rotateCW' || op === 'rotateCCW') {
    const cw = op === 'rotateCW';
    at = rotatePoint(prev, center, cw);
    orient = rotateOrientation({ angle: s.angle, mirror: s.mirror }, cw);
  } else if (op === 'mirrorX') {
    // MirrorVertically: flip Y about the center, advance orientation by MIRROR_X.
    at = { x: prev.x, y: 2 * center.y - prev.y };
    orient = mirrorOrientation({ angle: s.angle, mirror: s.mirror }, 'x');
  } else {
    // mirrorY = MirrorHorizontally: flip X about the center, MIRROR_Y.
    at = { x: 2 * center.x - prev.x, y: prev.y };
    orient = mirrorOrientation({ angle: s.angle, mirror: s.mirror }, 'y');
  }

  const d: Vec2 = { x: at.x - prev.x, y: at.y - prev.y };
  const fields = s.fields.map((f: SchField) => (f.at ? { ...f, at: { x: f.at.x + d.x, y: f.at.y + d.y } } : f));
  const next: { -readonly [K in keyof SchSymbol]: SchSymbol[K] } = { ...s, at, angle: orient.angle, fields };
  if (orient.mirror) next.mirror = orient.mirror;
  else delete next.mirror;
  return next;
}

/** Bounding-box center of the selected symbols' positions (snapped is the caller's job). */
function selectionCenter(doc: Schematic, ids: ReadonlySet<string>): Vec2 {
  const pts: Vec2[] = [];
  doc.symbols.forEach((s, i) => { if (ids.has(refId('symbol', s.uuid, i))) pts.push(s.at); });
  if (pts.length === 0) return { x: 0, y: 0 };
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  return { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2) };
}

/**
 * Rotate or mirror every selected symbol about the selection center. For a single
 * symbol the center is its own position, so only its orientation changes (KiCad's
 * single-item behaviour). `center` may be supplied to keep undo exact.
 */
export function transformItems(ids: ReadonlySet<string>, op: TransformOp, center?: Vec2): EditCommand {
  return {
    label: op.startsWith('rotate') ? 'Rotate' : 'Mirror',
    apply(doc: Schematic): Schematic {
      if (ids.size === 0) return doc;
      const c = center ?? selectionCenter(doc, ids);
      return {
        ...doc,
        symbols: doc.symbols.map((s, i) => (ids.has(refId('symbol', s.uuid, i)) ? transformSymbol(s, op, c) : s)),
      };
    },
    invert(before: Schematic): EditCommand {
      // Reuse the same center so the inverse exactly retraces the positions.
      return transformItems(ids, INVERSE[op], center ?? selectionCenter(before, ids));
    },
  };
}
