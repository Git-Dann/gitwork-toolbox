"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Colour,
  type Move,
  type Outcome,
  type Position,
  colourOf,
  fileOf,
  inCheck,
  kingSquare,
  legalMoves,
  makeMove,
  nameOf,
  outcome,
  positionKey,
  rankOf,
  startPosition,
  toSAN,
} from "@/experiments/chess/rules";
import { LEVELS, type Level } from "@/experiments/chess/engine";
import { Piece } from "@/experiments/chess/pieces";

type Control = { name: string; label: string; ms: number; inc: number };
const CONTROLS: Control[] = [
  { name: "bullet", label: "Bullet 1+0", ms: 60_000, inc: 0 },
  { name: "blitz", label: "Blitz 3+2", ms: 180_000, inc: 2_000 },
  { name: "rapid", label: "Rapid 10+5", ms: 600_000, inc: 5_000 },
  { name: "none", label: "No clock", ms: 0, inc: 0 },
];

type Game = {
  at: number;
  level: string;
  control: string;
  result: "win" | "loss" | "draw";
  reason: string;
  plies: number;
  before: number;
  after: number;
  opponent: number;
};

const STORE = "gitwork.chess";
const START_RATING = 1200;
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Standard Elo. K of 24 moves a rating fast enough to feel responsive over a lunch hour. */
const elo = (player: number, opponent: number, score: number) => {
  const expected = 1 / (1 + 10 ** ((opponent - player) / 400));
  return Math.round(player + 24 * (score - expected));
};

const clockText = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 100) / 10);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return ms < 10_000 && ms > 0
    ? `${m}:${s.toFixed(1).padStart(4, "0")}`
    : `${m}:${String(Math.floor(s)).padStart(2, "0")}`;
};

