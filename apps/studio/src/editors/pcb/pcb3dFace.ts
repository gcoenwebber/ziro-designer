/**
 * Realistic board-face textures for the 3D viewer, composited the way KiCad's
 * 3D renderer layers a board (create_scene.cpp) rather than reusing the dark 2D
 * editor theme:
 *
 *   1. soldermask green over the whole board,
 *   2. copper faintly tinted through the mask (you can see routing),
 *   3. at mask openings the bare copper shows as gold (pads/vias), FR4 if none,
 *   4. white silkscreen on top.
 *
 * Colours approximate KiCad's default 3D materials (board_adapter.cpp): mask
 * (0.08,0.20,0.14), copper (0.75,0.61,0.23), silk (0.9,0.9,0.9). Geometry comes
 * straight from buildScene()'s per-layer Path2D buckets — no re-tessellation.
 */
import { buildScene } from './renderBoard.js';
import type { Board } from '@ziroeda/core';

export type Side = 'front' | 'back';

interface BBox { minX: number; minY: number; maxX: number; maxY: number }

// sRGB material colours (tuned to read like KiCad's green board under the
// viewer's lighting).
const MASK = '#1e6b39';          // soldermask
const MASK_OVER_CU = '#278049';  // mask over copper — faint trace tint
const SUBSTRATE = '#4a4a2e';     // bare FR4 at a mask opening with no copper
const COPPER = '#c9a45c';        // exposed copper (ENIG gold)
const SILK = '#ededed';

const LAYERS: Record<Side, { cu: string; mask: string; silk: string; paste: string }> = {
  front: { cu: 'F.Cu', mask: 'F.Mask', silk: 'F.SilkS', paste: 'F.Paste' },
  back: { cu: 'B.Cu', mask: 'B.Mask', silk: 'B.SilkS', paste: 'B.Paste' },
};

const strokeAll = (ctx: CanvasRenderingContext2D, map: Map<number, Path2D>, minPen: number): void => {
  for (const [w, p] of map) { ctx.lineWidth = Math.max(w, minPen); ctx.stroke(p); }
};

// Union of a layer's mask-opening apertures (pads + vias + filled graphics).
function openingPath(b: { pads: Path2D; vias: Path2D; gfxFill: Path2D }): Path2D {
  const p = new Path2D();
  p.addPath(b.pads);
  p.addPath(b.vias);
  p.addPath(b.gfxFill);
  return p;
}

/** Render one board face to an offscreen texture with realistic materials. */
export function renderRealisticFace(board: Board, box: BBox, side: Side, texSize: number): HTMLCanvasElement | null {
  const scene = buildScene(board);
  const { minX, minY, maxX, maxY } = box;
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scale = texSize / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const mirror = side === 'back';
  // Same transform convention as the old renderFace so the texture aligns with
  // the geometry's UVs (board centred; back face flipped).
  const s = mirror ? -scale : scale;
  const tx = mirror ? texSize / 2 + cx * scale : texSize / 2 - cx * scale;
  const ty = texSize / 2 - cy * scale;
  const minPen = scale > 0 ? 1 / scale : 0;

  const names = LAYERS[side];
  const cu = scene.layers.get(names.cu);
  const mask = scene.layers.get(names.mask);
  const silk = scene.layers.get(names.silk);

  // 1. Soldermask green over the whole face (device space; the 3D geometry
  //    clips this to the real board outline).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = MASK;
  ctx.fillRect(0, 0, texSize, texSize);

  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const fillCopper = (b: NonNullable<typeof cu>): void => {
    if (b.hasGfxFill) ctx.fill(b.gfxFill, 'nonzero');
    strokeAll(ctx, b.gfxStrokes, minPen);
    if (b.tracks.size) strokeAll(ctx, b.tracks, minPen);
    if (b.hasZones) ctx.fill(b.zones, 'nonzero');
    if (b.hasPads) ctx.fill(b.pads, 'nonzero');
    if (b.hasVias) ctx.fill(b.vias, 'nonzero');
  };

  // 2. Copper faintly tinted through the mask (routing visible under green).
  if (cu) {
    ctx.fillStyle = MASK_OVER_CU;
    ctx.strokeStyle = MASK_OVER_CU;
    fillCopper(cu);
  }

  // 3. Mask openings expose bare copper (gold) — clip to the openings, lay FR4
  //    then copper so pads read gold and bare openings read as substrate.
  if (mask) {
    ctx.save();
    ctx.clip(openingPath(mask));
    ctx.fillStyle = SUBSTRATE;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    if (cu) {
      ctx.fillStyle = COPPER;
      ctx.strokeStyle = COPPER;
      fillCopper(cu);
    }
    ctx.restore();
  }

  // 4. Silkscreen white on top (graphics + reference/value/user text).
  if (silk) {
    ctx.fillStyle = SILK;
    ctx.strokeStyle = SILK;
    if (silk.hasGfxFill) ctx.fill(silk.gfxFill, 'nonzero');
    strokeAll(ctx, silk.gfxStrokes, minPen);
    strokeAll(ctx, silk.textRef, minPen);
    strokeAll(ctx, silk.textVal, minPen);
    strokeAll(ctx, silk.textFp, minPen);
    strokeAll(ctx, silk.textBoard, minPen);
  }

  return canvas;
}
