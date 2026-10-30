/**
 * The engine, off the main thread. Ruthless is allowed nearly two seconds to think, and a
 * two-second block on the UI thread stops the clock, drops the hover states and makes the
 * whole thing feel broken — which is the opposite of what a chess board should feel like.
 */

import { LEVELS } from "./engine";
import { bestMove } from "./engine";
import type { Position } from "./rules";

export type Ask = { id: number; pos: Position; level: string };
export type Reply = { id: number; move: ReturnType<typeof bestMove> };

self.onmessage = (event: MessageEvent<Ask>) => {
  const { id, pos, level } = event.data;
  const chosen = LEVELS.find((l) => l.name === level) ?? LEVELS[1];
  const move = bestMove(pos, chosen);
  (self as unknown as Worker).postMessage({ id, move } satisfies Reply);
};
