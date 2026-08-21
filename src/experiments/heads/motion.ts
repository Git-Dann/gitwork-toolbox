import type { Dna } from "./dna";
import { clamp, rng, span, type Rand } from "./rng";

/**
 * What the head is currently doing. Deliberately separate from the DNA: the drawing style
 * reads this rather than working any of it out, so a second style can be written without
 * reimplementing blinks and saccades.
 */
export type Motion = {
  yaw: number;
  pitch: number;
  yawTo: number;
  pitchTo: number;
  nextTurn: number;
  /** 0 open, 1 shut. */
  lid: number;
  blinkAt: number;
  blinkFor: number;
  nextBlink: number;
  doubleBlink: boolean;
  gazeX: number;
  gazeY: number;
  gazeToX: number;
  gazeToY: number;
  nextSaccade: number;
  mouth: number;
  mouthTo: number;
  nextMouth: number;
  t: number;
  rand: Rand;
};

export function motionFromSeed(seed: number, dna: Dna): Motion {
  const rand = rng(seed * 40503 + 7);
  return {
    yaw: dna.restYaw,
    pitch: dna.restPitch,
    yawTo: dna.restYaw,
    pitchTo: dna.restPitch,
    // Staggered from the start, or nine heads turn in unison and the sheet looks mechanical.
    nextTurn: span(rand, 0, 4),
    lid: 0,
    blinkAt: -1,
    blinkFor: 0.16,
    nextBlink: span(rand, 0.5, 6),
    doubleBlink: false,
    gazeX: 0,
    gazeY: 0,
    gazeToX: 0,
    gazeToY: 0,
    nextSaccade: span(rand, 0, 2),
    mouth: 0,
    mouthTo: 0,
    nextMouth: span(rand, 3, 14),
    t: 0,
    rand,
  };
}

/** Exponential ease that behaves the same at 30fps as at 120. */
const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

/**
 * One frame. `look` is where the pointer is in head space for this head, or null when it
 * is not over the sheet — the heads watch the cursor, which is most of the charm.
 */
export function step(m: Motion, dna: Dna, dt: number, look: { x: number; y: number } | null) {
  m.t += dt;
  const life = dna.liveliness;

  if (look) {
    // Track the pointer: the eyes go first and the head follows part of the way, which is
    // what makes it read as attention rather than as a puppet.
    m.gazeToX = clamp(look.x * 0.9, -1, 1);
    m.gazeToY = clamp(look.y * 0.7, -1, 1);
    m.yawTo = clamp(look.x * 0.3, -0.36, 0.36) + dna.restYaw * 0.4;
    m.pitchTo = clamp(look.y * 0.14, -0.14, 0.16);
    m.nextSaccade = m.t + 0.4;
    m.nextTurn = m.t + 1.2;
  } else {
    if (m.t > m.nextTurn) {
      m.yawTo = dna.restYaw + span(m.rand, -0.34, 0.34) * life;
      m.pitchTo = dna.restPitch + span(m.rand, -0.1, 0.12) * life;
      m.nextTurn = m.t + span(m.rand, 1.8, 6.5) / (0.5 + life);
    }
    if (m.t > m.nextSaccade) {
      m.gazeToX = span(m.rand, -1, 1) * 0.85;
      m.gazeToY = span(m.rand, -0.7, 0.8);
      m.nextSaccade = m.t + span(m.rand, 0.5, 3.2) / (0.5 + life);
    }
  }

  m.yaw = approach(m.yaw, m.yawTo, 1.6, dt);
  m.pitch = approach(m.pitch, m.pitchTo, 1.6, dt);
  // Saccades are ballistic — the eye snaps, it does not drift.
  m.gazeX = approach(m.gazeX, m.gazeToX, 18, dt);
  m.gazeY = approach(m.gazeY, m.gazeToY, 18, dt);

  if (m.blinkAt < 0 && m.t > m.nextBlink) {
    m.blinkAt = m.t;
    m.blinkFor = span(m.rand, 0.12, 0.2);
    m.doubleBlink = m.rand() < 0.18;
  }
  if (m.blinkAt >= 0) {
    const phase = (m.t - m.blinkAt) / m.blinkFor;
    if (phase >= 1) {
      m.lid = 0;
      m.blinkAt = -1;
      // A double blink is the same movement again straight away, not a longer one.
      m.nextBlink = m.t + (m.doubleBlink ? 0.14 : span(m.rand, 2.2, 8) / (0.4 + life));
      m.doubleBlink = false;
    } else {
      // Shuts faster than it opens, like an eyelid.
      m.lid = phase < 0.4 ? phase / 0.4 : 1 - (phase - 0.4) / 0.6;
    }
  }

  if (m.t > m.nextMouth) {
    m.mouthTo = m.rand() < 0.5 ? span(m.rand, 0.15, 0.55) : 0;
    m.nextMouth = m.t + span(m.rand, 0.4, 5) / (0.4 + life);
  }
  m.mouth = approach(m.mouth, m.mouthTo, 7, dt);
}
