"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Curve = [number, number, number, number];

const PRESETS: { name: string; curve: Curve }[] = [
  { name: "ease", curve: [0.25, 0.1, 0.25, 1] },
  { name: "in-out", curve: [0.42, 0, 0.58, 1] },
  { name: "out-cubic", curve: [0.33, 1, 0.68, 1] },
  { name: "out-back", curve: [0.34, 1.56, 0.64, 1] },
  { name: "in-out-expo", curve: [0.87, 0, 0.13, 1] },
  { name: "linear", curve: [0, 0, 1, 1] },
];

const CYCLE = 1800;
const DWELL = 0.22;

/** The cubic Bézier the CSS property describes: P0 (0,0), P1, P2, P3 (1,1). */
const bezier = (a: number, b: number, c: number, d: number) => {
  const cx = (t: number) => 3 * a * t * (1 - t) ** 2 + 3 * c * t * t * (1 - t) + t ** 3;
  const cy = (t: number) => 3 * b * t * (1 - t) ** 2 + 3 * d * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    // Bisection rather than Newton: twenty steps is exact enough for a screen and cannot
    // diverge on an overshooting curve, which Newton happily does.
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      if (cx(mid) < x) low = mid;
      else high = mid;
    }
    return cy((low + high) / 2);
  };
};

/**
 * A cubic-bézier editor with the curve on the left and four things moving on the right, so
 * the number and the feel are on screen at the same time. Drag either handle — past the
 * top or below the bottom for an overshoot — and copy the CSS out.
 */
