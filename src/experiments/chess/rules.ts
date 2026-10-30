/**
 * Chess rules. Board is a plain 64-length array, a1 = 0 through h8 = 63, and a square
 * holds a one-letter piece — uppercase white, lowercase black — or an empty string.
 *
 * Nothing here knows about drawing or about the engine. It answers three questions: what
 * moves are legal, what the board looks like afterwards, and whether the game is over.
 */

export type Colour = "w" | "b";
export type Board = string[];

export type Move = {
  from: number;
  to: number;
  piece: string;
  captured?: string;
  /** The piece a pawn becomes, already in the right case. */
  promo?: string;
  /** Rook's from/to when this is a castle, so one move carries both pieces. */
  rook?: { from: number; to: number };
  /** The square a captured pawn actually stood on, which is not the square moved to. */
  epCapture?: number;
  double?: boolean;
};

export type Position = {
  board: Board;
  turn: Colour;
  /** KQkq, as a set of letters still available. */
  castling: string;
  /** The square a pawn may capture onto this move, or -1. */
  ep: number;
  /** Half-moves since the last capture or pawn move, for the fifty-move rule. */
  half: number;
  full: number;
};

export const FILES = "abcdefgh";
export const sq = (file: number, rank: number) => rank * 8 + file;
export const fileOf = (s: number) => s & 7;
export const rankOf = (s: number) => s >> 3;
export const nameOf = (s: number) => `${FILES[fileOf(s)]}${rankOf(s) + 1}`;
export const colourOf = (piece: string): Colour => (piece === piece.toUpperCase() ? "w" : "b");
export const other = (c: Colour): Colour => (c === "w" ? "b" : "w");

const BACK = ["R", "N", "B", "Q", "K", "B", "N", "R"];

export function startPosition(): Position {
  const board: Board = new Array(64).fill("");
  for (let f = 0; f < 8; f++) {
    board[sq(f, 0)] = BACK[f];
    board[sq(f, 1)] = "P";
    board[sq(f, 6)] = "p";
    board[sq(f, 7)] = BACK[f].toLowerCase();
  }
  return { board, turn: "w", castling: "KQkq", ep: -1, half: 0, full: 1 };
}

const KNIGHT_HOPS = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const DIAGONALS = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const STRAIGHTS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ALL_WAYS = [...DIAGONALS, ...STRAIGHTS];

const onBoard = (f: number, r: number) => f >= 0 && f < 8 && r >= 0 && r < 8;

/**
 * Does `by` attack this square? Asked of the king's square to find check, and of the two
 * squares a king crosses when castling. Deliberately does not generate moves — castling
 * legality depends on this, and generating moves to answer it would not terminate.
 */
export function attacks(board: Board, target: number, by: Colour): boolean {
  const tf = fileOf(target);
  const tr = rankOf(target);

  // Pawns capture forwards, so look backwards from the target to find them.
  const dir = by === "w" ? -1 : 1;
  for (const df of [-1, 1]) {
    const f = tf + df;
    const r = tr + dir;
    if (!onBoard(f, r)) continue;
    const p = board[sq(f, r)];
    if (p && colourOf(p) === by && p.toLowerCase() === "p") return true;
  }

  for (const [df, dr] of KNIGHT_HOPS) {
    const f = tf + df;
    const r = tr + dr;
    if (!onBoard(f, r)) continue;
    const p = board[sq(f, r)];
    if (p && colourOf(p) === by && p.toLowerCase() === "n") return true;
  }

  for (const [df, dr] of ALL_WAYS) {
    const straight = df === 0 || dr === 0;
    let f = tf + df;
    let r = tr + dr;
    let step = 1;
    while (onBoard(f, r)) {
      const p = board[sq(f, r)];
      if (p) {
        if (colourOf(p) === by) {
          const kind = p.toLowerCase();
          if (kind === "q") return true;
          if (straight && kind === "r") return true;
          if (!straight && kind === "b") return true;
          if (step === 1 && kind === "k") return true;
        }
        break;
      }
      f += df;
      r += dr;
      step += 1;
    }
  }
  return false;
}

export function kingSquare(board: Board, colour: Colour): number {
  const king = colour === "w" ? "K" : "k";
  return board.indexOf(king);
}

export function inCheck(pos: Position, colour: Colour = pos.turn): boolean {
  const king = kingSquare(pos.board, colour);
  return king >= 0 && attacks(pos.board, king, other(colour));
}

