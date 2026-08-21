"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/confetti";

const SIZE = 4;
const BEST_KEY = "gitwork.doubleup.best";
const SLIDE = 110;
const POP = 130;

type Tile = {
  id: number;
  value: number;
  x: number;
  y: number;
  /** Where it started this move, for the slide. */
  fromX: number;
  fromY: number;
  /** Set on the tile that came out of a merge, and on a tile that has just appeared. */
  popped: boolean;
  fresh: boolean;
};

/** Tiles absorbed by a merge: they slide in, then vanish under the new value. */
type Ghost = { id: number; value: number; fromX: number; fromY: number; x: number; y: number };

/**
 * The value ladder walks up through the six area colours, so the board turns from grey to
 * violet to green to amber as it fills. 2 and 4 stay quiet on purpose — most of the board
 * is 2s and 4s, and colouring those makes it unreadable.
 */
const LADDER: { token: string; on: string }[] = [
  { token: "--bg-input", on: "--text" },
  { token: "--bg-card-hover", on: "--text" },
  { token: "--accent-soft", on: "--on-accent" },
  { token: "--accent", on: "--on-accent" },
  { token: "--color-green", on: "--color-void" },
  { token: "--color-green", on: "--color-void" },
  { token: "--color-amber", on: "--color-void" },
  { token: "--color-amber", on: "--color-void" },
  { token: "--color-flag", on: "--color-void" },
  { token: "--color-flag", on: "--color-void" },
  { token: "--text", on: "--bg" },
];

let nextId = 1;

/**
 * Double up: the merge game, in the site's palette. Arrows or a swipe, everything doubles,
 * 2048 gets confetti and you carry on. No knowledge of anything required — it is here to
 * eat ten minutes.
 *
 * The only fiddly rule is the one every version of this gets wrong at least once: a tile
 * may only merge once per move, so 2 2 4 slides to 4 4 rather than collapsing to 8.
 */
