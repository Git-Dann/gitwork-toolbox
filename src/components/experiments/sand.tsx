"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CELL = 4;
/** Empty is 0; the rest are the six area colours, in the order the legend lists them. */
const TINTS = [
  { token: "--accent", name: "AI Coding" },
  { token: "--color-green", name: "Design Engineering" },
  { token: "--color-amber", name: "Creative & Assets" },
  { token: "--accent-soft", name: "Workflow & Mac" },
  { token: "--color-flag", name: "Mobile & Apple" },
  { token: "--text", name: "Discovery & Reference" },
];
const BRUSH = 5;

/**
 * Falling sand, in the site's own palette. A grain moves down, then down-left or
 * down-right, and that single rule is the whole simulation — piles, slopes and hourglass
 * behaviour all fall out of it.
 *
 * The grid is a Uint8Array of colour indices, painted into an ImageData at one pixel per
 * grain and blown up with smoothing off. Drawing 64,000 little rectangles a frame is what
 * the naive version does, and it cannot hold 60fps; this can.
 */
export function Sand() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const [colour, setColour] = useState(0);
  const [grains, setGrains] = useState(0);
  const colourRef = useRef(0);
  colourRef.current = colour;

  const clear = useCallback(() => clearRef.current?.(), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let grid = new Uint8Array(0);
    let buffer: ImageData | null = null;
    let field = document.createElement("canvas");
    let fctx = field.getContext("2d");
    let palette: number[][] = [];
    let bg = [12, 12, 24];
    let pointer: { x: number; y: number } | null = null;
    let painting = false;
    let frame = 0;
    let ticks = 0;

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const parse = (value: string) => {
        const probe = document.createElement("canvas").getContext("2d");
        if (!probe) return [255, 255, 255];
        probe.fillStyle = value.trim() || "#fff";
        const hex = probe.fillStyle as string;
        if (hex.startsWith("#")) {
          const n = parseInt(hex.slice(1), 16);
          return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        const nums = hex.match(/\d+/g);
        return nums ? nums.slice(0, 3).map(Number) : [255, 255, 255];
      };
      palette = TINTS.map((tint) => parse(style.getPropertyValue(tint.token)));
      bg = parse(style.getPropertyValue("--bg"));
    };

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(320, rect.height);
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const nextCols = Math.floor(w / CELL);
      // The floor sits above the control bar, or the piles build up behind it.
      const nextRows = Math.floor((h - 76) / CELL);
      if (nextCols !== cols || nextRows !== rows) {
        const old = grid;
        const oldCols = cols;
        cols = nextCols;
        rows = nextRows;
        grid = new Uint8Array(cols * rows);
        // Keep what was already poured, as far as it fits.
        if (old.length) {
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < Math.min(cols, oldCols); x++) {
              const from = y * oldCols + x;
              if (from < old.length) grid[y * cols + x] = old[from];
            }
          }
        }
        field.width = cols;
        field.height = rows;
        fctx = field.getContext("2d");
        buffer = fctx?.createImageData(cols, rows) ?? null;
      }
      ctx.imageSmoothingEnabled = false;
    };

    const pour = () => {
      if (!pointer || !painting) return;
      const cx = Math.floor(pointer.x / CELL);
      const cy = Math.floor(pointer.y / CELL);
      for (let dy = -BRUSH; dy <= BRUSH; dy++) {
        for (let dx = -BRUSH; dx <= BRUSH; dx++) {
          if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          // Sparse, so the pile builds rather than appearing as a solid blob.
          if (Math.random() > 0.22) continue;
          grid[y * cols + x] = colourRef.current + 1;
        }
      }
    };

    const settle = () => {
      // Bottom row up, so a grain cannot fall twice in one pass.
      for (let y = rows - 2; y >= 0; y--) {
        // Alternate the scan direction, or every pile leans the same way.
        const leftFirst = (y + ticks) % 2 === 0;
        for (let i = 0; i < cols; i++) {
          const x = leftFirst ? i : cols - 1 - i;
          const at = y * cols + x;
          const grain = grid[at];
          if (!grain) continue;
          const below = at + cols;
          if (!grid[below]) {
            grid[below] = grain;
            grid[at] = 0;
            continue;
          }
          const dir = Math.random() < 0.5 ? -1 : 1;
          for (const side of [dir, -dir]) {
            const nx = x + side;
            if (nx < 0 || nx >= cols) continue;
            const diagonal = below + side;
            if (!grid[diagonal]) {
              grid[diagonal] = grain;
              grid[at] = 0;
              break;
            }
          }
        }
      }
    };

    const draw = () => {
      if (!buffer || !fctx) return;
      const data = buffer.data;
      let filled = 0;
      for (let i = 0; i < grid.length; i++) {
        const grain = grid[i];
        const rgb = grain ? palette[grain - 1] : bg;
        if (grain) filled += 1;
        const at = i * 4;
        data[at] = rgb[0];
        data[at + 1] = rgb[1];
        data[at + 2] = rgb[2];
        data[at + 3] = 255;
      }
      fctx.putImageData(buffer, 0, 0);
      ctx.drawImage(field, 0, 0, cols, rows, 0, 0, cols * CELL, rows * CELL);
      // Fill any strip the cell grid does not divide into.
      ctx.fillStyle = `rgb(${bg[0]} ${bg[1]} ${bg[2]})`;
      if (cols * CELL < canvas.width) ctx.fillRect(cols * CELL, 0, canvas.width, canvas.height);
      if (rows * CELL < canvas.height) ctx.fillRect(0, rows * CELL, canvas.width, canvas.height);
      if (ticks % 12 === 0) setGrains(filled);
    };

    const loop = () => {
      ticks += 1;
      pour();
      settle();
      draw();
      frame = requestAnimationFrame(loop);
    };

    readPalette();
    layout();
    frame = requestAnimationFrame(loop);
    clearRef.current = () => grid.fill(0);

    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    const theme = new MutationObserver(readPalette);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const at = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onDown = (event: PointerEvent) => {
      painting = true;
      at(event);
    };
    const onMove = (event: PointerEvent) => at(event);
    const onUp = () => {
      painting = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      clearRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full cursor-crosshair" />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 94%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {grains.toLocaleString("en-GB")} grains · {CELL}px cells · hold to pour
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          {TINTS.map((tint, index) => (
            <button
              key={tint.token}
              type="button"
              onClick={() => setColour(index)}
              aria-label={tint.name}
              title={tint.name}
              className="h-7 w-7 rounded-full border transition-transform"
              style={{
                background: `var(${tint.token})`,
                borderColor: index === colour ? "var(--text)" : "transparent",
                transform: index === colour ? "scale(1.15)" : undefined,
              }}
            />
          ))}
          <button
            type="button"
            onClick={clear}
            className="label ml-1 rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Empty the tray
          </button>
        </div>
      </div>
    </div>
  );
}
