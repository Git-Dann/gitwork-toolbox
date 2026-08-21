import { chance, lerp, pick, rng, smoothstep, span } from "./rng";

/** Points around the silhouette. 96 is enough that the curve reads as smooth at 240px. */
export const POINTS = 96;

export type EyeKind = "almond" | "round" | "hooded" | "slit" | "wide" | "droop" | "upturned" | "dot";
export type NoseKind = "hook" | "arc" | "nostrils" | "ridge" | "button" | "broad" | "snub" | "long";
export type MouthKind = "line" | "smile" | "frown" | "smirk" | "wide" | "grin" | "pout" | "gap";
export type HairKind =
  | "none"
  | "buzz"
  | "fringe"
  | "tuft"
  | "parted"
  | "long"
  | "curls"
  | "bun"
  | "mohawk"
  | "receding"
  | "wavy"
  | "pigtails";
export type BeardKind = "none" | "stubble" | "moustache" | "goatee" | "full" | "chinstrap";
export type GlassesKind = "none" | "round" | "square";
export type ChinKind = "point" | "square" | "round";

const EYES: EyeKind[] = [
  "almond",
  "round",
  "hooded",
  "slit",
  "wide",
  "droop",
  "upturned",
  "dot",
];
const NOSES: NoseKind[] = ["hook", "arc", "nostrils", "ridge", "button", "broad", "snub", "long"];
const MOUTHS: MouthKind[] = ["line", "smile", "frown", "smirk", "wide", "grin", "pout", "gap"];
const HAIR: HairKind[] = [
  "none",
  "buzz",
  "fringe",
  "tuft",
  "parted",
  "long",
  "curls",
  "bun",
  "mohawk",
  "receding",
  "wavy",
  "pigtails",
];
const BEARDS: BeardKind[] = ["none", "stubble", "moustache", "goatee", "full", "chinstrap"];
const GLASSES: GlassesKind[] = ["none", "round", "square"];
const CHINS: ChinKind[] = ["point", "square", "round"];

// Most people are clean-shaven and most people are not wearing glasses, so these are
// drawn from weighted bags rather than uniformly — a sheet where half the heads have a
// full beard looks generated, which is the one thing it must not look.
const BEARD_BAG: BeardKind[] = [
  "none",
  "none",
  "none",
  "none",
  "none",
  "stubble",
  "moustache",
  "goatee",
  "full",
  "chinstrap",
];
const GLASSES_BAG: GlassesKind[] = ["none", "none", "none", "none", "none", "round", "square"];

/**
 * Who the head is: skull measurements, feature choice, resting pose, ink. Nothing here
 * changes over time — the DNA is fixed the moment the seed is known, and everything that
 * moves lives in Motion instead. Keeping the two apart is what lets a new drawing style
 * be written without reimplementing the animation.
 */
export type Dna = {
  seed: number;
  /** Silhouette. width and length scale the whole head; the rest shape it. */
  width: number;
  length: number;
  crown: number;
  jaw: number;
  chin: ChinKind;
  /** Per-point nudges around the outline, so no two skulls are the same curve. */
  wobble: number[];
  /** A fixed tilt of the whole head. Cheap, and worth more variety than it costs. */
  roll: number;
  /** How much of its cell this one fills. Not every head on a sheet is the same size. */
  scale: number;
  eyeSpacing: number;
  eyeSize: number;
  eyeKind: EyeKind;
  browLift: number;
  browAngle: number;
  browWeight: number;
  noseKind: NoseKind;
  noseLength: number;
  mouthKind: MouthKind;
  mouthWidth: number;
  mouthDrop: number;
  earSize: number;
  hairKind: HairKind;
  hairDensity: number;
  beard: BeardKind;
  glasses: GlassesKind;
  earring: boolean;
  collar: boolean;
  /** Roughly one in seven is inked in Gitwork violet rather than the page's own ink. */
  accent: boolean;
  stroke: number;
  restYaw: number;
  restPitch: number;
  /** How much this one moves. Some heads are twitchy, some barely shift. */
  liveliness: number;
};

