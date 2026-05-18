"use client";

import { useEffect, useRef } from "react";

/**
 * TetrisSnake — perimeter-walker canvas animation for the pricing frame.
 * Walks the frame border clockwise, laying permanent blocks at evenly
 * spaced positions including corners.
 * Reads --color-brand per frame to track theme changes.
 * Pauses when offscreen (IntersectionObserver).
 * Honors prefers-reduced-motion.
 */
export function TetrisSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const parent = canvas.parentElement as HTMLElement;

    const CELL = 10;
    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let trail: { x: number; y: number; age: number }[] = [];
    const placed: { x: number; y: number; alpha: number }[] = [];
    let pos = 0;
    let perim: { x: number; y: number }[] = [];
    let running = true;
    let lastStep = 0;
    const STEP_MS = 70;

    // Read brand color per frame to track theme changes
    function brandColor(): string {
      return getComputedStyle(document.documentElement)
        .getPropertyValue("--color-brand").trim() || "#7A1B1B";
    }

    function resize() {
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.floor(W / CELL);
      rows = Math.floor(H / CELL);

      // Build perimeter clockwise from top-left
      perim = [];
      for (let x = 0; x < cols; x++) perim.push({ x, y: 0 });
      for (let y = 1; y < rows; y++) perim.push({ x: cols - 1, y });
      for (let x = cols - 2; x >= 0; x--) perim.push({ x, y: rows - 1 });
      for (let y = rows - 2; y > 0; y--) perim.push({ x: 0, y });
      if (perim.length > 0) pos = pos % perim.length;

      // Compute block positions per-edge independently.
      // Each edge is treated separately: corners always get a block,
      // interior blocks are placed at Math.round(i * L / N) — each
      // position computed from the edge start, no accumulated error.
      // Gaps within an edge differ by at most 1 cell.
      const total = perim.length;
      const TARGET = 3;
      const edgeSpecs = [
        { start: 0,                       length: cols - 1 },
        { start: cols - 1,                length: rows - 1 },
        { start: cols + rows - 2,         length: cols - 1 },
        { start: 2 * cols + rows - 3,     length: rows - 1 },
      ];

      placeSet = new Set<number>();
      for (const { start, length } of edgeSpecs) {
        placeSet.add(start % total);
        if (length <= 0) continue;
        const numIntervals = Math.max(1, Math.round(length / TARGET));
        for (let i = 1; i < numIntervals; i++) {
          placeSet.add((start + Math.round(i * length / numIntervals)) % total);
        }
      }
    }

    let placeSet = new Set<number>();

    function step() {
      if (!perim.length) return;
      const p = perim[pos];
      trail.push({ x: p.x, y: p.y, age: 0 });

      // Place blocks at precomputed positions (corners + evenly spaced)
      // Skip if already placed at this position (no duplicates on subsequent laps)
      if (placeSet.has(pos) && !placed.some(b => b.x === p.x && b.y === p.y)) {
        placed.push({ x: p.x, y: p.y, alpha: 0.18 });
      }

      pos = (pos + 1) % perim.length;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const c = brandColor();

      // Placed blocks (steady frame-builders)
      for (const b of placed) {
        ctx.fillStyle = c;
        ctx.globalAlpha = b.alpha;
        ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, CELL - 2, CELL - 2);
      }
      ctx.globalAlpha = 1;

      // Trail (fading)
      for (const t of trail) {
        const a = Math.max(0, 1 - t.age / 10);
        ctx.fillStyle = c;
        ctx.globalAlpha = a * 0.9;
        ctx.fillRect(t.x * CELL + 1, t.y * CELL + 1, CELL - 2, CELL - 2);
      }
      ctx.globalAlpha = 1;

      // Head (bright)
      const head = perim[pos];
      if (head) {
        ctx.fillStyle = c;
        ctx.fillRect(head.x * CELL, head.y * CELL, CELL, CELL);
      }
    }

    function loop(t: number) {
      if (!running) return;
      if (t - lastStep > STEP_MS) {
        step();
        for (const x of trail) x.age++;
        trail = trail.filter((x) => x.age < 12);
        lastStep = t;
      }
      draw();
      animFrame = requestAnimationFrame(loop);
    }

    // IntersectionObserver — pause when offscreen
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          running = e.isIntersecting;
          if (running) requestAnimationFrame(loop);
        }
      },
      { threshold: 0.1 },
    );
    io.observe(parent);

    // ResizeObserver for reliable container tracking
    const ro = new ResizeObserver(() => resize());
    ro.observe(parent);

    resize();
    let animFrame = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animFrame);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