export function EasingLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [curve, setCurve] = useState<Curve>(PRESETS[2].curve);
  const [copied, setCopied] = useState(false);
  const curveRef = useRef(curve);
  curveRef.current = curve;

  const css = `cubic-bezier(${curve.map((n) => Math.round(n * 100) / 100).join(", ")})`;

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(css).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => setCopied(false),
    );
  }, [css]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let box = { w: 0, h: 0 };
    let pad = { x: 0, y: 0, size: 0 };
    let colours = { bg: "#0c0c18", ink: "#f2ede4", accent: "#6b52ff", faint: "#7c7a8c", card: "#14141f", border: "#262635" };
    let dragging: 1 | 2 | null = null;
    let frame = 0;

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      colours = {
        bg: get("--bg", "#0c0c18"),
        ink: get("--text", "#f2ede4"),
        accent: get("--accent", "#6b52ff"),
        faint: get("--text-mute", "#7c7a8c"),
        card: get("--bg-card", "#14141f"),
        border: get("--border", "#262635"),
      };
    };

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      box = { w: Math.max(360, rect.width), h: Math.max(360, rect.height) };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // The editor is a square; a bézier plotted in a rectangle lies about its shape.
      // The height has to hold the overshoot too — a handle drawn off the top of the
      // canvas cannot be dragged back — so it reserves 0.6 above the box and 0.2 below,
      // which is the range the drag allows, and centres the whole thing including that.
      const span = 1.8;
      const size = Math.min(box.w * 0.42, (box.h - 150) / span);
      pad = { x: 72, y: (box.h - size * span) / 2 + size * 0.6, size };
    };

    // Graph space: x right, y up, both 0-1 over the square.
    const toScreen = (x: number, y: number): [number, number] => [
      pad.x + x * pad.size,
      pad.y + (1 - y) * pad.size,
    ];
    const toGraph = (px: number, py: number): [number, number] => [
      (px - pad.x) / pad.size,
      1 - (py - pad.y) / pad.size,
    ];

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const [a, b, c, d] = curveRef.current;
      const ease = bezier(a, b, c, d);

      ctx.fillStyle = colours.bg;
      ctx.fillRect(0, 0, box.w, box.h);

      // The unit box and its diagonal.
      ctx.strokeStyle = colours.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.x, pad.y, pad.size, pad.size);
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(...toScreen(0, 0));
      ctx.lineTo(...toScreen(1, 1));
      ctx.stroke();
      ctx.setLineDash([]);

      // The curve itself.
      ctx.strokeStyle = colours.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120;
        const [sx, sy] = toScreen(x, ease(x));
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Handles.
      for (const [hx, hy, from] of [
        [a, b, [0, 0]],
        [c, d, [1, 1]],
      ] as [number, number, number[]][]) {
        ctx.strokeStyle = colours.accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(...toScreen(from[0], from[1]));
        ctx.lineTo(...toScreen(hx, hy));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colours.accent;
        ctx.beginPath();
        ctx.arc(...toScreen(hx, hy), 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // The playhead, and the same progress driving everything on the right.
      const loop = (now % CYCLE) / CYCLE;
      const progress = loop < 1 - DWELL ? loop / (1 - DWELL) : 1;
      const value = ease(progress);
      ctx.fillStyle = colours.faint;
      ctx.beginPath();
      ctx.arc(...toScreen(progress, value), 4, 0, Math.PI * 2);
      ctx.fill();

      // Demos: a dot on a track, a bar, a square that scales and turns, and a fade.
      const left = pad.x + pad.size + 72;
      const width = box.w - left - 72;
      if (width > 120) {
        const rows = 4;
        const gap = pad.size / rows;
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textBaseline = "middle";

        const labels = ["TRANSLATE", "WIDTH", "SCALE + ROTATE", "OPACITY"];
        for (let row = 0; row < rows; row++) {
          const y = pad.y + gap * row + gap / 2;
          ctx.fillStyle = colours.faint;
          ctx.fillText(labels[row], left, pad.y + gap * row + 14);

          if (row === 0) {
            ctx.strokeStyle = colours.border;
            ctx.beginPath();
            ctx.moveTo(left, y + 8);
            ctx.lineTo(left + width, y + 8);
            ctx.stroke();
            ctx.fillStyle = colours.accent;
            ctx.beginPath();
            ctx.arc(left + value * width, y + 8, 8, 0, Math.PI * 2);
            ctx.fill();
          }
          if (row === 1) {
            ctx.strokeStyle = colours.border;
            ctx.strokeRect(left, y - 2, width, 20);
            ctx.fillStyle = colours.accent;
            ctx.fillRect(left, y - 2, Math.max(0, value) * width, 20);
          }
          if (row === 2) {
            const s = 14 + Math.max(0, value) * 30;
            ctx.save();
            ctx.translate(left + width / 2, y + 8);
            ctx.rotate(value * Math.PI * 0.5);
            ctx.fillStyle = colours.accent;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.restore();
          }
          if (row === 3) {
            ctx.globalAlpha = Math.max(0, Math.min(1, value));
            ctx.fillStyle = colours.ink;
            ctx.fillRect(left, y - 2, width, 20);
            ctx.globalAlpha = 1;
          }
        }
      }

      ctx.textBaseline = "alphabetic";
    };

    readPalette();
    layout();
    frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    const theme = new MutationObserver(readPalette);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const near = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const [a, b, c, d] = curveRef.current;
      const [x1, y1] = toScreen(a, b);
      const [x2, y2] = toScreen(c, d);
      const d1 = Math.hypot(px - x1, py - y1);
      const d2 = Math.hypot(px - x2, py - y2);
      if (Math.min(d1, d2) > 24) return null;
      return d1 <= d2 ? (1 as const) : (2 as const);
    };

    const onDown = (event: PointerEvent) => {
      dragging = near(event);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) {
        canvas.style.cursor = near(event) ? "grab" : "default";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const [gx, gy] = toGraph(event.clientX - rect.left, event.clientY - rect.top);
      // x stays inside the box — CSS requires it. y may overshoot, which is the point.
      const x = Math.max(0, Math.min(1, gx));
      const y = Math.max(-0.2, Math.min(1.6, gy));
      setCurve((current) =>
        dragging === 1 ? [x, y, current[2], current[3]] : [current[0], current[1], x, y],
      );
      canvas.style.cursor = "grabbing";
    };
    const onUp = () => {
      dragging = null;
      canvas.style.cursor = "default";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 94%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {css} · drag either handle, past the box for an overshoot
        </p>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => setCurve(preset.curve)}
              className="label rounded-full border px-3 py-2"
              style={
                preset.curve.join() === curve.join()
                  ? { borderColor: "var(--accent)", color: "var(--accent-soft)" }
                  : { borderColor: "var(--border)", color: "var(--text-mute)" }
              }
            >
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            onClick={copy}
            className="label rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            {copied ? "Copied" : "Copy CSS"}
          </button>
        </div>
      </div>
    </div>
  );
}
