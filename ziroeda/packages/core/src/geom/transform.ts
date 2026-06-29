/**
 * Symbol placement transform.
 *
 * Grounded in KiCad's `TRANSFORM` class (libs/kimath) and `SCH_SYMBOL::SetOrientation`.
 * A placed symbol maps a point from symbol-local coordinates to schematic
 * coordinates with a 2x2 integer matrix:
 *
 *     worldX = x1 * localX + y1 * localY
 *     worldY = x2 * localX + y2 * localY
 *     world  = symbolPosition + (worldX, worldY)
 *
 * The matrix is the symbol's rotation (0/90/180/270) optionally composed with a
 * mirror about the X or Y axis. Both coordinate systems use the same +Y-down
 * convention KiCad's schematic format uses, so no extra Y-flip is introduced here.
 */

import type { Vec2 } from '../model/types.js';

/** A 2x2 integer transform, matching KiCad's `TRANSFORM { x1, y1, x2, y2 }`. */
export interface Transform {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export const IDENTITY: Transform = { x1: 1, y1: 0, x2: 0, y2: 1 };

/**
 * Base matrix for a symbol rotation, matching KiCad's parser:
 *   0 -> identity, 90 -> (0,1,-1,0), 180 -> (-1,0,0,-1), 270 -> (0,-1,1,0).
 */
export function rotationTransform(angleDeg: number): Transform {
  switch (((angleDeg % 360) + 360) % 360) {
    case 0: return { x1: 1, y1: 0, x2: 0, y2: 1 };
    case 90: return { x1: 0, y1: 1, x2: -1, y2: 0 };
    case 180: return { x1: -1, y1: 0, x2: 0, y2: -1 };
    case 270: return { x1: 0, y1: -1, x2: 1, y2: 0 };
    default: return IDENTITY;
  }
}

/**
 * Compose an existing transform with an incremental mirror, exactly as
 * KiCad's `SCH_SYMBOL::SetOrientation` does (new = old ∘ temp):
 *
 *   x1 = m.x1*t.x1 + m.x2*t.y1   y1 = m.y1*t.x1 + m.y2*t.y1
 *   x2 = m.x1*t.x2 + m.x2*t.y2   y2 = m.y1*t.x2 + m.y2*t.y2
 *
 * where temp is (1,0,0,-1) for mirror-X and (-1,0,0,1) for mirror-Y.
 */
export function composeMirror(m: Transform, axis: 'x' | 'y'): Transform {
  const t: Transform = axis === 'x' ? { x1: 1, y1: 0, x2: 0, y2: -1 } : { x1: -1, y1: 0, x2: 0, y2: 1 };
  return {
    x1: m.x1 * t.x1 + m.x2 * t.y1,
    y1: m.y1 * t.x1 + m.y2 * t.y1,
    x2: m.x1 * t.x2 + m.x2 * t.y2,
    y2: m.y1 * t.x2 + m.y2 * t.y2,
  };
}

/** The final placement transform for a symbol's rotation + optional mirror. */
export function symbolTransform(angleDeg: number, mirror?: 'x' | 'y'): Transform {
  const base = rotationTransform(angleDeg);
  return mirror ? composeMirror(base, mirror) : base;
}

/** Map a symbol-local point through the transform (no translation). */
export function applyTransform(t: Transform, p: Vec2): Vec2 {
  return { x: t.x1 * p.x + t.y1 * p.y, y: t.x2 * p.x + t.y2 * p.y };
}

/** Map a symbol-local point to schematic/world coordinates given the symbol origin. */
export function localToWorld(origin: Vec2, t: Transform, p: Vec2): Vec2 {
  const r = applyTransform(t, p);
  return { x: origin.x + r.x, y: origin.y + r.y };
}
