"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoomPoster } from "./room-data";

const BEST_KEY = "gitwork.guess.best";
const OPTIONS = 4;

/** Blank out the answer wherever the write-up gives it away. */
function redact(text: string, name: string) {
  const parts = [name, ...name.split(/[\s/(),.]+/).filter((word) => word.length > 3)];
  let out = text;
  for (const part of parts) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "▄▄▄▄");
  }
  return out;
}

/**
 * Guess which tool a write-up belongs to. The decoys come from the same area as the
 * answer, so it is a real question rather than a spot-the-odd-one-out — and the name is
 * blanked wherever the sentence says it.
 *
 * The whole point is that it teaches the list: you cannot get a streak going without
 * having actually read the thing.
 */
export function GuessTheTool({ posters }: { posters: RoomPoster[] }) {
  const [seed, setSeed] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);

  // Drawn after mounting: a random question during a render is a different question on
  // the server than in the browser.
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 100000) + 1);
    try {
      const saved = Number(window.localStorage.getItem(BEST_KEY));
      if (Number.isFinite(saved) && saved > 0) setBest(saved);
    } catch {
      /* private window */
    }
  }, []);

  const question = useMemo(() => {
    if (seed === null) return null;
    // A cheap deterministic pick per round, so re-renders do not reshuffle the answers.
    let a = (seed + round * 7919) >>> 0;
    const next = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
    const usable = posters.filter((poster) => poster.what.length > 60);
    if (!usable.length) return null;
    const answer = usable[Math.floor(next() * usable.length)];
    const sameArea = posters.filter(
      (poster) => poster.group === answer.group && poster.name !== answer.name,
    );
    const pool = sameArea.length >= OPTIONS - 1 ? sameArea : posters;
    const decoys: RoomPoster[] = [];
    while (decoys.length < OPTIONS - 1 && decoys.length < pool.length) {
      const pick = pool[Math.floor(next() * pool.length)];
      if (pick.name === answer.name || decoys.some((item) => item.name === pick.name)) continue;
      decoys.push(pick);
    }
    const options = [answer, ...decoys];
    // Deterministic shuffle of the options, or the answer is always first.
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { answer, options, text: redact(answer.what, answer.name) };
  }, [posters, seed, round]);

  const answer = useCallback(
    (name: string) => {
      if (chosen || !question) return;
      setChosen(name);
      setAsked((value) => value + 1);
      if (name === question.answer.name) {
        setRight((value) => value + 1);
        setStreak((value) => {
          const next = value + 1;
          if (next > best) {
            setBest(next);
            try {
              window.localStorage.setItem(BEST_KEY, String(next));
            } catch {
              /* nothing worth doing about it */
            }
          }
          return next;
        });
      } else {
        setStreak(0);
      }
    },
    [chosen, question, best],
  );

  const nextRound = useCallback(() => {
    setChosen(null);
    setRound((value) => value + 1);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || !question) return;
      const digit = Number(event.key);
      if (digit >= 1 && digit <= question.options.length) {
        event.preventDefault();
        answer(question.options[digit - 1].name);
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && chosen) {
        event.preventDefault();
        nextRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, chosen, nextRound, question]);

  if (!question) return <div className="absolute inset-0" />;

  const correct = chosen === question.answer.name;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <p className="label text-mute">
          {question.answer.category.toUpperCase()} · {question.answer.pricing.toUpperCase()}
        </p>
        <p className="mt-4 text-xl leading-relaxed sm:text-2xl">{question.text}</p>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, index) => {
            const isAnswer = option.name === question.answer.name;
            const picked = chosen === option.name;
            const tone = !chosen
              ? { borderColor: "var(--border)" }
              : isAnswer
                ? { borderColor: "var(--color-green)", background: "rgb(62 207 142 / 0.12)" }
                : picked
                  ? { borderColor: "var(--color-flag)", background: "rgb(255 107 107 / 0.1)" }
                  : { borderColor: "var(--border)", opacity: 0.5 };
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => answer(option.name)}
                disabled={Boolean(chosen)}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-left text-sm transition-colors"
                style={tone}
              >
                <span className="label text-mute">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{option.name}</span>
              </button>
            );
          })}
        </div>

        {chosen ? (
          <div className="mt-6">
            <p className="display text-2xl">
              {correct ? "Right." : `It was ${question.answer.name}.`}
            </p>
            <p className="mt-2 text-sm text-soft">
              {question.answer.what}{" "}
              <a
                href={`/tools/${question.answer.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--accent-soft)" }}
              >
                Read the entry
              </a>
              .
            </p>
            <button
              type="button"
              onClick={nextRound}
              className="label mt-5 rounded-full px-5 py-3"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Next one
            </button>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
        <p className="label text-mute">
          {right}/{asked} right · streak {streak} · best {best} · 1–4 to answer
          {chosen ? " · enter for the next" : ""}
        </p>
        <p className="label text-mute">Decoys come from the same area</p>
      </div>
    </div>
  );
}
