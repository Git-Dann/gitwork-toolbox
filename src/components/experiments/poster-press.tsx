"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPoster } from "./room-data";

const GROUP_TINT: Record<string, string> = {
  "ai-coding": "--accent",
  "design-engineering": "--color-green",
  "creative-and-assets": "--color-amber",
  "workflow-and-mac": "--accent-soft",
  "discovery-and-reference": "--text-mute",
  "mobile-and-apple": "--color-flag",
};

/** 2:3, which is A-series enough for something nobody is going to print. */
const RATIO = 2 / 3;
const LAYOUTS = 4;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Break a string into lines that fit, measuring rather than counting characters. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A poster press for the tools list: pick a row, get a printable sheet of it. Four grids,
 * a colour taken from the tool's area, and everything on it — price, verdict, category,
 * domain — is what the entry actually says.
 *
 * Drawn at 1600 by 2400 into an offscreen canvas and scaled down for the screen, so the
 * PNG that comes out of it is a real poster rather than a screenshot of one.
 */
export function PosterPress({ posters }: { posters: RoomPoster[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [variant, setVariant] = useState(0);
  const [ready, setReady] = useState(false);

  // Chosen after mounting: a random pick during a render disagrees with the server.
  useEffect(() => {
    setPick(Math.floor(Math.random() * posters.length));
    setVariant(Math.floor(Math.random() * LAYOUTS));
  }, [posters.length]);

  const shuffle = useCallback(() => {
    setPick(Math.floor(Math.random() * posters.length));
    setVariant(Math.floor(Math.random() * LAYOUTS));
  }, [posters.length]);

  useEffect(() => {
    if (pick === null) return;
    const wrapEl = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrapEl || !canvas) return;
    const poster = posters[pick];

    const W = 1600;
    const H = Math.round(W / RATIO);
    const sheet = sheetRef.current ?? document.createElement("canvas");
    sheetRef.current = sheet;
    sheet.width = W;
    sheet.height = H;
    const ctx = sheet.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const style = getComputedStyle(document.documentElement);
      const token = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      // A poster is a physical thing, so it is printed on paper whatever the site's theme
      // is doing. It also means the PNG looks the same wherever it ends up.
      const paper = "#f2ede4";
      const ink = "#14141c";
      const mute = "#77746c";
      const tint = token(GROUP_TINT[poster.group] ?? "--accent", "#6b52ff");

      const M = 130;
      const inner = W - M * 2;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "top";

      const serif = (size: number, weight = 700) =>
        `${weight} ${size}px "Playfair Display", Georgia, serif`;
      const mono = (size: number) => `500 ${size}px "JetBrains Mono", ui-monospace, monospace`;

      // Header: who printed it, and what shelf it came off.
      ctx.fillStyle = mute;
      ctx.font = mono(28);
      ctx.fillText("GITWORK TOOLBOX", M, M);
      ctx.textAlign = "right";
      ctx.fillText(poster.category.toUpperCase().slice(0, 34), W - M, M);
      ctx.textAlign = "left";
      ctx.fillStyle = ink;
      ctx.fillRect(M, M + 46, inner, 3);

      // The name, as large as three lines will allow.
      let size = 220;
      let lines: string[] = [];
      do {
        ctx.font = serif(size);
        lines = wrap(ctx, poster.name, inner);
        size -= 8;
      } while (lines.length > 3 && size > 68);
      const nameTop = M + 110;
      lines.forEach((line, index) => ctx.fillText(line, M, nameTop + index * size * 1.0));
      let y = nameTop + lines.length * size * 1.0 + 56;

      // The tool's own sentence.
      ctx.font = "400 46px Inter, system-ui, sans-serif";
      const body = wrap(ctx, poster.what, inner).slice(0, 6);
      body.forEach((line, index) => ctx.fillText(line, M, y + index * 64));
      y += body.length * 64;

      // The facts sit at the foot; whatever is left in the middle is the colour's.
      const rows: [string, string][] = [
        ["PRICE", poster.pricing.toUpperCase()],
        ["VERDICT", poster.verdict.toUpperCase()],
        ["WHERE", poster.domain.toUpperCase() || "—"],
      ];
      const factsTop = H - M - 60 - rows.length * 94;
      const band = { top: y + 70, bottom: factsTop - 70 };
      const bandH = Math.max(0, band.bottom - band.top);

      ctx.fillStyle = tint;
      if (bandH > 60) {
        if (variant === 0) {
          ctx.fillRect(M, band.top, inner, bandH);
        } else if (variant === 1) {
          // Two blocks, one tall one short, off the same baseline.
          ctx.fillRect(M, band.top, inner * 0.46, bandH);
          ctx.fillRect(M + inner * 0.54, band.bottom - bandH * 0.45, inner * 0.46, bandH * 0.45);
        } else if (variant === 2) {
          const r = Math.min(bandH, inner) / 2;
          ctx.beginPath();
          ctx.arc(W / 2, band.top + bandH / 2, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // A stack of rules, thinning as it goes.
          const count = 9;
          for (let i = 0; i < count; i++) {
            const h = Math.max(3, (bandH / count) * (1 - i / count) * 0.8);
            ctx.fillRect(M, band.top + (bandH / count) * i, inner, h);
          }
        }
      }

      let fy = factsTop;
      for (const [key, value] of rows) {
        ctx.fillStyle = mute;
        ctx.fillRect(M, fy, inner, 2);
        ctx.font = mono(28);
        ctx.fillText(key, M, fy + 26);
        ctx.fillStyle = ink;
        ctx.font = mono(34);
        ctx.textAlign = "right";
        ctx.fillText(value.slice(0, 30), W - M, fy + 22);
        ctx.textAlign = "left";
        fy += 94;
      }

      // A serial number, because a print run should have one.
      ctx.fillStyle = mute;
      ctx.font = mono(24);
      ctx.fillText(
        `No. ${String(pick + 1).padStart(3, "0")}/${posters.length}`,
        M,
        H - M - 26,
      );
      ctx.textAlign = "right";
      ctx.fillText(rng(pick + variant)() > 0.5 ? "ONE OF ONE" : "PRINTED IN THE BROWSER", W - M, H - M - 26);
      ctx.textAlign = "left";

      // Scale it down onto the visible canvas.
      const rect = wrapEl.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const boxH = Math.max(320, rect.height - 150);
      const boxW = Math.min(rect.width - 60, boxH * RATIO);
      canvas.width = Math.round(boxW * dpr);
      canvas.height = Math.round((boxW / RATIO) * dpr);
      canvas.style.width = `${boxW}px`;
      canvas.style.height = `${boxW / RATIO}px`;
      const view = canvas.getContext("2d");
      if (!view) return;
      view.setTransform(1, 0, 0, 1, 0, 0);
      view.imageSmoothingQuality = "high";
      view.drawImage(sheet, 0, 0, canvas.width, canvas.height);
      setReady(true);
    };

    // Wait for Playfair and JetBrains Mono, or the first poster is drawn in Georgia.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) draw();
    });
    draw();

    const observer = new ResizeObserver(() => draw());
    observer.observe(wrapEl);
    const theme = new MutationObserver(() => draw());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      observer.disconnect();
      theme.disconnect();
    };
  }, [pick, variant, posters]);

  const download = () => {
    const sheet = sheetRef.current;
    if (!sheet || pick === null) return;
    sheet.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gitwork-${posters[pick].slug}-poster.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const poster = pick === null ? null : posters[pick];

  return (
    <div ref={wrapRef} className="absolute inset-0 flex items-center justify-center p-6">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={poster ? `A poster for ${poster.name}` : "Poster"}
        className="block"
        style={{ boxShadow: "var(--shadow-card)", opacity: ready ? 1 : 0 }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
        <p className="label text-mute">
          {posters.length} tools · four grids · 1600×2400 PNG
          {poster ? ` · ${poster.name}` : ""}
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVariant((value) => (value + 1) % LAYOUTS)}
            className="label rounded-full border px-3.5 py-2.5"
            style={{ borderColor: "var(--border)", color: "var(--text-mute)" }}
          >
            Next grid
          </button>
          <button
            type="button"
            onClick={download}
            className="label rounded-full border px-3.5 py-2.5"
            style={{ borderColor: "var(--border)", color: "var(--text-mute)" }}
          >
            Download
          </button>
          <button
            type="button"
            onClick={shuffle}
            className="label rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Another tool
          </button>
        </div>
      </div>
    </div>
  );
}