function pseudoMoves(pos: Position): Move[] {
  const { board, turn } = pos;
  const moves: Move[] = [];
  const push = (m: Move) => moves.push(m);

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || colourOf(piece) !== turn) continue;
    const kind = piece.toLowerCase();
    const f = fileOf(from);
    const r = rankOf(from);

    if (kind === "p") {
      const dir = turn === "w" ? 1 : -1;
      const last = turn === "w" ? 7 : 0;
      const start = turn === "w" ? 1 : 6;
      const ahead = sq(f, r + dir);
      if (onBoard(f, r + dir) && !board[ahead]) {
        if (r + dir === last) {
          for (const p of ["Q", "R", "B", "N"]) {
            push({ from, to: ahead, piece, promo: turn === "w" ? p : p.toLowerCase() });
          }
        } else {
          push({ from, to: ahead, piece });
          const two = sq(f, r + dir * 2);
          if (r === start && !board[two]) push({ from, to: two, piece, double: true });
        }
      }
      for (const df of [-1, 1]) {
        const cf = f + df;
        const cr = r + dir;
        if (!onBoard(cf, cr)) continue;
        const to = sq(cf, cr);
        const victim = board[to];
        if (victim && colourOf(victim) !== turn) {
          if (cr === last) {
            for (const p of ["Q", "R", "B", "N"]) {
              push({ from, to, piece, captured: victim, promo: turn === "w" ? p : p.toLowerCase() });
            }
          } else {
            push({ from, to, piece, captured: victim });
          }
        } else if (to === pos.ep && !victim) {
          // En passant: the pawn taken is beside you, not where you land.
          const grabbed = sq(cf, r);
          push({ from, to, piece, captured: board[grabbed], epCapture: grabbed });
        }
      }
      continue;
    }

    if (kind === "n" || kind === "k") {
      const hops = kind === "n" ? KNIGHT_HOPS : ALL_WAYS;
      for (const [df, dr] of hops) {
        const nf = f + df;
        const nr = r + dr;
        if (!onBoard(nf, nr)) continue;
        const to = sq(nf, nr);
        const victim = board[to];
        if (victim && colourOf(victim) === turn) continue;
        push({ from, to, piece, captured: victim || undefined });
      }
      continue;
    }

    const ways = kind === "b" ? DIAGONALS : kind === "r" ? STRAIGHTS : ALL_WAYS;
    for (const [df, dr] of ways) {
      let nf = f + df;
      let nr = r + dr;
      while (onBoard(nf, nr)) {
        const to = sq(nf, nr);
        const victim = board[to];
        if (victim && colourOf(victim) === turn) break;
        push({ from, to, piece, captured: victim || undefined });
        if (victim) break;
        nf += df;
        nr += dr;
      }
    }
  }

  // Castling. Three conditions people routinely get wrong: the king may not start in
  // check, may not pass through an attacked square, and the b-file square must be empty
  // for queenside even though the king never stands on it.
  const home = turn === "w" ? 0 : 7;
  const king = sq(4, home);
  if (board[king] && board[king].toLowerCase() === "k" && colourOf(board[king]) === turn) {
    const rights = turn === "w" ? ["K", "Q"] : ["k", "q"];
    const enemy = other(turn);
    if (pos.castling.includes(rights[0]) && !board[sq(5, home)] && !board[sq(6, home)]) {
      if (
        !attacks(board, king, enemy) &&
        !attacks(board, sq(5, home), enemy) &&
        !attacks(board, sq(6, home), enemy)
      ) {
        push({
          from: king,
          to: sq(6, home),
          piece: board[king],
          rook: { from: sq(7, home), to: sq(5, home) },
        });
      }
    }
    if (
      pos.castling.includes(rights[1]) &&
      !board[sq(3, home)] &&
      !board[sq(2, home)] &&
      !board[sq(1, home)]
    ) {
      if (
        !attacks(board, king, enemy) &&
        !attacks(board, sq(3, home), enemy) &&
        !attacks(board, sq(2, home), enemy)
      ) {
        push({
          from: king,
          to: sq(2, home),
          piece: board[king],
          rook: { from: sq(0, home), to: sq(3, home) },
        });
      }
    }
  }

  return moves;
}