export function DoubleUp() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [top, setTop] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const restartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(BEST_KEY));
      if (Number.isFinite(saved) && saved > 0) setBest(saved);
    } catch {
      /* private window */
    }
  }, []);

  const restart = useCallback(() => restartRef.current?.(), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let tiles: Tile[] = [];
    let ghosts: Ghost[] = [];
    let movedAt = -1;
    let points = 0;
    let highest = 0;
    let finished = false;
    let box = { w: 0, h: 0 };
    let board = { x: 0, y: 0, size: 0, cell: 0, gap: 0 };
    let frame = 0;
    let colours = {
      bg: "#0c0c18",
      board: "#12121e",
      empty: "#171724",
      ink: "#f2ede4",
      faint: "#7c7a8c",
      accent: "#6b52ff",
    };
    let ladder: { fill: string; on: string }[] = [];

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      colours = {
        bg: get("--bg", "#0c0c18"),
        board: get("--bg-raised", "#12121e"),
        empty: get("--bg-input", "#171724"),
        ink: get("--text", "#f2ede4"),
        faint: get("--text-mute", "#7c7a8c"),
        accent: get("--accent", "#6b52ff"),
      };
      ladder = LADDER.map((step) => ({
        fill: get(step.token, "#6b52ff"),
        on: get(step.on, "#fff"),
      }));
    };

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      box = { w: Math.max(320, rect.width), h: Math.max(320, rect.height) };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = Math.min(box.w - 80, box.h - 190);
      const gap = Math.max(8, size * 0.022);
      board = {
        x: (box.w - size) / 2,
        y: (box.h - size) / 2 - 18,
        size,
        gap,
        cell: (size - gap * (SIZE + 1)) / SIZE,
      };
    };

    const at = (x: number, y: number) => tiles.find((tile) => tile.x === x && tile.y === y);

    const spawn = () => {
      const free: { x: number; y: number }[] = [];
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) if (!at(x, y)) free.push({ x, y });
      }
      if (!free.length) return;
      const spot = free[Math.floor(Math.random() * free.length)];
      tiles.push({
        id: nextId++,
        value: Math.random() < 0.9 ? 2 : 4,
        x: spot.x,
        y: spot.y,
        fromX: spot.x,
        fromY: spot.y,
        popped: false,
        fresh: true,
      });
    };

    const reset = () => {
      tiles = [];
      ghosts = [];
      points = 0;
      highest = 0;
      finished = false;
      movedAt = -1;
      spawn();
      spawn();
      setScore(0);
      setTop(0);
      setOver(false);
      setBurst(null);
    };
    restartRef.current = reset;

    /** True if any move would change the board. */
    const canMove = () => {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const tile = at(x, y);
          if (!tile) return true;
          const right = at(x + 1, y);
          const down = at(x, y + 1);
          if (right && right.value === tile.value) return true;
          if (down && down.value === tile.value) return true;
        }
      }
      return false;
    };

    const move = (dx: number, dy: number) => {
      if (finished) return;
      let changed = false;
      let gained = 0;
      ghosts = [];
      for (const tile of tiles) {
        tile.fromX = tile.x;
        tile.fromY = tile.y;
        tile.popped = false;
        tile.fresh = false;
      }

      // Walk each line from the edge the tiles are moving towards.
      const lines: Tile[][] = [];
      for (let i = 0; i < SIZE; i++) {
        const line: Tile[] = [];
        for (let j = 0; j < SIZE; j++) {
          const x = dx !== 0 ? (dx > 0 ? SIZE - 1 - j : j) : i;
          const y = dy !== 0 ? (dy > 0 ? SIZE - 1 - j : j) : i;
          const tile = at(x, y);
          if (tile) line.push(tile);
        }
        lines.push(line);
      }

      const kept: Tile[] = [];
      lines.forEach((line, i) => {
        let slot = 0;
        for (let k = 0; k < line.length; k++) {
          const tile = line[k];
          const next = line[k + 1];
          // One merge per tile per move: this is the rule that gets miscoded.
          const merging = next && next.value === tile.value;
          const place = (target: Tile) => {
            const x = dx !== 0 ? (dx > 0 ? SIZE - 1 - slot : slot) : i;
            const y = dy !== 0 ? (dy > 0 ? SIZE - 1 - slot : slot) : i;
            if (target.x !== x || target.y !== y) changed = true;
            target.x = x;
            target.y = y;
          };
          if (merging) {
            place(tile);
            tile.value *= 2;
            tile.popped = true;
            gained += tile.value;
            highest = Math.max(highest, tile.value);
            ghosts.push({
              id: next.id,
              value: next.value,
              fromX: next.x,
              fromY: next.y,
              x: tile.x,
              y: tile.y,
            });
            kept.push(tile);
            changed = true;
            k += 1;
          } else {
            place(tile);
            kept.push(tile);
          }
          slot += 1;
        }
      });

      if (!changed) return;
      tiles = kept;
      points += gained;
      movedAt = performance.now();
      spawn();
      setScore(points);
      setTop(highest);
      setBest((current) => {
        if (points <= current) return current;
        try {
          window.localStorage.setItem(BEST_KEY, String(points));
        } catch {
          /* nothing worth doing about it */
        }
        return points;
      });
      if (highest >= 2048 && !burstFired) {
        burstFired = true;
        const rect = canvas.getBoundingClientRect();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }
      if (!canMove()) {
        finished = true;
        setOver(true);
      }
    };
    let burstFired = false;

    const cellAt = (x: number, y: number) => ({
      px: board.x + board.gap + x * (board.cell + board.gap),
      py: board.y + board.gap + y * (board.cell + board.gap),
    });

    const tileColour = (value: number) => {
      const step = Math.min(ladder.length - 1, Math.log2(value) - 1);
      return ladder[Math.max(0, step)] ?? { fill: colours.accent, on: colours.ink };
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const slide = movedAt < 0 ? 1 : Math.min(1, (now - movedAt) / SLIDE);
      const ease = 1 - Math.pow(1 - slide, 3);

      ctx.fillStyle = colours.bg;
      ctx.fillRect(0, 0, box.w, box.h);

      ctx.fillStyle = colours.board;
      ctx.beginPath();
      ctx.roundRect(board.x, board.y, board.size, board.size, board.gap * 1.6);
      ctx.fill();

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const { px, py } = cellAt(x, y);
          ctx.fillStyle = colours.empty;
          ctx.beginPath();
          ctx.roundRect(px, py, board.cell, board.cell, board.gap);
          ctx.fill();
        }
      }

      const paint = (value: number, gx: number, gy: number, scale: number) => {
        const { px, py } = cellAt(gx, gy);
        const { fill, on } = tileColour(value);
        const inset = (board.cell * (1 - scale)) / 2;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(px + inset, py + inset, board.cell * scale, board.cell * scale, board.gap);
        ctx.fill();
        const digits = String(value).length;
        const font = board.cell * (digits > 3 ? 0.3 : digits > 2 ? 0.36 : 0.42);
        ctx.fillStyle = on;
        ctx.font = `600 ${font}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(value), px + board.cell / 2, py + board.cell / 2 + font * 0.04);
      };

      // Absorbed tiles first, so the merged value lands on top of them.
      if (slide < 1) {
        for (const ghost of ghosts) {
          paint(
            ghost.value,
            ghost.fromX + (ghost.x - ghost.fromX) * ease,
            ghost.fromY + (ghost.y - ghost.fromY) * ease,
            1,
          );
        }
      }

      for (const tile of tiles) {
        const gx = tile.fromX + (tile.x - tile.fromX) * ease;
        const gy = tile.fromY + (tile.y - tile.fromY) * ease;
        let scale = 1;
        if (tile.fresh) scale = Math.min(1, 0.4 + ease * 0.6);
        if (tile.popped && slide >= 1) {
          const pop = Math.min(1, (now - movedAt - SLIDE) / POP);
          scale = 1 + Math.sin(pop * Math.PI) * 0.12;
        }
        paint(tile.value, gx, gy, scale);
      }

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    };

    readPalette();
    layout();
    reset();
    frame = requestAnimationFrame(draw);

    const observer = new ResizeObserver(layout);
    observer.observe(wrap);
    const theme = new MutationObserver(readPalette);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const KEYS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      a: [-1, 0],
      d: [1, 0],
      w: [0, -1],
      s: [0, 1],
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.key === "Enter" || event.key === " ") && finished) {
        event.preventDefault();
        reset();
        return;
      }
      const direction = KEYS[event.key];
      if (!direction) return;
      // Arrows scroll the page otherwise, and the room is a fixed overlay.
      event.preventDefault();
      event.stopPropagation();
      move(direction[0], direction[1]);
    };
    window.addEventListener("keydown", onKey, true);

    // Swipe, for anyone on a tablet.
    let from: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      from = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      from = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) {
        if (finished) reset();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
      else move(0, Math.sign(dy));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      window.removeEventListener("keydown", onKey, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      restartRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A four by four merge board"
        className="block h-full w-full"
      />
      {burst ? <Confetti at={burst} onDone={() => setBurst(null)} /> : null}

      {over ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="pointer-events-auto rounded-[var(--radius-card)] border px-6 py-5 text-center backdrop-blur-md"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--bg) 88%, transparent)",
            }}
          >
            <p className="display text-2xl">No moves left.</p>
            <p className="mt-2 text-sm text-soft">
              {score.toLocaleString("en-GB")} points, best tile {top}.
            </p>
            <button
              type="button"
              onClick={restart}
              className="label mt-4 rounded-full px-5 py-3"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Go again
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 94%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {score.toLocaleString("en-GB")} points · best {best.toLocaleString("en-GB")} · top tile{" "}
          {top || 2} · arrows, WASD or swipe
        </p>
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
