import { POINTS, silhouette, type Dna } from "./dna";
import type { Motion } from "./motion";
import { clamp } from "./rng";

export type Palette = {
  /** The line colour — the page's own text colour, so it flips with the theme. */
  ink: string;
  accent: string;
  faint: string;
  hollow: string;
};

export type Box = { x: number; y: number; w: number; h: number };

type Pt = [number, number];

/**
 * The style. It draws what the DNA and the Motion already say and works nothing out for
 * itself, so a second style could be dropped in beside this one.
 *
 * Everything is line art at one weight: no fills except the pupils and an open mouth, no
 * shading, no gradients. Faces read better as outlines than as anything more elaborate,
 * and it keeps nine of them inside a couple of milliseconds a frame.
 */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  m: Motion,
  box: Box,
  palette: Palette,
) {
  const s = Math.min(box.w / (2.7 * dna.width), box.h / (3.3 * dna.length));
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h * 0.46;
  const ink = dna.accent ? palette.accent : palette.ink;
  const lw = Math.max(0.9, s * 0.027 * dna.stroke);

  const turn = Math.sin(m.yaw);
  const nod = Math.sin(m.pitch);
  const cosYaw = Math.cos(m.yaw);
  const cosPitch = Math.cos(m.pitch);

  /**
   * A point on the face itself, treated as sitting on the front of a sphere. This is the
   * whole illusion: the features swing further than the silhouette does, which is exactly
   * what a turning head looks like.
   */
  const face = (u: number, v: number): Pt => {
    const z = Math.sqrt(Math.max(0, 1 - clamp(u * u * 1.25 + v * v * 0.7, 0, 1))) * 0.62;
    const x = u * cosYaw + z * turn;
    const y = v * cosPitch + z * nod;
    return [cx + x * s * dna.width, cy + y * s * dna.length];
  };

  // The silhouette barely changes shape as a head turns — it drifts and narrows a little,
  // and the near cheek fills out. Rotating its points would collapse it to a line.
  const outline: Pt[] = silhouette(dna).map(({ u, v }) => {
    const cheek = Math.max(0, 1 - Math.abs(v * 1.6)) * (u * turn > 0 ? 1 : 0.2);
    const du = turn * (0.15 + 0.07 * cheek) * (1 - 0.45 * Math.abs(u));
    return [
      cx + (u * (1 - 0.07 * Math.abs(turn)) + du) * s * dna.width,
      cy + (v + nod * 0.07) * s * dna.length,
    ];
  });

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;

  neck(ctx, dna, box, cx, cy, s, turn, lw);
  closedCurve(ctx, outline);
  ctx.stroke();

  const earR = outline[POINTS / 4];
  const earL = outline[(POINTS * 3) / 4];
  ears(ctx, dna, m, earL, earR, s, turn);
  hair(ctx, dna, outline, cx, cy, s, lw);

  const eyeV = -0.1;
  const eyes: { side: -1 | 1; at: Pt; ew: number; eh: number }[] = [-1, 1].map((raw) => {
    const side = raw as -1 | 1;
    const local = Math.asin(clamp(side * dna.eyeSpacing, -1, 1));
    // How square-on this eye is after the turn — the far one narrows, the near one does not.
    const fore = clamp(Math.abs(Math.cos(local + m.yaw)) / Math.cos(local), 0.25, 1.05);
    return {
      side,
      at: face(side * dna.eyeSpacing, eyeV),
      ew: dna.eyeSize * s * dna.width * 1.35 * fore,
      eh: dna.eyeSize * s * dna.length * (dna.eyeKind === "slit" ? 0.5 : 0.95),
    };
  });

  for (const eye of eyes) drawEye(ctx, dna, m, eye, palette, ink, lw);
  for (const eye of eyes) brow(ctx, dna, eye, eyeV, face, lw);
  nose(ctx, dna, eyeV, face, lw, s);
  mouth(ctx, dna, m, face, palette, ink, lw, s);
  if (dna.glasses) glasses(ctx, eyes, earL, earR, lw);

  ctx.restore();
}