export function dnaFromSeed(seed: number): Dna {
  const rand = rng(seed * 2654435761);

  const wobble: number[] = [];
  // Three harmonics rather than per-point noise: noise makes a lumpy potato, harmonics
  // make a face you would believe belongs to a person.
  const a1 = span(rand, -0.06, 0.06);
  const a2 = span(rand, -0.05, 0.05);
  const a3 = span(rand, -0.035, 0.035);
  const p1 = span(rand, 0, Math.PI * 2);
  const p2 = span(rand, 0, Math.PI * 2);
  const p3 = span(rand, 0, Math.PI * 2);
  for (let i = 0; i < POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2;
    wobble.push(a1 * Math.sin(2 * a + p1) + a2 * Math.sin(3 * a + p2) + a3 * Math.sin(5 * a + p3));
  }

  return {
    seed,
    width: span(rand, 0.8, 1.1),
    length: span(rand, 1, 1.42),
    crown: span(rand, 0, 0.3),
    jaw: span(rand, 0.52, 1.02),
    chin: pick(rand, CHINS),
    wobble,
    roll: span(rand, -0.1, 0.1),
    scale: span(rand, 0.84, 1),
    eyeSpacing: span(rand, 0.28, 0.44),
    eyeSize: span(rand, 0.085, 0.16),
    eyeKind: pick(rand, EYES),
    browLift: span(rand, 0.05, 0.19),
    browAngle: span(rand, -0.4, 0.36),
    browWeight: span(rand, 0.7, 2.1),
    noseKind: pick(rand, NOSES),
    noseLength: span(rand, 0.1, 0.28),
    mouthKind: pick(rand, MOUTHS),
    mouthWidth: span(rand, 0.12, 0.29),
    mouthDrop: span(rand, 0.28, 0.46),
    earSize: span(rand, 0.09, 0.21),
    hairKind: pick(rand, HAIR),
    hairDensity: span(rand, 0.4, 1),
    beard: pick(rand, BEARD_BAG),
    glasses: pick(rand, GLASSES_BAG),
    earring: chance(rand, 0.12),
    collar: chance(rand, 0.45),
    accent: chance(rand, 0.14),
    stroke: span(rand, 0.85, 1.55),
    restYaw: span(rand, -0.18, 0.18),
    restPitch: span(rand, -0.06, 0.08),
    liveliness: span(rand, 0.3, 1),
  };
}

/**
 * The silhouette in head space: (0,0) is the middle of the face, 1 is roughly half a head
 * wide, y runs down. Angle 0 is the crown and runs clockwise.
 */
export function silhouette(dna: Dna) {
  const points: { u: number; v: number }[] = [];
  for (let i = 0; i < POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2;
    const up = Math.cos(a);
    const side = Math.sin(a);
    let r = 1 + dna.wobble[i];

    if (up > 0) {
      // Cranium: widest just above the ear line, so the forehead does not balloon.
      r *= 1 + dna.crown * Math.sin(up * Math.PI) * 0.5 + dna.crown * up * 0.1;
    } else {
      const down = -up;
      // Jaw taper, then the chin itself over the bottom quarter.
      r *= 1 - (1 - dna.jaw) * Math.pow(down, 1.5);
      const tip = smoothstep(0.7, 1, down);
      if (dna.chin === "point") r *= lerp(1, 0.78, tip);
      if (dna.chin === "round") r *= lerp(1, 1.04, tip);
    }

    const u = side * r * dna.width;
    let v = -up * r * dna.length;
    // A square jaw is a flat bottom rather than a narrower one: clamp the chin and let
    // the sides carry the width.
    if (dna.chin === "square") v = Math.min(v, dna.length * 0.9);
    points.push({ u, v });
  }
  return points;
}

/** The counts quoted on the page, kept next to the lists so they cannot drift. */
export const VARIANTS = {
  eyes: EYES.length,
  noses: NOSES.length,
  mouths: MOUTHS.length,
  hair: HAIR.length,
  beards: BEARDS.length,
  glasses: GLASSES.length,
  chins: CHINS.length,
  points: POINTS,
  combinations:
    EYES.length *
    NOSES.length *
    MOUTHS.length *
    HAIR.length *
    BEARDS.length *
    GLASSES.length *
    CHINS.length *
    2,
};
