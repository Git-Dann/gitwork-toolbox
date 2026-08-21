"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomTool } from "./room-data";

type Star = {
  tool: RoomTool;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where its area wants it, as a fraction of the canvas. */
  hx: number;
  hy: number;
  r: number;
};

/** Deterministic, so the sky is the same sky every time you open it. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LINK_DISTANCE = 120;
const HOVER_RADIUS = 16;

/**
 * The toolbox as a night sky. Nothing here is laid out by hand: each star is pulled
 * towards its area's hub and pushed off whatever it is sitting on top of, and the areas
 * arrange themselves. A line appears between two tools only when they share a category
 * and have drifted within reach of each other, which is the difference between a
 * constellation and a hairball.
 */
export function Constellation({
  tools,
  groups,
}: {
  tools: RoomTool[];
  groups: { slug: string; name: string }[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<RoomTool | null>(null);
  const openRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rand = seeded(1979);
    const used = groups.filter((group) => tools.some((tool) => tool.group === group.slug));
    const hubAngle = new Map(
      used.map((group, index) => [group.slug, (index / used.length) * Math.PI * 2 - Math.PI / 2]),
    );
    let spin = 0;
    const hubAt = (slug: string) => {
      const angle = (hubAngle.get(slug) ?? 0) + spin;
      return { x: 0.5 + Math.cos(angle) * 0.33, y: 0.5 + Math.sin(angle) * 0.34 };
    };

    const stars: Star[] = tools.map((tool) => ({
      tool,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      // Offsets from the hub, kept as its own scatter so the hub can move under them.
      hx: (rand() - 0.5) * 0.2,
      hy: (rand() - 0.5) * 0.2,
      r: tool.recommended ? 3.6 : 2 + rand() * 1.3,
    }));

    // Same category and close enough to reach: the pairs worth testing each frame.
    const pairs: [number, number][] = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        if (stars[i].tool.category === stars[j].tool.category) pairs.push([i, j]);
      }
    }

    let box = { w: 0, h: 0 };
    let palette = { ink: "#f2ede4", bg: "#0c0c18", accent: "#6b52ff", faint: "#7c7a8c" };
    let pointer: { x: number; y: number } | null = null;
    let hovered = -1;
    let frame = 0;
    let last = 0;

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      palette = {
        ink: get("--text", "#f2ede4"),
        bg: get("--bg", "#0c0c18"),
        accent: get("--accent", "#6b52ff"),
        faint: get("--text-mute", "#7c7a8c"),
      };
    };

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const first = box.w === 0;
      box = { w: Math.max(320, rect.width), h: Math.max(320, rect.height) };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first) for (const star of stars) {
        const hub = hubAt(star.tool.group);
        star.x = (hub.x + star.hx) * box.w;
        star.y = (hub.y + star.hy) * box.h;
      }
    };

    const settle = (dt: number) => {
      // A full turn takes about five minutes: enough that the sky is never quite the same
      // picture, slow enough that nothing appears to be moving.
      spin += dt * 0.02;
      for (const star of stars) {
        const hub = hubAt(star.tool.group);
        star.vx += ((hub.x + star.hx) * box.w - star.x) * 2.6 * dt;
        star.vy += ((hub.y + star.hy) * box.h - star.y) * 2.6 * dt;
      }
      // Push apart anything overlapping. 239 stars is 28k pairs, which is nothing.
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i];
          const b = stars[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 900 || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const push = ((30 - d) / d) * 26 * dt;
          a.vx -= dx * push;
          a.vy -= dy * push;
          b.vx += dx * push;
          b.vy += dy * push;
        }
      }
      const damp = Math.pow(0.84, dt * 60);
      for (const star of stars) {
        star.vx *= damp;
        star.vy *= damp;
        star.x += star.vx * dt;
        star.y += star.vy * dt;
      }
    };

    const draw = () => {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, box.w, box.h);

      const hoveredStar = hovered >= 0 ? stars[hovered] : null;
      const litCategory = hoveredStar?.tool.category;

      // Lines first, so the stars sit on top of their own constellation.
      ctx.lineWidth = 1;
      for (const [i, j] of pairs) {
        const a = stars[i];
        const b = stars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > LINK_DISTANCE) continue;
        const lit = litCategory && a.tool.category === litCategory;
        ctx.strokeStyle = lit ? palette.accent : palette.faint;
        ctx.globalAlpha = lit ? 0.75 : 0.1 + (1 - d / LINK_DISTANCE) * 0.22;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const star of stars) {
        const lit = litCategory === star.tool.category;
        ctx.fillStyle = star.tool.recommended || lit ? palette.accent : palette.ink;
        ctx.globalAlpha = lit ? 1 : star.tool.recommended ? 0.95 : 0.78;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * (lit ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.textAlign = "center";
      ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
      for (const group of used) {
        const own = stars.filter((star) => star.tool.group === group.slug);
        if (!own.length) continue;
        const cx = own.reduce((sum, star) => sum + star.x, 0) / own.length;
        // Above the cluster rather than through the middle of it, where the stars are.
        const top = own.reduce((min, star) => Math.min(min, star.y), Infinity);
        ctx.fillStyle = palette.faint;
        ctx.globalAlpha = litCategory ? 0.35 : 0.85;
        ctx.fillText(`${group.name.toUpperCase()} · ${own.length}`, cx, Math.max(14, top - 14));
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";

      // Only the picks are named unprompted; everything else waits to be pointed at.
      ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = "left";
      for (const star of stars) {
        if (!star.tool.recommended || star === hoveredStar) continue;
        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = 0.85;
        ctx.fillText(star.tool.name.toUpperCase(), star.x + 8, star.y + 3.5);
      }
      ctx.globalAlpha = 1;

      if (hoveredStar) {
        const label = hoveredStar.tool.name;
        const sub = hoveredStar.tool.category;
        ctx.font = '600 13px Inter, system-ui, sans-serif';
        const w = Math.max(ctx.measureText(label).width, 0) + 22;
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        const w2 = ctx.measureText(sub.toUpperCase()).width + 22;
        const cardW = Math.max(w, w2);
        const cardH = 44;
        const x = Math.min(box.w - cardW - 8, hoveredStar.x + 14);
        const y = Math.min(box.h - cardH - 8, Math.max(8, hoveredStar.y - cardH / 2));
        ctx.fillStyle = palette.bg;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = palette.ink;
        ctx.font = '600 13px Inter, system-ui, sans-serif';
        ctx.fillText(label, x + 11, y + 19);
        ctx.fillStyle = palette.faint;
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(sub.toUpperCase(), x + 11, y + 34);
      }
    };

    const findHover = () => {
      if (!pointer) return -1;
      let best = -1;
      let bestD = HOVER_RADIUS * HOVER_RADIUS;
      for (let i = 0; i < stars.length; i++) {
        const dx = stars[i].x - pointer.x;
        const dy = stars[i].y - pointer.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const step = (now: number) => {
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 0.016;
      last = now;
      settle(dt);
      const next = findHover();
      if (next !== hovered) {
        hovered = next;
        setHover(next >= 0 ? stars[next].tool : null);
        canvas.style.cursor = next >= 0 ? "pointer" : "default";
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    readPalette();
    layout();
    if (still) {
      // Run the simulation without drawing it, then show where it landed.
      for (let i = 0; i < 240; i++) settle(1 / 60);
      draw();
    } else {
      frame = requestAnimationFrame(step);
    }

    const observer = new ResizeObserver(() => {
      const before = box;
      layout();
      // Keep the arrangement, just rescale it into the new box.
      if (before.w) {
        for (const star of stars) {
          star.x *= box.w / before.w;
          star.y *= box.h / before.h;
        }
      }
      if (still) draw();
    });
    observer.observe(wrap);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (still) {
        const next = findHover();
        if (next !== hovered) {
          hovered = next;
          setHover(next >= 0 ? stars[next].tool : null);
          canvas.style.cursor = next >= 0 ? "pointer" : "default";
          draw();
        }
      }
    };
    const onLeave = () => {
      pointer = null;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    // A star is a link. New tab, because the room is not somewhere you want to lose.
    openRef.current = () => {
      if (hovered < 0) return;
      window.open(`/tools/${stars[hovered].tool.slug}`, "_blank", "noopener");
    };

    const theme = new MutationObserver(() => {
      readPalette();
      if (still) draw();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      openRef.current = null;
    };
  }, [tools, groups]);

  const counts = groups
    .map((group) => ({ ...group, n: tools.filter((tool) => tool.group === group.slug).length }))
    .filter((group) => group.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`A drifting map of ${tools.length} tools, linked where they share a category`}
        className="block h-full w-full"
        onClick={() => openRef.current?.()}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)",
        }}
      >
        <p className="label max-w-[46rem] text-mute">
          {tools.length} tools ·{" "}
          {counts.map((group) => `${group.name} ${group.n}`).join(" · ")}
        </p>
        <p className="label text-mute">
          {hover ? `${hover.name} — click to open` : "Hover a star"}
        </p>
      </div>
    </div>
  );
}