/* ------------------------------------------------------------------- primitives */

/** A closed curve through the points, smoothed by drawing to the midpoints. */
function closedCurve(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const first = mid(pts[pts.length - 1], pts[0]);
  ctx.moveTo(first[0], first[1]);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
  }
  ctx.closePath();
}

const arc = (ctx: CanvasRenderingContext2D, a: Pt, c: Pt, b: Pt) => {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.stroke();
};

/* ------------------------------------------------------------------- features */

function neck(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  box: Box,
  cx: number,
  cy: number,
  s: number,
  turn: number,
  lw: number,
) {
  const top = cy + s * dna.length * 0.7;
  const bottom = box.y + box.h + lw;
  const half = s * dna.width * 0.29;
  const drift = turn * s * 0.09;
  ctx.lineWidth = lw * 0.9;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * half + drift * 0.6, top);
    ctx.bezierCurveTo(
      cx + side * half * 1.04 + drift,
      top + (bottom - top) * 0.4,
      cx + side * half * 1.7 + drift,
      bottom - (bottom - top) * 0.42,
      cx + side * s * 1.65 + drift * 0.4,
      bottom,
    );
    ctx.stroke();
  }
  ctx.lineWidth = lw;
}

function ears(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  m: Motion,
  left: Pt,
  right: Pt,
  s: number,
  turn: number,
) {
  for (const [side, at] of [
    [-1, left],
    [1, right],
  ] as [number, Pt][]) {
    // The ear on the side the face turns towards folds away out of sight.
    const show = clamp(1 - side * turn * 2.3, 0, 1.3);
    if (show < 0.22) continue;
    const r = dna.earSize * s * show;
    ctx.beginPath();
    ctx.ellipse(
      at[0],
      at[1],
      r * 0.8,
      r,
      0,
      -Math.PI / 2,
      Math.PI / 2,
      side < 0,
    );
    ctx.stroke();
  }
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  m: Motion,
  eye: { side: -1 | 1; at: Pt; ew: number; eh: number },
  palette: Palette,
  ink: string,
  lw: number,
) {
  const [x, y] = eye.at;
  const { ew, eh } = eye;
  const shut = m.lid;

  const upperLift =
    dna.eyeKind === "round" ? 2 : dna.eyeKind === "wide" ? 2.2 : dna.eyeKind === "slit" ? 0.9 : 1.7;
  const lowerDrop =
    dna.eyeKind === "round" ? 2 : dna.eyeKind === "wide" ? 1.4 : dna.eyeKind === "slit" ? 0.8 : 1.1;

  const lidY = y + eh * shut * 0.85;
  const lift = eh * upperLift * (1 - shut);

  if (shut > 0.93) {
    // Shut: one line, which is all a closed eye is.
    arc(ctx, [x - ew, y], [x, y + eh * 0.5], [x + ew, y]);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x - ew, lidY);
  ctx.quadraticCurveTo(x, lidY - lift, x + ew, lidY);
  ctx.quadraticCurveTo(x, y + eh * lowerDrop, x - ew, lidY);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  const pr = Math.min(ew, eh) * 0.46;
  const px = x + m.gazeX * Math.max(0, ew - pr * 0.8);
  const py = y + m.gazeY * eh * 0.55 + eh * 0.1;
  ctx.fillStyle = dna.accent ? palette.accent : palette.ink;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.stroke();

  if (dna.eyeKind === "hooded") {
    arc(ctx, [x - ew * 0.95, y - eh * 1.5], [x, y - eh * 2.5], [x + ew * 0.95, y - eh * 1.4]);
  }
}

