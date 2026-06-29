import { useEffect, useRef, useState, useCallback } from 'react';
import type { Schematic } from '@ziroeda/core';
import { renderSchematic, fitToContent, type Viewport } from '../render/renderer.js';
import { KICAD_CLASSIC } from '../theme.js';

interface Props {
  schematic: Schematic;
}

/** A pannable/zoomable canvas that renders a schematic. */
export function SchematicCanvas({ schematic }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const vp = viewportRef.current;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderSchematic(ctx, schematic, vp, KICAD_CLASSIC, canvas.width, canvas.height);
  }, [schematic]);

  // Track container size (account for device pixel ratio).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resize the backing canvas and (re)fit content the first time we have a size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    if (!viewportRef.current) {
      viewportRef.current = fitToContent(schematic, canvas.width, canvas.height);
    }
    draw();
  }, [size, schematic, draw]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    const vp = viewportRef.current;
    if (!canvas || !vp) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    const factor = Math.exp(-e.deltaY * 0.001);
    // Zoom about the cursor: keep the world point under the cursor fixed.
    const worldX = (px - vp.offsetX) / vp.scale;
    const worldY = (py - vp.offsetY) / vp.scale;
    const scale = vp.scale * factor;
    viewportRef.current = { scale, offsetX: px - worldX * scale, offsetY: py - worldY * scale };
    draw();
  }, [draw]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const vp = viewportRef.current;
    const drag = dragRef.current;
    if (!vp || !drag) return;
    const dpr = window.devicePixelRatio || 1;
    viewportRef.current = {
      ...vp,
      offsetX: vp.offsetX + (e.clientX - drag.x) * dpr,
      offsetY: vp.offsetY + (e.clientY - drag.y) * dpr,
    };
    dragRef.current = { x: e.clientX, y: e.clientY };
    draw();
  }, [draw]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'grab', touchAction: 'none' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
