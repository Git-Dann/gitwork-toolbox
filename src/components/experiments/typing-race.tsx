"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoomLine } from "./room-data";

const BEST_KEY = "gitwork.typing.best";

/** Deterministic shuffle, so a session works through the lines rather than repeating. */
function order(count: number, seed: number) {
  const list = [...Array(count).keys()];
  let a = seed >>> 0;
  for (let i = list.length - 1; i > 0; i--) {
    a = (a * 1664525 + 1013904223) >>> 0;
    const j = a % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * A typing test whose corpus is the toolbox's own write-ups. The line is real copy from a
 * real entry, and the entry only gets named once you have typed it — which is the point:
 * you cannot race through it without reading it.
 *
 * Keys are read straight off the window rather than through a hidden input. An input
 * looked tidier but lost its caret mid-line — after an em dash the caret jumped to the
 * start and the rest of the sentence went in at the front — and a typing test cannot
 * afford to lose characters. The listener is capture-phase so the site's own `/` and `⌘K`
 * shortcuts do not fire while someone is mid-sentence; the trade is that there is no
 * on-screen keyboard on a phone, which this was never going to be played on.
 */
export function TypingRace({ lines }: { lines: RoomLine[] }) {
  /**
   * The shuffle seed is drawn after mounting, never during a render. Drawn in a render it
   * differs between the server pass and hydration, so the line on screen and the line
   * being compared against were two different sentences for the first instant — which is
   * exactly what it looked like: typing that could never come out right.
   */
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => setSeed(Math.floor(Math.random() * 100000) + 1), []);
  const sequence = useMemo(() => order(lines.length, seed ?? 1), [lines.length, seed]);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  /**
   * Keystrokes are counted in a ref, not from state. Fast typing fires several input
   * events inside one React batch, so a handler reading `typed` sees a stale value and
   * loses count — which showed up as 50% accuracy on a clean run.
   */
  const tally = useRef({ typed: "", keys: 0, misses: 0 });

  const line = lines[sequence[step % sequence.length]] ?? lines[0];
  const done = finishedAt !== null;

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(BEST_KEY));
      if (Number.isFinite(saved) && saved > 0) setBest(saved);
    } catch {
      /* private window, no best score */
    }
  }, []);

  // A live clock while typing, so the reading at the end is not the first number you see.
  useEffect(() => {
    if (startedAt === null || done) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => window.clearInterval(timer);
  }, [startedAt, done]);

  const reset = useCallback((next = false) => {
    tally.current = { typed: "", keys: 0, misses: 0 };
    setTyped("");
    setStartedAt(null);
    setFinishedAt(null);
    setKeystrokes(0);
    setMistakes(0);
    setElapsed(0);
    if (next) setStep((value) => value + 1);
  }, []);

  const apply = (next: string) => {
    if (done) return;
    if (startedAt === null && next.length > 0) setStartedAt(Date.now());
    // Only growth counts as a keystroke: backspacing is a correction, not an attempt.
    const previous = tally.current.typed;
    for (let at = previous.length; at < next.length; at++) {
      tally.current.keys += 1;
      if (next[at] !== line.text[at]) tally.current.misses += 1;
    }
    tally.current.typed = next;
    setKeystrokes(tally.current.keys);
    setMistakes(tally.current.misses);
    setTyped(next);
    if (next === line.text) {
      const at = Date.now();
      setFinishedAt(at);
      const minutes = (at - (startedAt ?? at)) / 60000;
      const wpm = minutes > 0 ? Math.round(line.text.length / 5 / minutes) : 0;
      setBest((current) => {
        if (current !== null && wpm <= current) return current;
        try {
          window.localStorage.setItem(BEST_KEY, String(wpm));
        } catch {
          /* nothing worth doing about it */
        }
        return wpm;
      });
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Leave the browser's and the site's own shortcuts alone.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Tab" || (event.key === "Enter" && finishedAt !== null)) {
        event.preventDefault();
        reset(true);
        return;
      }
      if (event.key === "Escape") return;
      if (event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        apply(tally.current.typed.slice(0, -1));
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      // Capture phase plus this: nothing else on the page sees the keystroke, so typing a
      // slash does not open the search palette mid-line.
      event.stopPropagation();
      apply(tally.current.typed + event.key);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const seconds = (finishedAt !== null ? finishedAt - (startedAt ?? finishedAt) : elapsed) / 1000;
  const wpm = seconds > 0 ? Math.round(line.text.length / 5 / (seconds / 60)) : 0;
  const liveWpm = seconds > 0 ? Math.round(typed.length / 5 / (seconds / 60)) : 0;
  const accuracy = keystrokes ? Math.round(((keystrokes - mistakes) / keystrokes) * 100) : 100;

  // One frame, before the seed exists. Rendering a line here would be the wrong line.
  if (seed === null) return <div className="absolute inset-0" />;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-3xl" aria-live="off">
        <p className="label mb-5 text-mute">
          {done ? "Done · Enter or Tab for another" : "Type it. Tab skips."}
        </p>
        <p className="font-mono text-xl leading-relaxed sm:text-2xl">
          {line.text.split("").map((char, index) => {
            const state =
              index >= typed.length ? "rest" : typed[index] === char ? "hit" : "miss";
            return (
              <span
                key={`${index}-${char}`}
                style={{
                  color:
                    state === "rest"
                      ? "var(--text-mute)"
                      : state === "hit"
                        ? "var(--text)"
                        : "var(--color-flag)",
                  textDecoration: state === "miss" ? "underline" : undefined,
                  // The caret is a background on the next character, so it never shifts
                  // the line as it moves.
                  background:
                    index === typed.length && !done ? "var(--accent)" : undefined,
                  borderRadius: 2,
                }}
              >
                {char}
              </span>
            );
          })}
        </p>
      </div>

      {done ? (
        <div className="mt-8 w-full max-w-3xl">
          <p className="display text-3xl">
            {wpm} <span className="text-mute">wpm</span> · {accuracy}
            <span className="text-mute">% accurate</span>
          </p>
          <p className="mt-2 text-sm text-soft">
            That was the write-up for{" "}
            <a
              href={`/tools?q=${encodeURIComponent(line.source)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--accent-soft)" }}
            >
              {line.source}
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
        <p className="label text-mute">
          {done ? `${wpm} wpm` : `${liveWpm} wpm`} · {accuracy}% · {seconds.toFixed(1)}s ·{" "}
          {lines.length} lines from the toolbox
          {best !== null ? ` · best ${best} wpm` : ""}
        </p>
        <button
          type="button"
          onClick={() => reset(true)}
          className="label pointer-events-auto rounded-full px-4 py-2.5 transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Another line
        </button>
      </div>
    </div>
  );
}
