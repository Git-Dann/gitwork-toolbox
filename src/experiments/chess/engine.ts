/**
 * The opponent. Negamax with alpha-beta, a quiescence search so it does not stop counting
 * halfway through a trade, and iterative deepening against a time budget so a level is a
 * promise about how long it thinks rather than how deep it gets.
 *
 * Deliberately modest: this is a room experiment, not a rival for anything serious. It
 * plays a sound game, punishes hanging pieces, and loses to anyone who can actually play.
 */

import {
  type Colour,
  type Move,
  type Position,
  colourOf,
  fileOf,
  inCheck,
  legalMoves,
  makeMove,
  rankOf,
} from "./rules";

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/**
 * Piece-square tables, written from White's point of view and flipped for Black. They are
 * what stop it shuffling: without them every quiet move scores the same and it has no
 * reason to develop, castle or push a pawn.
 */
const TABLES: Record<string, number[]> = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10,-20,-20, 10, 10,  5,
      5, -5,-10,  0,  0,-10, -5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5,  5, 10, 25, 25, 10,  5,  5,
     10, 10, 20, 30, 30, 20, 10, 10,
     50, 50, 50, 50, 50, 50, 50, 50,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  5, 10, 10,  5,  0,  0,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      5, 10, 10, 10, 10, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
      0,  0,  5,  5,  5,  5,  0, -5,
     -5,  0,  5,  5,  5,  5,  0, -5,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
  ],
};

/** Centipawns, from the side-to-move's point of view. */
function evaluate(pos: Position): number {
  let score = 0;
  let bishops = { w: 0, b: 0 };
  for (let s = 0; s < 64; s++) {
    const piece = pos.board[s];
    if (!piece) continue;
    const kind = piece.toLowerCase();
    const white = colourOf(piece) === "w";
    // The tables are written from White's side, so Black reads them upside down.
    const table = TABLES[kind][white ? s : (7 - rankOf(s)) * 8 + fileOf(s)];
    const worth = VALUE[kind] + table;
    score += white ? worth : -worth;
    if (kind === "b") bishops[white ? "w" : "b"] += 1;
  }
  // The bishop pair is worth about a third of a pawn and no table can express it.
  if (bishops.w >= 2) score += 30;
  if (bishops.b >= 2) score -= 30;
  return pos.turn === "w" ? score : -score;
}

/** Most valuable victim, least valuable attacker — cheap ordering that prunes a lot. */
function order(moves: Move[]): Move[] {
  return moves
    .map((m) => {
      let rank = 0;
      if (m.captured) rank = 10 * VALUE[m.captured.toLowerCase()] - VALUE[m.piece.toLowerCase()];
      if (m.promo) rank += VALUE[m.promo.toLowerCase()];
      return { m, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .map((x) => x.m);
}

/**
 * Captures only, to a quiet position. Without this the search happily stops one ply after
 * giving its queen away and calls the position winning.
 */
function quiesce(pos: Position, alpha: number, beta: number, depth: number): number {
  const stand = evaluate(pos);
  if (depth === 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  for (const move of order(legalMoves(pos).filter((m) => m.captured || m.promo))) {
    const score = -quiesce(makeMove(pos, move), -beta, -alpha, depth - 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(pos: Position, depth: number, alpha: number, beta: number, deadline: number): number {
  if (depth === 0) return quiesce(pos, alpha, beta, 4);
  const moves = legalMoves(pos);
  if (moves.length === 0) {
    // Mate scored by distance, so it prefers the quickest one and delays its own.
    return inCheck(pos) ? -100000 + (10 - depth) : 0;
  }
  for (const move of order(moves)) {
    if (performance.now() > deadline) break;
    const score = -search(makeMove(pos, move), depth - 1, -beta, -alpha, deadline);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

export type Level = { name: string; label: string; ms: number; depth: number; blunder: number; rating: number };

/**
 * Levels are a time budget and a slip rate, not a depth alone. The lower two deliberately
 * pick a worse move some of the time — an engine that is simply shallow still never hangs
 * a queen, which makes it a frustrating beginner opponent rather than an easy one.
 */
export const LEVELS: Level[] = [
  { name: "casual", label: "Casual", ms: 60, depth: 2, blunder: 0.3, rating: 800 },
  { name: "club", label: "Club", ms: 220, depth: 3, blunder: 0.12, rating: 1200 },
  { name: "strong", label: "Strong", ms: 700, depth: 4, blunder: 0.03, rating: 1600 },
  { name: "ruthless", label: "Ruthless", ms: 1800, depth: 5, blunder: 0, rating: 2000 },
];

export type Think = { move: Move; score: number; depth: number; nodes: number; ms: number };

/** Iterative deepening: always has a move to play when the clock runs out. */
export function bestMove(pos: Position, level: Level, pick = Math.random): Think | null {
  const moves = legalMoves(pos);
  if (moves.length === 0) return null;
  const began = performance.now();
  const deadline = began + level.ms;

  let best = moves[0];
  let bestScore = -Infinity;
  let reached = 0;

  for (let depth = 1; depth <= level.depth; depth++) {
    let alpha = -Infinity;
    let localBest = best;
    let finished = true;
    for (const move of order(moves)) {
      if (performance.now() > deadline) {
        finished = false;
        break;
      }
      const score = -search(makeMove(pos, move), depth - 1, -Infinity, -alpha, deadline);
      if (score > alpha) {
        alpha = score;
        localBest = move;
      }
    }
    // A half-finished depth is worse than the full one below it, so only keep it if it
    // completed — otherwise the move comes from whichever branches happened to fit.
    if (finished) {
      best = localBest;
      bestScore = alpha;
      reached = depth;
    }
    if (performance.now() > deadline) break;
  }

  if (level.blunder > 0 && pick() < level.blunder && moves.length > 1) {
    const others = moves.filter((m) => m !== best);
    best = others[Math.floor(pick() * others.length)] ?? best;
    bestScore = 0;
  }

  return { move: best, score: bestScore, depth: reached, nodes: moves.length, ms: performance.now() - began };
}
