"use client";

import { useEffect, useRef } from "react";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  w: number;
  h: number;
  colour: string;
  round: boolean;
  life: number;
};

const PIECES = 90;
const GRAVITY = 1150;
/** Per-frame-at-60fps air resistance, applied sideways only; gravity owns the fall. */
const DRAG = 0.985;
const LIFE = 2.3;

/**
 * A one-shot burst from a point on the page, for the moment the counter reaches 2100. It
 * mounts, throws its paper, and calls onDone so the caller can unmount it — there is no
 * idle loop left running afterwards.
 *
 * The caller is responsible for not rendering it when the visitor has asked for reduced
 * motion. Nothing here is interactive, so it sits over the page with pointer events off.
 */
export function Confetti({
  at,
  onDone,
}: {
  at: { x: number; y: number };
  onDone: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Held in a ref so a re-render cannot restart the burst mid-flight.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback;
    // The brand palette, so it looks like this site celebrating rather than a party pack.
    const colours = [
      token("--accent", "#6b52ff"),
      token("--accent-soft", "#8f7dff"),
      token("--color-green", "#3ecf8e"),
      token("--color-amber", "#e8b04b"),
      token("--text", "#f2ede4"),
    ];

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      // A canvas is a replaced element: inset-0 alone lays it out at its bitmap size, so
      // on a 2x screen everything landed at twice the intended position, off the bottom.
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const pieces: Piece[] = Array.from({ length: PIECES }, (_, i) => {
      // Mostly upward, because it is thrown from a line of text near the bottom of a page.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = 420 + Math.random() * 520;
      return {
        x: at.x + (Math.random() - 0.5) * 24,
        y: at.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 16,
        angle: Math.random() * Math.PI,
        w: 4 + Math.random() * 5,
        h: 2.5 + Math.random() * 4,
        colour: colours[i % colours.length],
        round: Math.random() < 0.22,
        life: LIFE * (0.6 + Math.random() * 0.4),
      };
    });

    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let alive = 0;
      for (const piece of pieces) {
        piece.life -= dt;
        if (piece.life <= 0) continue;
        alive += 1;
        piece.vy += GRAVITY * dt;
        piece.vx *= Math.pow(DRAG, dt * 60);
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;

        ctx.save();
        ctx.globalAlpha = Math.min(1, piece.life / 0.5);
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.fillStyle = piece.colour;
        if (piece.round) {
          ctx.beginPath();
          ctx.arc(0, 0, piece.h * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Flat on its edge for part of every spin, the way real paper falls.
          ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(piece.angle * 1.7))));
          ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        }
        ctx.restore();
      }

      if (alive === 0) {
        done.current();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", size);
    };
  }, [at]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />;
}
