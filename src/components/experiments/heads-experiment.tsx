"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dnaFromSeed, VARIANTS, type Dna } from "@/experiments/heads/dna";
import { drawHead, type Palette } from "@/experiments/heads/draw";
import { motionFromSeed, step, type Motion } from "@/experiments/heads/motion";

type Cell = { seed: number; dna: Dna; motion: Motion };

type Sheet = { cols: number; rows: number; cells: Cell[] };

const makeCell = (seed: number): Cell => {
  const dna = dnaFromSeed(seed);
  return { seed, dna, motion: motionFromSeed(seed, dna) };
};

/** Read the page's own colours, so the sheet follows the theme toggle. */
function readPalette(host: HTMLElement): Palette {
  const style = getComputedStyle(host);
  const get = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    ink: get("--text", "#f2ede4"),
    accent: get("--accent", "#6b52ff"),
    faint: get("--text-mute", "#7c7a8c"),
    hollow: get("--bg-input", "#171724"),
  };
}

export function HeadsExperiment() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState({ heads: 0, ms: 0 });
  const [sheetNo, setSheetNo] = useState(1);
  const clickRef = useRef<((x: number, y: number) => void) | null>(null);

  const newSheet = useCallback(() => setSheetNo((n) => n + 1), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Every seed on the sheet derives from this one number, so "new sheet" is one integer.
    const base = sheetNo * 977;
    let palette = readPalette(document.documentElement);
    let sheet: Sheet = { cols: 0, rows: 0, cells: [] };
    let box = { w: 0, h: 0, dpr: 1 };
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let last = 0;
    let smoothed = 0;

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      box = { w: Math.max(240, rect.width), h: Math.max(240, rect.height), dpr };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.max(2, Math.min(8, Math.round(box.w / 230)));
      const rows = Math.max(2, Math.min(6, Math.round(box.h / 230)));
      if (cols !== sheet.cols || rows !== sheet.rows) {
        const cells: Cell[] = [];
        for (let i = 0; i < cols * rows; i++) cells.push(makeCell(base + i * 7919));
        sheet = { cols, rows, cells };
      }
    };

    const cellBox = (index: number) => {
      const w = box.w / sheet.cols;
      const h = box.h / sheet.rows;
      const col = index % sheet.cols;
      const row = Math.floor(index / sheet.cols);
      return { x: col * w, y: row * h, w, h };
    };

    const render = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      const started = performance.now();

      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim() || "#0c0c18";
      ctx.fillRect(0, 0, box.w, box.h);

      // The contact sheet: hairline cells, seed printed in the corner of each.
      ctx.strokeStyle = palette.faint;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      for (let c = 1; c < sheet.cols; c++) {
        const x = Math.round((box.w / sheet.cols) * c) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, box.h);
        ctx.stroke();
      }
      for (let r = 1; r < sheet.rows; r++) {
        const y = Math.round((box.h / sheet.rows) * r) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(box.w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      sheet.cells.forEach((cell, index) => {
        const cb = cellBox(index);
        // Where the pointer is in this head's own space, which is what it looks at.
        let look: { x: number; y: number } | null = null;
        if (pointer) {
          const s = Math.min(cb.w / 2.5, cb.h / 2.95);
          look = {
            x: (pointer.x - (cb.x + cb.w / 2)) / (s * 2.2),
            y: (pointer.y - (cb.y + cb.h * 0.45)) / (s * 2.2),
          };
        }
        step(cell.motion, cell.dna, dt, look);
        drawHead(ctx, cell.dna, cell.motion, cb, palette);

        ctx.fillStyle = palette.faint;
        ctx.globalAlpha = 0.55;
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(`#${cell.seed}`, cb.x + 12, cb.y + 20);
        ctx.globalAlpha = 1;
      });

      const took = performance.now() - started;
      smoothed = smoothed ? smoothed * 0.92 + took * 0.08 : took;
      if (Math.random() < 0.05) {
        setStats({ heads: sheet.cells.length, ms: still ? 0 : Math.round(smoothed * 10) / 10 });
      }
      frame = requestAnimationFrame(render);
    };

    layout();
    if (still) {
      // One frame, held. Nine faces staring is the point; nine faces twitching is not
      // something to inflict on someone who asked for less movement.
      for (const cell of sheet.cells) step(cell.motion, cell.dna, 0.4, null);
      render(0);
      cancelAnimationFrame(frame);
      setStats({ heads: sheet.cells.length, ms: 0 });
    } else {
      frame = requestAnimationFrame(render);
    }

    // Resizing sets canvas.width, which blanks it. With the animation running the next
    // frame covers that; when it is held still nothing would ever redraw.
    const onResize = () => {
      layout();
      if (still) render(0);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(wrap);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onLeave = () => {
      pointer = null;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    // Clicking one head re-rolls only that one, which is how you hunt for a good face.
    clickRef.current = (x, y) => {
      const col = Math.floor((x / box.w) * sheet.cols);
      const row = Math.floor((y / box.h) * sheet.rows);
      const index = row * sheet.cols + col;
      if (index < 0 || index >= sheet.cells.length) return;
      sheet.cells[index] = makeCell(Math.floor(Math.random() * 900000) + 1000);
      if (still) render(0);
    };

    const theme = new MutationObserver(() => {
      palette = readPalette(document.documentElement);
      if (still) render(0);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      clickRef.current = null;
    };
  }, [sheetNo]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A sheet of generated line-drawn faces, each one turning, blinking and following the pointer"
        className="block h-full w-full cursor-crosshair"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          clickRef.current?.(event.clientX - rect.left, event.clientY - rect.top);
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {stats.heads} heads · {stats.ms ? `${stats.ms.toFixed(1)} ms/frame` : "held still"}
          <span className="hidden lg:inline">
            {" "}
            · {VARIANTS.combinations.toLocaleString("en-GB")} face combinations ·{" "}
            {VARIANTS.points} points per outline
          </span>
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          <p className="label mr-1 hidden text-mute sm:block">Click a head to re-roll it</p>
          <button
            type="button"
            onClick={newSheet}
            className="label rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            New sheet
          </button>
        </div>
      </div>
    </div>
  );
}
