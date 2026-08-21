/**
 * One seed in, the same head out, forever. Deterministic generation is the whole
 * trick of this experiment — a head is not stored anywhere, it is recomputed from
 * its number, so a sheet of nine costs nine integers.
 *
 * mulberry32: 32-bit, no dependencies, good enough spread for visual work.
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

/** A number in [min, max). */
export const span = (rand: Rand, min: number, max: number) => min + rand() * (max - min);

/** One of the options, uniformly. */
export const pick = <T>(rand: Rand, options: readonly T[]) =>
  options[Math.min(options.length - 1, Math.floor(rand() * options.length))];

/** True with probability p. */
export const chance = (rand: Rand, p: number) => rand() < p;

export const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hermite ease between two edges — used for chins, cheeks and lids. */
export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