function brow(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  eye: { side: -1 | 1; at: Pt; ew: number },
  eyeV: number,
  face: (u: number, v: number) => Pt,
  lw: number,
) {
  const u = eye.side * dna.eyeSpacing;
  const v = eyeV - dna.browLift;
  const spread = dna.eyeSize * 1.25;
  // Angle tilts the inner end against the outer one: the difference between worried,
  // level and unimpressed is about three degrees of brow.
  const inner = face(u - eye.side * spread, v + dna.browAngle * 0.05);
  const outer = face(u + eye.side * spread, v - dna.browAngle * 0.04);
  const peak = face(u, v - 0.035);
  ctx.lineWidth = lw * dna.browWeight;
  arc(ctx, inner, peak, outer);
  ctx.lineWidth = lw;
}

function nose(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  eyeV: number,
  face: (u: number, v: number) => Pt,
  lw: number,
  s: number,
) {
  const top = eyeV + 0.08;
  const tip = top + dna.noseLength;

  if (dna.noseKind === "hook") {
    const a = face(0.01, top);
    const b = face(0.02, tip);
    const c = face(-0.07, tip - 0.005);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(b[0] + s * 0.03, b[1] - s * 0.01, b[0], b[1]);
    ctx.quadraticCurveTo(b[0] - s * 0.02, b[1] + s * 0.03, c[0], c[1]);
    ctx.stroke();
    return;
  }
  if (dna.noseKind === "arc") {
    arc(ctx, face(-0.06, tip - 0.03), face(0, tip + 0.02), face(0.06, tip - 0.03));
    return;
  }
  if (dna.noseKind === "nostrils") {
    for (const side of [-1, 1]) {
      arc(
        ctx,
        face(side * 0.075, tip - 0.02),
        face(side * 0.055, tip + 0.015),
        face(side * 0.02, tip),
      );
    }
    return;
  }
  if (dna.noseKind === "ridge") {
    const a = face(0, top);
    const b = face(0, tip);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    arc(ctx, face(-0.055, tip), face(0, tip + 0.025), face(0.055, tip));
    return;
  }
  const c = face(0, tip);
  const r = s * 0.035;
  ctx.beginPath();
  ctx.arc(c[0], c[1], r, Math.PI * 0.15, Math.PI * 0.95);
  ctx.stroke();
}

function mouth(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  m: Motion,
  face: (u: number, v: number) => Pt,
  palette: Palette,
  ink: string,
  lw: number,
  s: number,
) {
  const v = dna.mouthDrop;
  const w = dna.mouthWidth * (dna.mouthKind === "wide" ? 1.25 : 1);
  const open = m.mouth;

  const curve =
    dna.mouthKind === "smile" ? 0.075 : dna.mouthKind === "frown" ? -0.055 : dna.mouthKind === "wide" ? 0.035 : 0.012;
  const skew = dna.mouthKind === "smirk" ? 0.035 : 0;

  const left = face(-w, v - skew);
  const right = face(w, v + skew * 0.4);
  const control = face(0, v + curve);

  if (open > 0.06) {
    // Open: the same top line with a floor under it, filled so it reads as a hollow.
    const floor = face(0, v + curve + 0.06 + open * 0.17);
    ctx.beginPath();
    ctx.moveTo(left[0], left[1]);
    ctx.quadraticCurveTo(control[0], control[1] - s * 0.02, right[0], right[1]);
    ctx.quadraticCurveTo(floor[0], floor[1], left[0], left[1]);
    ctx.closePath();
    ctx.fillStyle = palette.hollow;
    ctx.fill();
    ctx.stroke();
    return;
  }

  arc(ctx, left, control, right);
  if (dna.mouthKind === "wide") {
    for (const side of [-1, 1]) {
      const end = face(side * w, v + side * skew * 0.4);
      const tick = face(side * w * 0.95, v - 0.03);
      ctx.beginPath();
      ctx.moveTo(end[0], end[1]);
      ctx.lineTo(tick[0], tick[1]);
      ctx.stroke();
    }
  }
}

/**
 * Hair is drawn off the silhouette rather than off the head's nominal size, so it sits on
 * whatever skull the seed produced instead of floating above a tall one.
 */