export function makeMove(pos: Position, move: Move): Position {
  const board = pos.board.slice();
  board[move.from] = "";
  if (move.epCapture !== undefined) board[move.epCapture] = "";
  board[move.to] = move.promo ?? move.piece;
  if (move.rook) {
    board[move.rook.to] = board[move.rook.from];
    board[move.rook.from] = "";
  }

  // A rook that moves or is captured takes its castling right with it, and so does the
  // king for both of its own.
  let castling = pos.castling;
  const strip = (letters: string) => {
    for (const l of letters) castling = castling.replace(l, "");
  };
  const kind = move.piece.toLowerCase();
  if (kind === "k") strip(pos.turn === "w" ? "KQ" : "kq");
  if (kind === "r") {
    if (move.from === sq(0, 0)) strip("Q");
    if (move.from === sq(7, 0)) strip("K");
    if (move.from === sq(0, 7)) strip("q");
    if (move.from === sq(7, 7)) strip("k");
  }
  if (move.to === sq(0, 0)) strip("Q");
  if (move.to === sq(7, 0)) strip("K");
  if (move.to === sq(0, 7)) strip("q");
  if (move.to === sq(7, 7)) strip("k");

  return {
    board,
    turn: other(pos.turn),
    castling: castling || "-",
    ep: move.double ? (move.from + move.to) / 2 : -1,
    half: move.captured || kind === "p" ? 0 : pos.half + 1,
    full: pos.turn === "b" ? pos.full + 1 : pos.full,
  };
}

/** Pseudo-legal moves minus the ones that leave your own king in check. */
export function legalMoves(pos: Position): Move[] {
  const out: Move[] = [];
  for (const move of pseudoMoves(pos)) {
    const next = makeMove(pos, move);
    if (!inCheck(next, pos.turn)) out.push(move);
  }
  return out;
}

/** Everything but the move counters: two positions with the same key have repeated. */
export function positionKey(pos: Position): string {
  return `${pos.board.join("")}|${pos.turn}|${pos.castling}|${pos.ep}`;
}

function insufficientMaterial(board: Board): boolean {
  const left: string[] = [];
  for (const p of board) if (p && p.toLowerCase() !== "k") left.push(p);
  if (left.length === 0) return true;
  if (left.length === 1) return "nb".includes(left[0].toLowerCase());
  if (left.length === 2 && left.every((p) => p.toLowerCase() === "b")) {
    // Two bishops only draw if they are stuck on the same colour of square.
    const squares = board.reduce<number[]>((acc, p, i) => {
      if (p.toLowerCase() === "b") acc.push((fileOf(i) + rankOf(i)) % 2);
      return acc;
    }, []);
    return squares[0] === squares[1];
  }
  return false;
}

export type Outcome =
  | { kind: "playing" }
  | { kind: "checkmate"; winner: Colour }
  | { kind: "stalemate" }
  | { kind: "fifty" }
  | { kind: "repetition" }
  | { kind: "material" };

export function outcome(pos: Position, history: string[]): Outcome {
  if (legalMoves(pos).length === 0) {
    return inCheck(pos) ? { kind: "checkmate", winner: other(pos.turn) } : { kind: "stalemate" };
  }
  if (insufficientMaterial(pos.board)) return { kind: "material" };
  if (pos.half >= 100) return { kind: "fifty" };
  const key = positionKey(pos);
  let seen = 0;
  for (const k of history) if (k === key) seen += 1;
  if (seen >= 3) return { kind: "repetition" };
  return { kind: "playing" };
}

/**
 * Standard algebraic notation, including the disambiguation rules — a move needs its
 * file, or its rank, or both, only when another piece of the same kind could also go
 * there. Getting this wrong is invisible until two knights can reach one square.
 */
export function toSAN(pos: Position, move: Move, legal: Move[]): string {
  if (move.rook) {
    const text = fileOf(move.to) === 6 ? "O-O" : "O-O-O";
    return text + suffix(pos, move);
  }
  const kind = move.piece.toLowerCase();
  let text = "";
  if (kind === "p") {
    if (move.captured) text += FILES[fileOf(move.from)] + "x";
    text += nameOf(move.to);
    if (move.promo) text += `=${move.promo.toUpperCase()}`;
  } else {
    text += kind.toUpperCase();
    const rivals = legal.filter(
      (m) => m.to === move.to && m.from !== move.from && m.piece === move.piece,
    );
    if (rivals.length) {
      const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
      const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
      if (!sameFile) text += FILES[fileOf(move.from)];
      else if (!sameRank) text += String(rankOf(move.from) + 1);
      else text += nameOf(move.from);
    }
    if (move.captured) text += "x";
    text += nameOf(move.to);
  }
  return text + suffix(pos, move);
}

function suffix(pos: Position, move: Move): string {
  const next = makeMove(pos, move);
  if (!inCheck(next)) return "";
  return legalMoves(next).length === 0 ? "#" : "+";
}
