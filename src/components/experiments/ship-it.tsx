"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomTool } from "./room-data";

type Brick = { x: number; y: number; w: number; h: number; tool: RoomTool; alive: boolean };

const GROUP_TINT: Record<string, string> = {
  "ai-coding": "--accent",
  "design-engineering": "--color-green",
  "creative-and-assets": "--color-amber",
  "workflow-and-mac": "--accent-soft",
  "discovery-and-reference": "--text-mute",
  "mobile-and-apple": "--color-flag",
};

const ROWS = 6;
const LIVES = 3;
const BALL_R = 5;
const PADDLE_W = 116;
const PADDLE_H = 9;
const START_SPEED = 420;
const MAX_SPEED = 780;

/**
 * Breakout, except the bricks are tools off the list and clearing one ships it. There is
 * no point to this whatsoever.
 *
 * The ball moves in substeps of a few pixels rather than one jump a frame, because at 700
 * pixels a second a single step is wider than a brick and it tunnels straight through.
 */
export function ShipIt({ tools }: { tools: RoomTool[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState({ shipped: 0, lives: LIVES, total: 0, done: "" });
  const [round, setRound] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const launchRef = useRef<(() => void) | null>(null);

  // The line-up is drawn after mounting: picking it during a render would mean the server
  // and the browser disagreed about which tools were on the board.
  useEffect(() => setSeeded(true), []);

  const restart = useCallback(() => setRound((value) => value + 1), []);

  useEffect(() => {
    if (!seeded) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const palette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      return {
        bg: get("--bg", "#0c0c18"),
        ink: get("--text", "#f2ede4"),
        faint: get("--text-mute", "#7c7a8c"),
        accent: get("--accent", "#6b52ff"),
        tint: (group: string) => get(GROUP_TINT[group] ?? "--text-mute", "#7c7a8c"),
      };
    };
    let colours = palette();

    let box = { w: 0, h: 0 };
    let bricks: Brick[] = [];
    let paddleX = 0;
    let ball = { x: 0, y: 0, vx: 0, vy: 0, live: false };
    let lives = LIVES;
    let shipped = 0;
    let speed = START_SPEED;
    let over = "";
    let flash = { text: "", until: 0 };
    let frame = 0;
    let last = 0;
    let now = 0;
    const held = { left: false, right: false };

    const build = () => {
      const cols = Math.max(4, Math.min(9, Math.floor(box.w / 150)));
      const count = cols * ROWS;
      // Whatever is on the board, it is a real slice of the list.
      const picks: RoomTool[] = [];
      const used = new Set<number>();
      let seed = (round + 1) * 7919;
      while (picks.length < count && used.size < tools.length) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const index = seed % tools.length;
        if (used.has(index)) continue;
        used.add(index);
        picks.push(tools[index]);
      }
      const pad = 11;
      // Clear of the accordion in the corner, and deep enough that the board is not all
      // empty space under the bricks.
      const top = 96;
      const w = (box.w - pad * (cols + 1)) / cols;
      const h = Math.max(30, Math.min(44, (box.h * 0.46 - top) / ROWS - pad));
      bricks = picks.map((tool, index) => ({
        x: pad + (index % cols) * (w + pad),
        y: top + Math.floor(index / cols) * (h + pad),
        w,
        h,
        tool,
        alive: true,
      }));
      paddleX = box.w / 2;
      resetBall();
      lives = LIVES;
      shipped = 0;
      speed = START_SPEED;
      over = "";
      setState({ shipped: 0, lives, total: bricks.length, done: "" });
    };

    function resetBall() {
      ball = { x: paddleX, y: box.h - 70, vx: 0, vy: 0, live: false };
    }

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
      if (first || bricks.length === 0) build();
    };

    const launch = () => {
      if (over) {
        build();
        return;
      }
      if (ball.live) return;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      ball = { x: paddleX, y: box.h - 70, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, live: true };
    };
    launchRef.current = launch;

    const hitBrick = () => {
      for (const brick of bricks) {
        if (!brick.alive) continue;
        if (
          ball.x + BALL_R < brick.x ||
          ball.x - BALL_R > brick.x + brick.w ||
          ball.y + BALL_R < brick.y ||
          ball.y - BALL_R > brick.y + brick.h
        ) {
          continue;
        }
        brick.alive = false;
        shipped += 1;
        speed = Math.min(MAX_SPEED, speed + 9);
        flash = { text: `Shipped ${brick.tool.name}`, until: now + 1400 };
        // Bounce off the shallower axis: the side it was closer to entering through.
        const fromSide =
          Math.min(Math.abs(ball.x - brick.x), Math.abs(ball.x - (brick.x + brick.w))) <
          Math.min(Math.abs(ball.y - brick.y), Math.abs(ball.y - (brick.y + brick.h)));
        if (fromSide) ball.vx *= -1;
        else ball.vy *= -1;
        const length = Math.hypot(ball.vx, ball.vy) || 1;
        ball.vx = (ball.vx / length) * speed;
        ball.vy = (ball.vy / length) * speed;
        if (!bricks.some((item) => item.alive)) over = "Shipped the lot";
        setState({ shipped, lives, total: bricks.length, done: over });
        return;
      }
    };

    const step = (dt: number) => {
      const target = paddleX + (held.left ? -1 : 0) * 900 * dt + (held.right ? 1 : 0) * 900 * dt;
      paddleX = Math.max(PADDLE_W / 2, Math.min(box.w - PADDLE_W / 2, target));

      if (!ball.live) {
        ball.x = paddleX;
        return;
      }
      // Substeps, or the ball passes through a brick between frames.
      const distance = Math.hypot(ball.vx, ball.vy) * dt;
      const steps = Math.max(1, Math.ceil(distance / 4));
      for (let i = 0; i < steps; i++) {
        ball.x += (ball.vx * dt) / steps;
        ball.y += (ball.vy * dt) / steps;
        if (ball.x < BALL_R) {
          ball.x = BALL_R;
          ball.vx = Math.abs(ball.vx);
        }
        if (ball.x > box.w - BALL_R) {
          ball.x = box.w - BALL_R;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y < BALL_R) {
          ball.y = BALL_R;
          ball.vy = Math.abs(ball.vy);
        }
        const paddleY = box.h - 44;
        if (
          ball.vy > 0 &&
          ball.y + BALL_R >= paddleY &&
          ball.y - BALL_R <= paddleY + PADDLE_H &&
          Math.abs(ball.x - paddleX) <= PADDLE_W / 2 + BALL_R
        ) {
          // Where it lands on the paddle steers it, so there is some control in this.
          const offset = (ball.x - paddleX) / (PADDLE_W / 2);
          const angle = -Math.PI / 2 + offset * 1.05;
          ball.vx = Math.cos(angle) * speed;
          ball.vy = Math.sin(angle) * speed;
          ball.y = paddleY - BALL_R;
        }
        hitBrick();
        if (ball.y > box.h + 40) {
          lives -= 1;
          if (lives <= 0) {
            over = "Rolled back";
            setState({ shipped, lives: 0, total: bricks.length, done: over });
          } else {
            setState({ shipped, lives, total: bricks.length, done: "" });
          }
          resetBall();
          return;
        }
      }
    };

    const draw = () => {
      ctx.fillStyle = colours.bg;
      ctx.fillRect(0, 0, box.w, box.h);

      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = "middle";
      for (const brick of bricks) {
        if (!brick.alive) continue;
        const tint = colours.tint(brick.tool.group);
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 7);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = tint;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colours.ink;
        ctx.save();
        ctx.beginPath();
        ctx.rect(brick.x + 6, brick.y, brick.w - 12, brick.h);
        ctx.clip();
        ctx.fillText(brick.tool.name, brick.x + 8, brick.y + brick.h / 2 + 0.5);
        ctx.restore();
      }

      ctx.fillStyle = colours.accent;
      ctx.beginPath();
      ctx.roundRect(paddleX - PADDLE_W / 2, box.h - 44, PADDLE_W, PADDLE_H, 5);
      ctx.fill();

      ctx.fillStyle = colours.ink;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "center";
      if (flash.text && now < flash.until) {
        ctx.fillStyle = colours.faint;
        ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(flash.text.toUpperCase(), box.w / 2, box.h - 76);
      }
      if (!ball.live) {
        ctx.fillStyle = colours.faint;
        ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillText(
          over ? `${over.toUpperCase()} — CLICK TO GO AGAIN` : "CLICK OR PRESS SPACE TO SERVE",
          box.w / 2,
          box.h * 0.55,
        );
      }
      ctx.textAlign = "left";
    };

    const loop = (time: number) => {
      now = time;
      const dt = last ? Math.min(0.04, (time - last) / 1000) : 0.016;
      last = time;
      if (!over) step(dt);
      draw();
      frame = requestAnimationFrame(loop);
    };

    layout();
    frame = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      const before = box.w;
      layout();
      if (before) build();
    });
    observer.observe(wrap);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = Math.max(
        PADDLE_W / 2,
        Math.min(box.w - PADDLE_W / 2, event.clientX - rect.left),
      );
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") held.left = event.type === "keydown";
      if (event.key === "ArrowRight") held.right = event.type === "keydown";
      if (event.key === " " && event.type === "keydown") {
        event.preventDefault();
        launch();
      }
    };
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const theme = new MutationObserver(() => {
      colours = palette();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      launchRef.current = null;
    };
  }, [tools, round, seeded]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Breakout, where the bricks are tools from the list"
        className="block h-full w-full cursor-none"
        onClick={() => launchRef.current?.()}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5">
        <p className="label text-mute">
          {state.shipped}/{state.total} shipped ·{" "}
          {state.lives > 0 ? `${"●".repeat(state.lives)} left` : "none left"}
          {state.done ? ` · ${state.done}` : ""}
        </p>
        <p className="label text-mute">Pointer or arrows · space serves</p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <p className="label text-mute">Ship It</p>
        <button
          type="button"
          onClick={restart}
          className="label pointer-events-auto rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          New board
        </button>
      </div>
    </div>
  );
}
