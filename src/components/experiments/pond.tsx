"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };

type Koi = {
  /** The path the fish is travelling: a follow-the-leader chain, no undulation in it. */
  joints: Pt[];
  /** What you see: the spine with the swimming wave laid across it. */
  body: Pt[];
  /** Forward-facing angle at each joint, recomputed each step so drawing works nothing out. */
  facing: number[];
  gap: number;
  size: number;
  heading: number;
  wander: number;
  speed: number;
  cruise: number;
  stroke: number;
  waves: number;
  spook: number;
  flee: number;
  base: string;
  marks: { at: number; lat: number; r: number; tone: number }[];
  ink: string[];
  eye: string;
};

type Pellet = { x: number; y: number; age: number; drift: number };
type Ring = { x: number; y: number; age: number; force: number };
type Pad = { x: number; y: number; r: number; turn: number; flower: boolean };

const JOINTS = 12;
/** Surface grid, in CSS pixels. Ten is fine enough for caustics and cheap enough to rebuild. */
const SURFACE = 10;
const LATTICE = 64;
/** Shadows are rendered a third of size and blown back up; the upscale is the blur. */
const SHADE = 3;
/**
 * The water is composited at half size and blown up once. Caustics are soft by nature so
 * nothing is lost, and an additive blend over two million backing-store pixels twice a
 * frame was three quarters of the frame on its own.
 */
const BED = 2;
const FOLD = 20;
const FILAMENT = 0.07;
const SHEEN = 2.2;
/** Half-width down the body: widest just behind the head, tapering to the wrist of the tail. */
const PROFILE = [0.62, 0.86, 0.95, 0.94, 0.88, 0.79, 0.68, 0.57, 0.46, 0.35, 0.25, 0.16];
const MAX_KOI = 24;
const RING_LIFE = 3.4;
/** Beyond this the oldest ring is dropped: the surface pass costs one test a ring a cell. */
const MAX_RINGS = 7;
const PELLET_LIFE = 14;

const WATER = {
  dark: { lit: "#1b5a66", mid: "#0d2b38", deep: "#06121b", caustic: "#8fe3ec", sink: 0.42 },
  light: { lit: "#dcefe6", mid: "#a9ccc6", deep: "#6e9ba0", caustic: "#ffffff", sink: 0.22 },
};

