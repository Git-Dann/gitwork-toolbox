"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const START = 2026;
const TARGET = 2100;
const YEAR_KEY = "gitwork.year";
const UNLOCKED_KEY = "gitwork.experiments";

/**
 * The copyright year, except it counts. Click it — or hold it — and it walks forward from
 * 2026; get it to 2100 and the experiments room opens, which is the only way in. Progress
 * is kept in localStorage so it can be chipped at over several visits.
 *
 * It renders as a plain year on the server and stays a plain year until the first click,
 * so nothing about the footer advertises it.
 */
export function YearCounter() {
  const [year, setYear] = useState(START);
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const hold = useRef<{ timer: number; ticks: number } | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCKED_KEY) === "1") {
        setUnlocked(true);
        setYear(TARGET);
      } else {
        const saved = Number(window.localStorage.getItem(YEAR_KEY));
        if (Number.isFinite(saved) && saved > START && saved < TARGET) setYear(saved);
      }
    } catch {
      // Private windows and blocked site data are fine — the counter just starts over.
    }
    setReady(true);
  }, []);

  const bump = useCallback(() => {
    setYear((current) => {
      const next = Math.min(TARGET, current + 1);
      try {
        window.localStorage.setItem(YEAR_KEY, String(next));
        if (next === TARGET) window.localStorage.setItem(UNLOCKED_KEY, "1");
      } catch {
        /* nothing worth doing about it */
      }
      if (next === TARGET) {
        setUnlocked(true);
        setJustOpened(true);
      }
      return next;
    });
  }, []);

  // Holding it down ramps up, so 74 years is a couple of seconds rather than 74 clicks.
  const startHold = useCallback(() => {
    const stateRef = { timer: 0, ticks: 0 };
    const tick = () => {
      stateRef.ticks += 1;
      bump();
      const delay = Math.max(22, 110 - stateRef.ticks * 4);
      stateRef.timer = window.setTimeout(tick, delay);
    };
    stateRef.timer = window.setTimeout(tick, 320);
    hold.current = stateRef;
  }, [bump]);

  const endHold = useCallback(() => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  }, []);

  useEffect(() => endHold, [endHold]);

  const progress = (year - START) / (TARGET - START);
  const colour =
    progress > 0
      ? `color-mix(in srgb, var(--accent) ${Math.round(progress * 100)}%, var(--text-mute))`
      : "var(--text-mute)";

  if (unlocked && ready) {
    return (
      <p className="label text-mute">
        © {TARGET} Gitwork ·{" "}
        <Link
          href="/experiments"
          className={`transition-colors hover:underline ${
            justOpened ? "motion-safe:animate-[pulse_0.7s_ease-in-out_3]" : ""
          }`}
          style={{ color: "var(--accent-soft)" }}
        >
          Experiments →
        </Link>
      </p>
    );
  }

  return (
    <p className="label text-mute">
      ©{" "}
      <button
        type="button"
        aria-label={`Year ${year}`}
        onClick={bump}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        className="label cursor-pointer select-none tabular-nums transition-colors"
        style={{ color: colour }}
      >
        {year}
      </button>{" "}
      Gitwork
    </p>
  );
}