function hair(
  ctx: CanvasRenderingContext2D,
  dna: Dna,
  outline: Pt[],
  cx: number,
  cy: number,
  s: number,
  lw: number,
) {
  if (dna.hairKind === "none") return;
  const at = (i: number) => outline[((i % POINTS) + POINTS) % POINTS];
  const out = (i: number, by: number): Pt => {
    const p = at(i);
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / len) * by, p[1] + (dy / len) * by];
  };
  const crown = at(0);

  ctx.lineWidth = lw * 0.9;
  const density = dna.hairDensity;

  if (dna.hairKind === "buzz") {
    for (let i = -20; i <= 20; i += 2) {
      const a = at(i);
      const b = out(i, s * (0.05 + 0.05 * density));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }

  if (dna.hairKind === "fringe") {
    const l = at(-15);
    const r = at(15);
    // A fringe crosses the forehead, so its control sits inside the skull, not above it.
    arc(ctx, l, [crown[0], crown[1] + s * (0.5 - 0.25 * density)], r);
    for (let i = -11; i <= 11; i += 11) {
      const a = at(i);
      const b = at(i + Math.sign(i || 1) * 3);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(a[0], (a[1] + b[1]) / 2, b[0], b[1] + s * 0.1);
      ctx.stroke();
    }
  }

  if (dna.hairKind === "tuft") {
    for (let k = -1; k <= 1; k++) {
      const i = k * 4;
      const a = at(i);
      const tipp = out(i, s * (0.16 + 0.16 * density));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(a[0] + s * 0.12 * k, a[1] - s * 0.16, tipp[0] + s * 0.06 * k, tipp[1]);
      ctx.stroke();
    }
  }

  if (dna.hairKind === "parted") {
    const l = at(-17);
    const r = at(17);
    arc(ctx, l, [crown[0] - s * 0.35, crown[1] + s * (0.34 - 0.2 * density)], r);
    const part = at(-6);
    ctx.beginPath();
    ctx.moveTo(part[0], part[1]);
    ctx.quadraticCurveTo(part[0] + s * 0.1, part[1] + s * 0.2, part[0] + s * 0.26, part[1] + s * 0.3);
    ctx.stroke();
  }

  if (dna.hairKind === "long") {
    for (const side of [-1, 1]) {
      const top = at(side * 13);
      const mid = at(side * 24);
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.quadraticCurveTo(
        mid[0] + side * s * 0.12,
        mid[1] + s * 0.4,
        mid[0] + side * s * 0.06,
        mid[1] + s * (0.9 + 0.4 * density),
      );
      ctx.stroke();
    }
    const l = at(-14);
    const r = at(14);
    arc(ctx, l, [crown[0], crown[1] + s * 0.3], r);
  }

  if (dna.hairKind === "curls") {
    for (let i = -18; i <= 18; i += 6) {
      const a = out(i, s * 0.05);
      const r = s * (0.07 + 0.05 * density);
      ctx.beginPath();
      ctx.arc(a[0], a[1], r, Math.PI * 0.85, Math.PI * 2.15);
      ctx.stroke();
    }
  }

  ctx.lineWidth = lw;
}

function glasses(
  ctx: CanvasRenderingContext2D,
  eyes: { side: -1 | 1; at: Pt; ew: number; eh: number }[],
  earL: Pt,
  earR: Pt,
  lw: number,
) {
  ctx.lineWidth = lw * 0.85;
  for (const eye of eyes) {
    const [x, y] = eye.at;
    const w = eye.ew * 1.7;
    const h = Math.max(eye.eh * 2.2, eye.ew * 0.9);
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.stroke();
    const ear = eye.side < 0 ? earL : earR;
    ctx.beginPath();
    ctx.moveTo(x + eye.side * w, y - h * 0.25);
    ctx.lineTo(ear[0], ear[1] - h * 0.1);
    ctx.stroke();
  }
  const [a, b] = eyes;
  ctx.beginPath();
  ctx.moveTo(a.at[0] + a.ew * 1.7, a.at[1]);
  ctx.lineTo(b.at[0] - b.ew * 1.7, b.at[1]);
  ctx.stroke();
  ctx.lineWidth = lw;
}