const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hex = (value: string, fallback: string) => {
  const raw = (value || "").trim() || fallback;
  const n = parseInt(raw.replace("#", ""), 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luma = ([r, g, b]: number[]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/** Shortest way round: the difference between two angles, always in [-π, π]. */
const wrap = (a: number) => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const rgba = (colour: string, alpha: number) => {
  const [r, g, b] = hex(colour, "#f4efe6");
  return `rgb(${r} ${g} ${b} / ${alpha})`;
};

/** Smooth closed path through a ring of points — quadratics through midpoints, no library. */
const curve = (c: Path2D, pts: Pt[]) => {
  if (pts.length < 3) return;
  const last = pts.length - 1;
  const mid0 = { x: (pts[last].x + pts[0].x) / 2, y: (pts[last].y + pts[0].y) / 2 };
  c.moveTo(mid0.x, mid0.y);
  for (let i = 0; i < last; i++) {
    const nx = (pts[i].x + pts[i + 1].x) / 2;
    const ny = (pts[i].y + pts[i + 1].y) / 2;
    c.quadraticCurveTo(pts[i].x, pts[i].y, nx, ny);
  }
  c.quadraticCurveTo(pts[last].x, pts[last].y, mid0.x, mid0.y);
};

/**
 * A koi pond. The fish are not animated — each one is a chain of twelve joints, and every
 * joint is dragged to a fixed distance behind the one in front of it with a limit on how
 * far it may turn. Swimming is one line: the head's heading gets a sine wiggle, and the
 * body's whole undulation is that wiggle arriving down the chain a joint at a time.
 *
 * Tap the water to drop feed, tap a koi to scare it.
 */
export function Pond() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addRef = useRef<(() => void) | null>(null);
  const feedRef = useRef<(() => void) | null>(null);
  const [stats, setStats] = useState({ koi: 0, eaten: 0 });

  const add = useCallback(() => addRef.current?.(), []);
  const feed = useCallback(() => feedRef.current?.(), []);

  useEffect(() => {
    const host = wrapRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The shadows are blurred once as a layer rather than per fish, so the whole shoal
    // costs one filtered draw a frame instead of one each.
    const shade = document.createElement("canvas");
    const sctx = shade.getContext("2d");
    // The gradient and the vignette only change on a resize or a theme flip, so they are
    // painted once and copied rather than recomputed sixty times a second.
    const wash = document.createElement("canvas");
    const wctx = wash.getContext("2d", { alpha: false });
    const bed = document.createElement("canvas");
    const bctx = bed.getContext("2d", { alpha: false });

    const rand = mulberry(20260922);

    // One lattice of random values, sampled smoothly and scrolled at two rates, is the
    // whole water surface. Everything else — the bright web on the floor, the wobble in
    // the fish, the rings a tap leaves — is this one height field read back differently.
    // Gradient noise, not value noise. Value noise interpolated off a lattice is
    // separable, so its second derivative comes out as axis-aligned squares — which is
    // exactly what a caustic pass reads. Eight gradient directions and a quintic fade
    // (C2, so the second derivative is continuous at all) give a field you can
    // differentiate twice and still get water.
    const GRADS = [
      [1, 0],
      [0.7071, 0.7071],
      [0, 1],
      [-0.7071, 0.7071],
      [-1, 0],
      [-0.7071, -0.7071],
      [0, -1],
      [0.7071, -0.7071],
    ];
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const noise = (x: number, y: number) => {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const u = ease(fx);
      const v = ease(fy);
      const a = GRADS[perm[perm[xi] + yi] & 7];
      const b = GRADS[perm[perm[xi + 1] + yi] & 7];
      const c = GRADS[perm[perm[xi] + yi + 1] & 7];
      const d = GRADS[perm[perm[xi + 1] + yi + 1] & 7];
      const n00 = a[0] * fx + a[1] * fy;
      const n10 = b[0] * (fx - 1) + b[1] * fy;
      const n01 = c[0] * fx + c[1] * (fy - 1);
      const n11 = d[0] * (fx - 1) + d[1] * (fy - 1);
      const top = n00 + (n10 - n00) * u;
      const bot = n01 + (n11 - n01) * u;
      return top + (bot - top) * v;
    };

    let cols = 0;
    let rows = 0;
    let height = new Float32Array(0);
    const surface = document.createElement("canvas");
    const surfCtx = surface.getContext("2d");
    let caustic: ImageData | null = null;
    let soft = new Float32Array(0);
    let box = { w: 0, h: 0, scale: 1 };
    let water = WATER.dark;
    let house = { violet: "#6b52ff", green: "#3ecf8e", flag: "#ff6b6b", amber: "#e8b04b" };
    let clock = 0;
    let eaten = 0;
    let frame = 0;
    let last = 0;

    const koi: Koi[] = [];
    const pellets: Pellet[] = [];
    const rings: Ring[] = [];
    let pads: Pad[] = [];

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        style.getPropertyValue(name).trim() || fallback;
      house = {
        violet: get("--accent-soft", "#8f7dff"),
        green: get("--color-green", "#3ecf8e"),
        flag: get("--color-flag", "#ff6b6b"),
        amber: get("--color-amber", "#e8b04b"),
      };
      water = luma(hex(get("--bg", "#0c0c18"), "#0c0c18")) < 0.5 ? WATER.dark : WATER.light;
    };

    /** Five real koi varieties, two of them recoloured into the house palette. */
    const dress = (pick: number) => {
      const white = "#f4efe6";
      const charcoal = "#26262f";
      switch (pick) {
        case 0:
          return { base: white, ink: [house.flag], eye: charcoal }; // kohaku
        case 1:
          return { base: white, ink: [house.flag, charcoal], eye: charcoal }; // showa
        case 2:
          return { base: house.amber, ink: ["#f6dfa8"], eye: "#4a3714" }; // ogon
        case 3:
          return { base: white, ink: [house.violet], eye: charcoal };
        default:
          return { base: white, ink: [house.green, charcoal], eye: charcoal };
      }
    };

    const spawn = (x: number, y: number): Koi => {
      const size = (6.4 + rand() * 4.2) * box.scale;
      const gap = size * 0.82;
      const heading = rand() * Math.PI * 2;
      const joints: Pt[] = [];
      const body: Pt[] = [];
      for (let i = 0; i < JOINTS; i++) {
        joints.push({ x: x - Math.cos(heading) * gap * i, y: y - Math.sin(heading) * gap * i });
        body.push({ x: joints[i].x, y: joints[i].y });
      }
      const skin = dress(Math.floor(rand() * 5));
      const marks: Koi["marks"] = [];
      const count = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        marks.push({
          at: 1 + rand() * (JOINTS - 4),
          lat: (rand() - 0.5) * 0.8,
          r: 0.75 + rand() * 0.75,
          tone: Math.floor(rand() * skin.ink.length),
        });
      }
      // Cruise in body lengths a second, not pixels — a big koi should look unhurried.
      const cruise = gap * (JOINTS - 1) * (0.42 + rand() * 0.3);
      return {
        joints,
        body,
        facing: new Array(JOINTS).fill(heading),
        gap,
        size,
        heading,
        wander: 0,
        speed: cruise,
        cruise,
        stroke: rand() * Math.PI * 2,
        waves: 1.05 + rand() * 0.35,
        spook: 0,
        flee: heading,
        base: skin.base,
        ink: skin.ink,
        eye: skin.eye,
        marks,
      };
    };

    const layout = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(1.75, window.devicePixelRatio || 1);
      const first = box.w === 0;
      box = {
        w: Math.max(320, rect.width),
        h: Math.max(320, rect.height),
        scale: clamp(Math.min(rect.width, rect.height) / 720, 0.72, 1.55),
      };
      canvas.width = Math.round(box.w * dpr);
      canvas.height = Math.round(box.h * dpr);
      canvas.style.width = `${box.w}px`;
      canvas.style.height = `${box.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      shade.width = Math.ceil(box.w / SHADE);
      shade.height = Math.ceil(box.h / SHADE);
      wash.width = Math.ceil(box.w / BED);
      wash.height = Math.ceil(box.h / BED);
      bed.width = wash.width;
      bed.height = wash.height;
      paintWash();
      cols = Math.ceil(box.w / SURFACE) + 2;
      rows = Math.ceil(box.h / SURFACE) + 2;
      height = new Float32Array(cols * rows);
      surface.width = cols;
      surface.height = rows;
      caustic = surfCtx?.createImageData(cols, rows) ?? null;
      soft = new Float32Array(cols * rows);

      if (first) {
        const start = clamp(Math.round((box.w * box.h) / 72000), 11, 18);
        // Laid out on a jittered grid rather than scattered at random: pure random
        // clumps, and the first second of a pond is the one anybody judges it on.
        const across = Math.ceil(Math.sqrt((start * box.w) / box.h));
        const down = Math.ceil(start / across);
        for (let i = 0; i < start; i++) {
          const cx = ((i % across) + 0.5) / across;
          const cy = (Math.floor(i / across) + 0.5) / down;
          koi.push(
            spawn(
              (cx + (rand() - 0.5) * 0.55 / across) * box.w,
              (cy + (rand() - 0.5) * 0.55 / down) * box.h,
            ),
          );
        }
        pads = [];
        const want = clamp(Math.round((box.w * box.h) / 360000), 2, 5);
        for (let tries = 0; pads.length < want && tries < 60; tries++) {
          const pad = {
            x: (0.1 + rand() * 0.8) * box.w,
            y: (0.1 + rand() * 0.8) * box.h,
            r: (26 + rand() * 20) * box.scale,
            turn: rand() * Math.PI * 2,
            flower: rand() < 0.45,
          };
          // Pads that overlap read as one torn pad, so a candidate that lands on a
          // neighbour is thrown away rather than nudged.
          if (pads.some((other) => Math.hypot(other.x - pad.x, other.y - pad.y) < other.r + pad.r + 18)) continue;
          pads.push(pad);
        }
      }
    };

    /** Bed gradient and vignette, at bed scale. Repainted on a resize or a theme flip. */
    const paintWash = () => {
      if (!wctx) return;
      const w = wash.width;
      const h = wash.height;
      const lit = wctx.createRadialGradient(w * 0.38, h * 0.26, 0, w * 0.38, h * 0.26, Math.max(w, h) * 0.95);
      lit.addColorStop(0, water.lit);
      lit.addColorStop(0.45, water.mid);
      lit.addColorStop(1, water.deep);
      wctx.fillStyle = lit;
      wctx.fillRect(0, 0, w, h);
      const edge = wctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
      edge.addColorStop(0, "rgb(0 0 0 / 0)");
      edge.addColorStop(1, `rgb(0 0 0 / ${water.sink})`);
      wctx.fillStyle = edge;
      wctx.fillRect(0, 0, w, h);
    };

    const ripple = (x: number, y: number, force: number) => {
      rings.push({ x, y, age: 0, force });
      if (rings.length > MAX_RINGS) rings.shift();
    };

    const nearestPellet = (k: Koi) => {
      const head = k.joints[0];
      let best: Pellet | null = null;
      let bestD = 300 * box.scale;
      for (const p of pellets) {
        const d = Math.hypot(p.x - head.x, p.y - head.y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best;
    };

    /**
     * Two octaves of drifting noise plus a travelling ring for every tap. Rings are added
     * into the surface rather than drawn on top of it, which is why a tap brightens the
     * floor and bends the fish under it without any of that being drawn twice.
     */
    const buildSurface = () => {
      const detail = 1 / box.scale;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Frequency scaled against the viewport: the surface is measured in pixels, so
          // without this a phone gets three enormous features and a desktop gets forty.
          const wx = x * 0.07 * detail;
          const wy = y * 0.07 * detail;
          // Each octave turned against the last: three grids at the same angle still
          // reads as a grid.
          const rx = wx * 0.8 - wy * 0.6;
          const ry = wx * 0.6 + wy * 0.8;
          const sx = wx * 0.28 + wy * 0.96;
          const sy = -wx * 0.96 + wy * 0.28;
          // Octave weights fall as 1/f², not 1/f. A laplacian multiplies each octave by
          // its frequency squared, so the usual halving leaves the finest octave running
          // the whole picture — which is camouflage, not sunlight.
          let h =
            noise(wx + clock * 0.24, wy + clock * 0.15) +
            noise(rx * 2.1 - clock * 0.33, ry * 2.1 + clock * 0.21) * 0.13 +
            noise(sx * 4.1 + clock * 0.44, sy * 4.1 - clock * 0.29) * 0.025;
          if (rings.length) {
            const px = x * SURFACE;
            const py = y * SURFACE;
            for (const ring of rings) {
              const t = ring.age / RING_LIFE;
              const front = ring.age * 190 * box.scale;
              const d = Math.hypot(px - ring.x, py - ring.y);
              const off = d - front;
              if (off > 46 || off < -70) continue;
              // A crest that outruns the trough behind it, fading as it spreads.
              const env = Math.exp(-(off * off) / 900) * (1 - t) * (1 - t) * ring.force;
              h += Math.cos(off * 0.1) * env * 0.85;
            }
          }
          height[y * cols + x] = h;
        }
      }
    };

    const causticLayer = () => {
      if (!caustic || !surfCtx) return;
      const data = caustic.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const l = height[i - (x > 0 ? 1 : 0)];
          const r = height[i + (x < cols - 1 ? 1 : 0)];
          const u = height[i - (y > 0 ? cols : 0)];
          const d = height[i + (y < rows - 1 ? cols : 0)];
          // Light focuses where the surface is concave, which is its laplacian — one
          // subtraction per cell, and it is the difference between caustics and stripes.
          // Light landing on the floor is the reciprocal of how much the surface
          // stretches it: bright where that stretch passes through zero and the beam
          // folds over itself, dark everywhere else. A ramp instead of a reciprocal is
          // what turns caustics into cloud.
          const fold = 1 + (l + r + u + d - 4 * height[i]) * FOLD;
          // Sheen off the surface itself, as distinct from light landing on the floor:
          // how steeply the water tilts, cubed so only the flank of a real wave shows and
          // the ambient swell stays dark.
          const tilt = (r - l) * (r - l) + (d - u) * (d - u);
          const sheen = Math.min(1, tilt * SHEEN);
          soft[i] = Math.min(1, FILAMENT / Math.abs(fold) + sheen * sheen * sheen * 0.75);
        }
      }
      // Smoothed here, on eleven thousand grid cells, rather than with ctx.filter on two
      // million canvas pixels — the same softness for about a hundredth of the frame.
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          // A full 3×3 rather than a plus: the diagonals are what stop a crest running
          // at an angle to the grid from breaking up into beads.
          const v =
            (soft[i] * 4 +
              (soft[i - 1] + soft[i + 1] + soft[i - cols] + soft[i + cols]) * 2 +
              soft[i - cols - 1] +
              soft[i - cols + 1] +
              soft[i + cols - 1] +
              soft[i + cols + 1]) /
            16;
          const at = i * 4;
          data[at] = 255;
          data[at + 1] = 255;
          data[at + 2] = 255;
          data[at + 3] = v > 1 ? 255 : Math.round(v * 255);
        }
      }
      surfCtx.putImageData(caustic, 0, 0);
    };

    /**
     * How far the surface tips at a point. Interpolated between cells, not snapped to the
     * nearest one: a fish drawn from a nearest-cell lookup jumps ten pixels sideways every
     * time it crosses a cell boundary, which is most of what looks unsmooth.
     */
    const slopeAt = (px: number, py: number) => {
      const gx = clamp(px / SURFACE, 1, cols - 2.001);
      const gy = clamp(py / SURFACE, 1, rows - 2.001);
      const x = Math.floor(gx);
      const y = Math.floor(gy);
      const fx = gx - x;
      const fy = gy - y;
      const at = (cx: number, cy: number) => {
        const i = cy * cols + cx;
        return { x: (height[i + 1] - height[i - 1]) * 0.5, y: (height[i + cols] - height[i - cols]) * 0.5 };
      };
      const a = at(x, y);
      const b = at(x + 1, y);
      const c = at(x, y + 1);
      const d = at(x + 1, y + 1);
      const top = { x: a.x + (b.x - a.x) * fx, y: a.y + (b.y - a.y) * fx };
      const bot = { x: c.x + (d.x - c.x) * fx, y: c.y + (d.y - c.y) * fx };
      return { x: top.x + (bot.x - top.x) * fy, y: top.y + (bot.y - top.y) * fy };
    };

    const step = (dt: number) => {
      clock += dt;

      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].age += dt;
        if (rings[i].age > RING_LIFE) rings.splice(i, 1);
      }
      buildSurface();
      causticLayer();
      for (let i = pellets.length - 1; i >= 0; i--) {
        const p = pellets[i];
        p.age += dt;
        p.x += Math.sin(clock * 0.6 + p.drift) * 5 * dt;
        p.y += Math.cos(clock * 0.5 + p.drift) * 4 * dt;
        if (p.age > PELLET_LIFE) pellets.splice(i, 1);
      }

      for (const k of koi) {
        const head = k.joints[0];
        k.spook = Math.max(0, k.spook - dt / 1.3);

        // Every influence is a weighted vote on which way to face, summed before anything
        // is applied. Steering on each in turn, as this first did, lets two of them fight
        // inside a single frame — which is what a shoal converging on one pellet does,
        // and it reads as the fish shaking.
        let wx = Math.cos(k.heading);
        let wy = Math.sin(k.heading);
        const vote = (angle: number, weight: number) => {
          wx += Math.cos(angle) * weight;
          wy += Math.sin(angle) * weight;
        };

        if (k.spook > 0) {
          vote(k.flee, 4.5 * k.spook);
        } else {
          const food = nearestPellet(k);
          if (food) {
            vote(Math.atan2(food.y - head.y, food.x - head.x), 1.7);
            if (Math.hypot(food.x - head.x, food.y - head.y) < k.size * 1.1) {
              pellets.splice(pellets.indexOf(food), 1);
              ripple(food.x, food.y, 0.32);
              eaten += 1;
            }
          } else {
            // A slow random walk on the turn rate, so a koi curves rather than jinking.
            k.wander = clamp(k.wander + (rand() - 0.5) * 3.4 * dt, -0.75, 0.75);
            vote(k.heading + k.wander, 0.9);
          }
        }

        // Keep out of each other's way — weak and short-range, or the shoal shears apart.
        for (const other of koi) {
          if (other === k) continue;
          const dx = head.x - other.joints[0].x;
          const dy = head.y - other.joints[0].y;
          const d = Math.hypot(dx, dy);
          const room = (k.size + other.size) * 2.4;
          if (d > 0.01 && d < room) vote(Math.atan2(dy, dx), (1 - d / room) * 1.6);
        }

        // The bank: the margin scales with the fish, so a big koi turns earlier.
        const margin = 70 * box.scale + k.size * 3;
        let bx = 0;
        let by = 0;
        if (head.x < margin) bx += (margin - head.x) / margin;
        if (head.x > box.w - margin) bx -= (head.x - (box.w - margin)) / margin;
        if (head.y < margin) by += (margin - head.y) / margin;
        if (head.y > box.h - margin) by -= (head.y - (box.h - margin)) / margin;
        if (bx !== 0 || by !== 0) vote(Math.atan2(by, bx), 3.2 * Math.min(1.4, Math.hypot(bx, by)));

        // One turn, capped. A fish cannot pivot faster than this however hard the votes
        // pull, which is the difference between a startled koi and a compass needle.
        const rate = (k.spook > 0 ? 3.6 : 1.9) * dt;
        k.heading += clamp(wrap(Math.atan2(wy, wx) - k.heading), -rate, rate);

        const burst = 1 + k.spook * 1.7;
        k.speed += (k.cruise * burst - k.speed) * Math.min(1, 3.4 * dt);

        // The head travels straight along its heading. Everything you read as swimming
        // happens behind it — drive the head sideways instead, as the first version did,
        // and the whole fish shimmies like a struck tuning fork.
        head.x = clamp(head.x + Math.cos(k.heading) * k.speed * dt, 4, box.w - 4);
        head.y = clamp(head.y + Math.sin(k.heading) * k.speed * dt, 4, box.h - 4);

        // The spine: each joint pulled to a fixed distance behind the last, and not
        // allowed to turn more than a quarter radian against it, so it cannot fold.
        let back = k.heading + Math.PI;
        const spine = k.facing;
        spine[0] = k.heading;
        for (let i = 1; i < JOINTS; i++) {
          const prev = k.joints[i - 1];
          const here = k.joints[i];
          const raw = Math.atan2(here.y - prev.y, here.x - prev.x);
          const ang = back + clamp(wrap(raw - back), -0.26, 0.26);
          here.x = prev.x + Math.cos(ang) * k.gap;
          here.y = prev.y + Math.sin(ang) * k.gap;
          spine[i] = ang + Math.PI;
          back = ang;
        }

        // The tail beat is not a chosen frequency: it is whatever fits about one wave
        // along the body at the speed the fish is going, which is why a startled koi
        // beats faster without anything saying so. Phase accumulates rather than being
        // read off the clock, so a change of speed bends the wave instead of snapping it.
        const span = k.gap * (JOINTS - 1);
        k.stroke += (k.speed / span) * k.waves * Math.PI * 2 * 1.15 * dt;
        const lag = (Math.PI * 2 * k.waves) / (JOINTS - 1);
        const swing = k.size * (0.95 + k.spook * 0.45);
        for (let i = 0; i < JOINTS; i++) {
          // Amplitude grows as the square of how far down the body you are: nothing at
          // the nose, about a fifth of a body length at the tail. That ratio is the
          // whole difference between a fish swimming and a worm wriggling.
          const along = i / (JOINTS - 1);
          const wave = Math.sin(k.stroke - i * lag) * swing * along * along;
          const side = spine[i] + Math.PI / 2;
          k.body[i].x = k.joints[i].x + Math.cos(side) * wave;
          k.body[i].y = k.joints[i].y + Math.sin(side) * wave;
        }
        // Facings come off the drawn body, not the spine, so fins and scales sit square
        // to the shape on screen rather than to the path it is following.
        k.facing[0] = Math.atan2(k.body[0].y - k.body[1].y, k.body[0].x - k.body[1].x);
        for (let i = 1; i < JOINTS; i++) {
          k.facing[i] = Math.atan2(k.body[i - 1].y - k.body[i].y, k.body[i - 1].x - k.body[i].x);
        }
      }
    };

    const bodyPath = (k: Koi, dx: number, dy: number) => {
      const c = new Path2D();
      const pts: Pt[] = [];
      const nose = k.body[0];
      pts.push({
        x: nose.x + Math.cos(k.facing[0]) * k.size * 0.55 + dx,
        y: nose.y + Math.sin(k.facing[0]) * k.size * 0.55 + dy,
      });
      for (let i = 0; i < JOINTS; i++) {
        const w = PROFILE[i] * k.size;
        const p = k.body[i];
        const perp = k.facing[i] + Math.PI / 2;
        pts.push({ x: p.x + Math.cos(perp) * w + dx, y: p.y + Math.sin(perp) * w + dy });
      }
      const tail = k.body[JOINTS - 1];
      pts.push({
        x: tail.x - Math.cos(k.facing[JOINTS - 1]) * k.size * 0.3 + dx,
        y: tail.y - Math.sin(k.facing[JOINTS - 1]) * k.size * 0.3 + dy,
      });
      for (let i = JOINTS - 1; i >= 0; i--) {
        const w = PROFILE[i] * k.size;
        const p = k.body[i];
        const perp = k.facing[i] - Math.PI / 2;
        pts.push({ x: p.x + Math.cos(perp) * w + dx, y: p.y + Math.sin(perp) * w + dy });
      }
      curve(c, pts);
      c.closePath();
      return c;
    };

    /**
     * The tail: two lobes and the notch between them, hung off the fourth joint from the
     * end and swung by the same stroke the body is riding, a beat late. A fin that moves
     * in time with the hips reads as a rudder rather than a tail.
     */
    const finPath = (k: Koi, dx: number, dy: number) => {
      const c = new Path2D();
      const wrist = k.body[JOINTS - 4];
      const tip = k.body[JOINTS - 1];
      const lag = Math.cos(k.stroke - 0.9);
      const dir = k.facing[JOINTS - 1] + lag * 0.26;
      const bx = Math.cos(dir);
      const by = Math.sin(dir);
      const px = Math.cos(dir + Math.PI / 2);
      const py = Math.sin(dir + Math.PI / 2);
      const len = k.size * 1.6;
      const spread = k.size * (0.85 + Math.abs(lag) * 0.2);
      const at = (along: number, across: number) => ({
        x: tip.x - bx * len * along + px * spread * across + dx,
        y: tip.y - by * len * along + py * spread * across + dy,
      });
      const start = { x: wrist.x + dx, y: wrist.y + dy };
      const up = at(1, 1);
      const down = at(1, -1);
      const notch = at(0.42, 0);
      const c1 = at(0.2, 0.5);
      const c2 = at(0.85, 0.72);
      const c3 = at(0.85, -0.72);
      const c4 = at(0.2, -0.5);
      c.moveTo(start.x, start.y);
      c.quadraticCurveTo(c1.x, c1.y, up.x, up.y);
      c.quadraticCurveTo(c2.x, c2.y, notch.x, notch.y);
      c.quadraticCurveTo(c3.x, c3.y, down.x, down.y);
      c.quadraticCurveTo(c4.x, c4.y, start.x, start.y);
      c.closePath();
      return { path: c, wrist: start, bx: (up.x + down.x) / 2, by: (up.y + down.y) / 2 };
    };

    const pectorals = (c: CanvasRenderingContext2D, k: Koi, ox: number, oy: number) => {
      const at = { x: k.body[2].x + ox, y: k.body[2].y + oy };
      const dir = k.facing[2];
      const flap = Math.cos(k.stroke * 2) * 0.3;
      for (const side of [1, -1]) {
        c.save();
        c.translate(at.x, at.y);
        c.rotate(dir + side * (1.05 + flap));
        c.beginPath();
        c.ellipse(0, 0, k.size * 0.62, k.size * 0.2, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    };

    const drawKoi = (k: Koi, ox = 0, oy = 0) => {
      const fin = finPath(k, ox, oy);
      const veil = ctx.createLinearGradient(fin.wrist.x, fin.wrist.y, fin.bx, fin.by);
      veil.addColorStop(0, rgba(k.base, 0.85));
      veil.addColorStop(1, rgba(k.base, 0.3));
      ctx.fillStyle = veil;
      ctx.fill(fin.path);
      ctx.fillStyle = rgba(k.base, 0.42);
      pectorals(ctx, k, ox, oy);

      const body = bodyPath(k, ox, oy);
      ctx.fillStyle = k.base;
      ctx.fill(body);

      ctx.save();
      ctx.clip(body);
      for (const mark of k.marks) {
        const i = Math.floor(mark.at);
        const p = k.body[i];
        const w = PROFILE[i] * k.size;
        const perp = k.facing[i] + Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(
          p.x + Math.cos(perp) * w * mark.lat + ox,
          p.y + Math.sin(perp) * w * mark.lat + oy,
          w * mark.r,
          w * mark.r * 0.85,
          k.facing[i],
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = k.ink[mark.tone] ?? k.ink[0];
        ctx.fill();
      }
      // Scales: an arc a scale, staggered row to row, at a tenth opacity. Individually
      // invisible; together they are the difference between a fish and a vinyl sticker.
      ctx.strokeStyle = "rgb(20 22 26 / 0.13)";
      ctx.lineWidth = Math.max(0.5, k.size * 0.07);
      for (let i = 1; i < JOINTS - 2; i++) {
        const p = k.body[i];
        const w = PROFILE[i] * k.size;
        const f = k.facing[i];
        const perp = f + Math.PI / 2;
        for (let c = -1; c <= 1; c++) {
          const across = ((c + (i % 2 ? 0.5 : 0)) / 1.5) * w;
          ctx.beginPath();
          ctx.arc(
            p.x + Math.cos(perp) * across + ox,
            p.y + Math.sin(perp) * across + oy,
            w * 0.34,
            f - 2.1,
            f + 2.1,
          );
          ctx.stroke();
        }
      }

      // A dark rim painted inside the outline: the cheapest way to give a flat fill a back.
      ctx.lineWidth = k.size * 0.85;
      ctx.strokeStyle = "rgb(8 14 18 / 0.22)";
      ctx.stroke(body);

      // Light off the shoulders, which is what stops a flat fill reading as a cut-out.
      const nose = { x: k.body[0].x + ox, y: k.body[0].y + oy };
      const sh = k.body[2];
      ctx.fillStyle = "rgb(255 255 255 / 0.13)";
      ctx.beginPath();
      ctx.ellipse(
        sh.x + ox,
        sh.y + oy,
        k.size * 2.6,
        k.size * 0.42,
        k.facing[2],
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = k.eye;
      for (const side of [1, -1]) {
        const perp = k.facing[0] + (Math.PI / 2) * side;
        ctx.beginPath();
        ctx.arc(
          nose.x + Math.cos(perp) * k.size * 0.4 + Math.cos(k.facing[0]) * k.size * 0.12,
          nose.y + Math.sin(perp) * k.size * 0.4 + Math.sin(k.facing[0]) * k.size * 0.12,
          k.size * 0.13,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    };

    const drawPad = (pad: Pad) => {
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.rotate(pad.turn);
      ctx.beginPath();
      // The notch is the whole reason it reads as a lily pad and not a green coin.
      ctx.arc(0, 0, pad.r, 0.32, Math.PI * 2 - 0.32);
      ctx.lineTo(0, 0);
      ctx.closePath();
      const [gr, gg, gb] = hex(house.green, "#3ecf8e");
      const [dr, dg, db] = hex(water.deep, "#06121b");
      // Blended most of the way into the water, or a pad reads as a sticker on the pond.
      ctx.fillStyle = `rgb(${Math.round(gr * 0.46 + dr * 0.54)} ${Math.round(
        gg * 0.46 + dg * 0.54,
      )} ${Math.round(gb * 0.46 + db * 0.54)})`;
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = rgba(house.green, 0.55);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#04140f";
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const a = 0.45 + (i / 6) * (Math.PI * 2 - 0.9);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * pad.r * 0.92, Math.sin(a) * pad.r * 0.92);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (pad.flower && pad.r > 30) {
        const petals = 7;
        ctx.fillStyle = "#f6e9ef";
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(a) * pad.r * 0.22,
            Math.sin(a) * pad.r * 0.22,
            pad.r * 0.26,
            pad.r * 0.12,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = house.amber;
        ctx.beginPath();
        ctx.arc(0, 0, pad.r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const draw = () => {
      if (!bctx) return;
      const bw = bed.width;
      const bh = bed.height;

      bctx.globalCompositeOperation = "source-over";
      bctx.globalAlpha = 1;
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(wash, 0, 0);

      if (surfCtx) {
        bctx.globalCompositeOperation = "lighter";
        const pale = water === WATER.light ? 0.4 : 1;
        // Twice: once wide for the glow the whole floor sits in, once tight for the web.
        bctx.globalAlpha = 0.14 * pale;
        bctx.drawImage(
          surface,
          (-SURFACE * 3) / BED,
          (-SURFACE * 3) / BED,
          (box.w + SURFACE * 8) / BED,
          (box.h + SURFACE * 8) / BED,
        );
        bctx.globalAlpha = 0.3 * pale;
        bctx.drawImage(
          surface,
          -SURFACE / BED,
          -SURFACE / BED,
          (box.w + SURFACE * 2) / BED,
          (box.h + SURFACE * 2) / BED,
        );
        bctx.globalCompositeOperation = "source-over";
      }

      if (sctx) {
        // Shadows a third of size, laid into the bed at half size: blurred twice over by
        // the two upscales, for no filter and no full-size pass.
        sctx.setTransform(1 / SHADE, 0, 0, 1 / SHADE, 0, 0);
        sctx.clearRect(0, 0, box.w, box.h);
        sctx.fillStyle = "#000";
        const drop = 6 * box.scale;
        for (const k of koi) sctx.fill(bodyPath(k, drop, drop * 1.3));
        bctx.globalAlpha = water === WATER.light ? 0.22 : 0.34;
        bctx.drawImage(shade, 0, 0, bw, bh);
        bctx.globalAlpha = 1;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bed, 0, 0, box.w, box.h);

      for (const p of pellets) {
        const fade = clamp(1 - (p.age - (PELLET_LIFE - 3)) / 3, 0, 1);
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = house.amber;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.3 * box.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const k of koi) {
        // Refraction, for the price of one lookup: the whole fish is shifted by how far
        // the water above it is tipped. Under a passing ring it swims out from under
        // itself, which is what looking into a pond actually does.
        const tip = slopeAt(k.joints[0].x, k.joints[0].y);
        drawKoi(k, tip.x * 34 * box.scale, tip.y * 34 * box.scale);
      }

      for (const pad of pads) drawPad(pad);
    };

    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      draw();
      if (Math.random() < 0.06) setStats({ koi: koi.length, eaten });
      frame = requestAnimationFrame(loop);
    };

    /** Held-still mode has no loop, so anything that changes the pond redraws it itself. */
    const nudge = (steps: number) => {
      if (!still) return;
      for (let i = 0; i < steps; i++) step(1 / 60);
      draw();
      setStats({ koi: koi.length, eaten });
    };

    readPalette();
    layout();
    if (still) {
      for (let i = 0; i < 420; i++) step(1 / 60);
      draw();
      setStats({ koi: koi.length, eaten });
    } else {
      frame = requestAnimationFrame(loop);
    }

    addRef.current = () => {
      if (koi.length >= MAX_KOI) return;
      const edge = rand() < 0.5;
      koi.push(
        spawn(edge ? 20 : rand() * box.w, edge ? rand() * box.h : 20),
      );
      setStats({ koi: koi.length, eaten });
      nudge(30);
    };
    feedRef.current = () => {
      for (let i = 0; i < 14; i++) {
        pellets.push({
          x: (0.12 + rand() * 0.76) * box.w,
          y: (0.12 + rand() * 0.76) * box.h,
          age: 0,
          drift: rand() * Math.PI * 2,
        });
      }
      nudge(45);
    };

    const onResize = () => {
      layout();
      if (still) draw();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(host);
    const theme = new MutationObserver(() => {
      readPalette();
      paintWash();
      if (still) draw();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const onDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ripple(x, y, 1);

      let hit: Koi | null = null;
      for (const k of koi) {
        for (let i = 0; i < JOINTS; i++) {
          const p = k.body[i];
          if (Math.hypot(p.x - x, p.y - y) < PROFILE[i] * k.size + 12) {
            hit = k;
            break;
          }
        }
        if (hit) break;
      }

      if (hit) {
        // The one you touched bolts, and so does anything close enough to have felt it —
        // a startled koi is the loudest thing in a pond and nothing near it ignores that.
        const wake = 150 * box.scale;
        for (const k of koi) {
          const d = Math.hypot(k.joints[0].x - x, k.joints[0].y - y);
          if (k !== hit && d > wake) continue;
          k.spook = k === hit ? 1 : 0.55 * (1 - d / wake);
          k.flee = Math.atan2(k.joints[0].y - y, k.joints[0].x - x);
          k.wander = 0;
        }
      } else {
        pellets.push({ x, y, age: 0, drift: rand() * Math.PI * 2 });
      }
      nudge(36);
    };
    canvas.addEventListener("pointerdown", onDown);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      addRef.current = null;
      feedRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Koi swimming in a sunlit pond. Tap the water to drop feed, or tap a koi to scare it."
        className="block h-full w-full cursor-pointer"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)",
        }}
      >
        <p className="label text-mute">
          {stats.koi} koi · {stats.eaten} pellets eaten · tap the water to feed, tap a koi to
          scare it
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={add}
            className="label rounded-full border px-4 py-2.5 transition-colors hover:border-[var(--accent)]"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--bg) 82%, transparent)",
              color: "var(--text)",
            }}
          >
            Another koi
          </button>
          <button
            type="button"
            onClick={feed}
            className="label rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Scatter feed
          </button>
        </div>
      </div>
    </div>
  );
}