export function Chess() {
  const [level, setLevel] = useState<Level>(LEVELS[1]);
  const [control, setControl] = useState<Control>(CONTROLS[1]);
  const [side, setSide] = useState<Colour>("w");
  const [flipped, setFlipped] = useState(false);

  const [pos, setPos] = useState<Position>(startPosition);
  const [keys, setKeys] = useState<string[]>(() => [positionKey(startPosition())]);
  const [moves, setMoves] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [last, setLast] = useState<Move | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [promoting, setPromoting] = useState<{ from: number; to: number } | null>(null);
  const [result, setResult] = useState<{ text: string; score: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [clocks, setClocks] = useState({ w: control.ms, b: control.ms });

  const [rating, setRating] = useState(START_RATING);
  const [games, setGames] = useState<Game[]>([]);
  const [tab, setTab] = useState<"moves" | "record">("moves");

  const worker = useRef<Worker | null>(null);
  const ask = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw) as { rating: number; games: Game[] };
        if (typeof saved.rating === "number") setRating(saved.rating);
        if (Array.isArray(saved.games)) setGames(saved.games);
      }
    } catch {
      // A cleared or blocked store just means a fresh rating.
    }
  }, []);

  useEffect(() => {
    const w = new Worker(new URL("../../experiments/chess/worker.ts", import.meta.url));
    worker.current = w;
    return () => w.terminate();
  }, []);

  const legal = useMemo(() => legalMoves(pos), [pos]);
  const movesFrom = useMemo(
    () => (picked === null ? [] : legal.filter((m) => m.from === picked)),
    [legal, picked],
  );
  const checked = useMemo(() => (inCheck(pos) ? kingSquare(pos.board, pos.turn) : -1), [pos]);

  const edge = useMemo(() => {
    let n = 0;
    for (const p of taken) n += (colourOf(p) === "b" ? 1 : -1) * (VALUE[p.toLowerCase()] ?? 0);
    return n;
  }, [taken]);

  const finish = useCallback(
    (text: string, score: number) => {
      setResult({ text, score });
      setThinking(false);
      setRating((before) => {
        const after = elo(before, level.rating, score);
        const game: Game = {
          at: Date.now(),
          level: level.label,
          control: control.label,
          result: score === 1 ? "win" : score === 0 ? "loss" : "draw",
          reason: text,
          plies: posRef.current.full * 2,
          before,
          after,
          opponent: level.rating,
        };
        setGames((old) => {
          const next = [game, ...old].slice(0, 50);
          try {
            localStorage.setItem(STORE, JSON.stringify({ rating: after, games: next }));
          } catch {
            // Nothing to do; the game still finished.
          }
          return next;
        });
        return after;
      });
    },
    [control.label, level.label, level.rating],
  );

  const settle = useCallback(
    (next: Position, nextKeys: string[]) => {
      const o: Outcome = outcome(next, nextKeys);
      if (o.kind === "playing") return false;
      if (o.kind === "checkmate") {
        const won = o.winner === side;
        finish(won ? "Checkmate — you win" : "Checkmate — you lose", won ? 1 : 0);
      } else {
        const reason =
          o.kind === "stalemate" ? "Stalemate"
          : o.kind === "fifty" ? "Draw — fifty-move rule"
          : o.kind === "repetition" ? "Draw — threefold repetition"
          : "Draw — insufficient material";
        finish(reason, 0.5);
      }
      return true;
    },
    [finish, side],
  );

  const play = useCallback(
    (move: Move) => {
      const before = posRef.current;
      const san = toSAN(before, move, legalMoves(before));
      const next = makeMove(before, move);
      const nextKeys = [...keysRef.current, positionKey(next)];
      keysRef.current = nextKeys;
      setPos(next);
      setKeys(nextKeys);
      setMoves((m) => [...m, san]);
      setLast(move);
      setPicked(null);
      if (move.captured) setTaken((t) => [...t, move.captured as string]);
      setClocks((c) =>
        control.ms === 0 ? c : { ...c, [before.turn]: c[before.turn] + control.inc },
      );
      settle(next, nextKeys);
    },
    [control.inc, control.ms, settle],
  );

  const keysRef = useRef(keys);
  keysRef.current = keys;

  // The engine's turn. Asked in an effect rather than inside play(), so a human move and
  // the reply it triggers are two separate renders and the board never skips a frame.
  useEffect(() => {
    if (result || promoting || pos.turn === side || !worker.current) return;
    const id = ++ask.current;
    setThinking(true);
    const w = worker.current;
    const onReply = (event: MessageEvent<{ id: number; move: { move: Move } | null }>) => {
      if (event.data.id !== id) return;
      w.removeEventListener("message", onReply);
      setThinking(false);
      if (event.data.move && !resultRef.current) play(event.data.move.move);
    };
    w.addEventListener("message", onReply);
    w.postMessage({ id, pos, level: level.name });
    return () => w.removeEventListener("message", onReply);
  }, [level.name, play, pos, promoting, result, side]);

  // The clock. Ticks on the side to move and only while a real game is running.
  useEffect(() => {
    if (control.ms === 0 || result || moves.length === 0) return;
    const turn = pos.turn;
    const started = performance.now();
    const from = clocks[turn];
    const id = window.setInterval(() => {
      const left = from - (performance.now() - started);
      setClocks((c) => ({ ...c, [turn]: Math.max(0, left) }));
      if (left <= 0) {
        window.clearInterval(id);
        const lost = turn === side;
        finish(lost ? "Flagged — you lose on time" : "Flagged — engine loses on time", lost ? 0 : 1);
      }
    }, 100);
    return () => window.clearInterval(id);
    // clocks is deliberately not a dependency: it is the thing being written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control.ms, finish, moves.length, pos.turn, result, side]);

  const reset = useCallback(
    (nextSide: Colour = side, nextControl: Control = control) => {
      ask.current += 1;
      const fresh = startPosition();
      posRef.current = fresh;
      keysRef.current = [positionKey(fresh)];
      setPos(fresh);
      setKeys(keysRef.current);
      setMoves([]);
      setTaken([]);
      setLast(null);
      setPicked(null);
      setPromoting(null);
      setResult(null);
      setThinking(false);
      setSide(nextSide);
      setFlipped(nextSide === "b");
      setControl(nextControl);
      setClocks({ w: nextControl.ms, b: nextControl.ms });
    },
    [control, side],
  );

  const onSquare = (square: number) => {
    if (result || promoting || thinking || pos.turn !== side) return;
    const move = movesFrom.find((m) => m.to === square);
    if (move) {
      if (move.promo) setPromoting({ from: move.from, to: move.to });
      else play(move);
      return;
    }
    const piece = pos.board[square];
    setPicked(piece && colourOf(piece) === pos.turn ? square : null);
  };

  const order = useMemo(() => {
    const squares: number[] = [];
    for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) squares.push(r * 8 + f);
    return flipped ? squares.slice().reverse() : squares;
  }, [flipped]);

  const record = useMemo(() => {
    const w = games.filter((g) => g.result === "win").length;
    const d = games.filter((g) => g.result === "draw").length;
    const l = games.filter((g) => g.result === "loss").length;
    const best = games.filter((g) => g.result === "win").sort((a, b) => b.opponent - a.opponent)[0];
    return { w, d, l, best };
  }, [games]);

  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]]);

  return (
    <div className="absolute inset-0 overflow-auto" style={{ background: "var(--bg)" }}>
      <div className="mx-auto flex min-h-full w-full max-w-[72rem] flex-col gap-5 p-5 pt-20 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <Clock
            who={side === "w" ? "Engine" : "Engine"}
            rating={level.rating}
            ms={clocks[side === "w" ? "b" : "w"]}
            live={pos.turn !== side && !result && moves.length > 0 && control.ms > 0}
            show={control.ms > 0}
            note={thinking ? "thinking" : undefined}
          />

          <div
            className="grid w-full max-w-[min(78vh,34rem)] select-none overflow-hidden rounded-[6px] shadow-[0_18px_50px_rgb(0_0_0/0.45)]"
            style={{ gridTemplateColumns: "repeat(8, 1fr)", aspectRatio: "1" }}
          >
            {order.map((square) => {
              const dark = (fileOf(square) + rankOf(square)) % 2 === 0;
              const target = movesFrom.find((m) => m.to === square);
              const piece = pos.board[square];
              const isLast = last && (last.from === square || last.to === square);
              return (
                <button
                  key={square}
                  type="button"
                  onClick={() => onSquare(square)}
                  aria-label={`${nameOf(square)}${piece ? `, ${piece}` : ""}`}
                  className="relative flex items-center justify-center"
                  style={{
                    background: dark ? "#6b7f6e" : "#e7e2d4",
                    cursor: pos.turn === side && !result ? "pointer" : "default",
                  }}
                >
                  {isLast ? (
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "rgb(226 184 61 / 0.34)" }}
                    />
                  ) : null}
                  {square === checked ? (
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle, rgb(255 90 80 / 0.85) 0%, rgb(255 90 80 / 0) 72%)",
                      }}
                    />
                  ) : null}
                  {picked === square ? (
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "rgb(226 184 61 / 0.45)" }}
                    />
                  ) : null}
                  {piece ? <Piece piece={piece} /> : null}
                  {target ? (
                    <span
                      className="pointer-events-none absolute"
                      style={
                        target.captured
                          ? {
                              inset: "4%",
                              borderRadius: "50%",
                              border: "4px solid rgb(20 20 24 / 0.35)",
                            }
                          : {
                              width: "26%",
                              height: "26%",
                              borderRadius: "50%",
                              background: "rgb(20 20 24 / 0.28)",
                            }
                      }
                    />
                  ) : null}
                  {fileOf(square) === (flipped ? 7 : 0) ? (
                    <span
                      className="pointer-events-none absolute left-[5%] top-[3%] text-[0.6rem] font-semibold"
                      style={{ color: dark ? "#e7e2d4" : "#6b7f6e" }}
                    >
                      {rankOf(square) + 1}
                    </span>
                  ) : null}
                  {rankOf(square) === (flipped ? 7 : 0) ? (
                    <span
                      className="pointer-events-none absolute bottom-[2%] right-[5%] text-[0.6rem] font-semibold"
                      style={{ color: dark ? "#e7e2d4" : "#6b7f6e" }}
                    >
                      {"abcdefgh"[fileOf(square)]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <Clock
            who="You"
            rating={rating}
            ms={clocks[side]}
            live={pos.turn === side && !result && moves.length > 0 && control.ms > 0}
            show={control.ms > 0}
            note={edge !== 0 ? `${edge > 0 ? "+" : ""}${edge}` : undefined}
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[22rem]">
          <div className="surface p-4">
            <p className="label mb-2 text-mute">Your rating</p>
            <p className="font-display text-4xl leading-none">{rating}</p>
            <p className="label mt-2 text-mute">
              {record.w}W · {record.d}D · {record.l}L
              {record.best ? ` · best win ${record.best.opponent}` : ""}
            </p>
          </div>

          <div className="surface overflow-hidden">
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {(["moves", "record"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="label flex-1 px-3 py-2.5 transition-colors"
                  style={{
                    background: tab === t ? "var(--accent-wash)" : undefined,
                    color: tab === t ? "var(--accent-soft)" : "var(--text-mute)",
                  }}
                >
                  {t === "moves" ? "Moves" : "Leaderboard"}
                </button>
              ))}
            </div>

            {tab === "moves" ? (
              <div className="max-h-[15rem] overflow-auto p-1 font-mono text-[0.78rem]">
                {pairs.length === 0 ? (
                  <p className="p-3 text-mute">No moves yet.</p>
                ) : (
                  pairs.map(([white, black], i) => (
                    <div key={i} className="flex gap-2 px-2 py-1">
                      <span className="w-7 shrink-0 text-mute">{i + 1}.</span>
                      <span className="w-20">{white}</span>
                      <span className="w-20">{black ?? ""}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="max-h-[15rem] overflow-auto">
                {games.length === 0 ? (
                  <p className="p-3 text-sm text-mute">Nothing played yet.</p>
                ) : (
                  games.map((g) => (
                    <div
                      key={g.at}
                      className="flex items-center gap-2 border-b px-3 py-2 text-xs last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span
                        className="w-10 shrink-0 font-semibold"
                        style={{
                          color:
                            g.result === "win" ? "var(--color-green)"
                            : g.result === "loss" ? "var(--color-flag)"
                            : "var(--text-mute)",
                        }}
                      >
                        {g.result === "win" ? "Won" : g.result === "loss" ? "Lost" : "Drew"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-soft">
                        {g.level} · {g.control}
                      </span>
                      <span className="shrink-0 font-mono text-mute">
                        {g.after >= g.before ? "+" : ""}
                        {g.after - g.before}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="surface flex flex-col gap-3 p-4">
            <div>
              <p className="label mb-1.5 text-mute">Opponent</p>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.name}
                    type="button"
                    onClick={() => setLevel(l)}
                    className="label rounded-full border px-3 py-1.5 transition-colors"
                    style={{
                      borderColor: l.name === level.name ? "var(--accent)" : "var(--border)",
                      color: l.name === level.name ? "var(--accent-soft)" : "var(--text-mute)",
                    }}
                  >
                    {l.label} {l.rating}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-1.5 text-mute">Clock</p>
              <div className="flex flex-wrap gap-1.5">
                {CONTROLS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => reset(side, c)}
                    className="label rounded-full border px-3 py-1.5 transition-colors"
                    style={{
                      borderColor: c.name === control.name ? "var(--accent)" : "var(--border)",
                      color: c.name === control.name ? "var(--accent-soft)" : "var(--text-mute)",
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => reset(side === "w" ? "b" : "w")}
                className="label rounded-full border px-4 py-2.5"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Play {side === "w" ? "black" : "white"}
              </button>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="label rounded-full border px-4 py-2.5"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Flip
              </button>
              {!result && moves.length > 0 ? (
                <button
                  type="button"
                  onClick={() => finish("You resigned", 0)}
                  className="label rounded-full border px-4 py-2.5"
                  style={{ borderColor: "var(--border)", color: "var(--color-flag)" }}
                >
                  Resign
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => reset()}
                className="label rounded-full px-4 py-2.5"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                New game
              </button>
            </div>
          </div>
        </aside>
      </div>

      {promoting ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgb(0 0 0 / 0.55)" }}>
          <div className="surface flex gap-2 p-3">
            {["q", "r", "b", "n"].map((k) => {
              const piece = side === "w" ? k.toUpperCase() : k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    const move = legal.find(
                      (m) => m.from === promoting.from && m.to === promoting.to && m.promo === piece,
                    );
                    setPromoting(null);
                    if (move) play(move);
                  }}
                  className="h-16 w-16 rounded-[4px]"
                  style={{ background: "#e7e2d4" }}
                >
                  <Piece piece={piece} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6" style={{ background: "rgb(0 0 0 / 0.6)" }}>
          <div className="surface max-w-sm p-6 text-center">
            <p className="font-display text-2xl">{result.text}</p>
            <p className="label mt-3 text-mute">
              Rating {rating} · {level.label} {level.rating}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="label mt-5 rounded-full px-5 py-2.5"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Play again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Clock({
  who, rating, ms, live, show, note,
}: {
  who: string; rating: number; ms: number; live: boolean; show: boolean; note?: string;
}) {
  return (
    <div className="flex w-full max-w-[min(78vh,34rem)] items-center justify-between gap-3">
      <p className="label truncate text-mute">
        {who} <span className="text-soft">{rating}</span>
        {note ? <span className="ml-2 text-mute">{note}</span> : null}
      </p>
      {show ? (
        <p
          className="rounded-[4px] px-3 py-1 font-mono text-lg tabular-nums transition-colors"
          style={{
            background: live ? "var(--text)" : "var(--bg-raised)",
            color: live ? "var(--bg)" : ms < 10_000 ? "var(--color-flag)" : "var(--text-soft)",
          }}
        >
          {clockText(ms)}
        </p>
      ) : null}
    </div>
  );
}
