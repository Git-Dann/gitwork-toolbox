"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/confetti";

const START = 2026;
const TARGET = 2100;
const YEAR_KEY = "gitwork.year";
const UNLOCKED_KEY = "gitwork.experiments";

/**
 * The copyright year, except it counts. Click it — or hold it — and it walks forward from
 * 2026; get it to 2100 and the experiments room opens, which is the only way in. Progress
 * is kept in localStorage so it can be chipped at over several visits, and the arrow next
 * to the link puts the years back for anyone who wants to earn it again.
 *
 * It renders as a plain year on the server and stays a plain year until the first click,
 * so nothing about the footer advertises it.
 */
export function YearCounter() {
  const [year, setYear] = useState(START);
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const hold = useRef<number | null>(null);
  /**
   * The year lives in a ref as well as in state. The ramp runs off timers, and a timer
   * cannot read a state value that has not rendered yet — reading state inside the
   * updater instead let the ramp keep firing after it had already reached 2100.
   */
  const current = useRef(START);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCKED_KEY) === "1") {
        setUnlocked(true);
        setYear(TARGET);
        current.current = TARGET;
      } else {
        const saved = Number(window.localStorage.getItem(YEAR_KEY));
        if (Number.isFinite(saved) && saved > START && saved < TARGET) {
          setYear(saved);
          current.current = saved;
        }
      }
    } catch {
      // Private windows and blocked site data are fine — the counter just starts over.
    }
    setReady(true);
  }, []);

  const endHold = useCallback(() => {
    if (hold.current !== null) window.clearTimeout(hold.current);
    hold.current = null;
  }, []);

  /** Adds a year. Returns false once there are none left to add. */
  const bump = useCallback(() => {
    if (current.current >= TARGET) return false;
    const next = current.current + 1;
    current.current = next;
    setYear(next);
    try {
      window.localStorage.setItem(YEAR_KEY, String(next));
      if (next === TARGET) window.localStorage.setItem(UNLOCKED_KEY, "1");
    } catch {
      /* nothing worth doing about it */
    }
    if (next === TARGET) {
      // Measured before the button is replaced by the link, since that is where the paper
      // is thrown from.
      const rect = button.current?.getBoundingClientRect();
      const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (rect && !quiet) {
        setBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      setUnlocked(true);
      setJustOpened(true);
      return false;
    }
    return true;
  }, []);

  // Holding it down ramps up, so 74 years is a couple of seconds rather than 74 clicks.
  const startHold = useCallback(() => {
    let ticks = 0;
    const tick = () => {
      ticks += 1;
      if (!bump()) {
        endHold();
        return;
      }
      hold.current = window.setTimeout(tick, Math.max(22, 110 - ticks * 4));
    };
    hold.current = window.setTimeout(tick, 320);
  }, [bump, endHold]);

  useEffect(() => endHold, [endHold]);

  /** Puts the years back. Someone else can have the fun of finding it again. */
  const reset = useCallback(() => {
    endHold();
    try {
      window.localStorage.removeItem(YEAR_KEY);
      window.localStorage.removeItem(UNLOCKED_KEY);
    } catch {
      /* nothing worth doing about it */
    }
    current.current = START;
    setYear(START);
    setUnlocked(false);
    setJustOpened(false);
    setBurst(null);
  }, [endHold]);

  const progress = (year - START) / (TARGET - START);
  const colour =
    progress > 0
      ? `color-mix(in srgb, var(--accent) ${Math.round(progress * 100)}%, var(--text-mute))`
      : "var(--text-mute)";

  if (unlocked && ready) {
    return (
      <p className="label flex items-center gap-2 text-mute">
        <span>© {TARGET} Gitwork ·</span>
        <Link
          href="/experiments"
          className={`transition-colors hover:underline ${
            justOpened ? "motion-safe:animate-[pulse_0.7s_ease-in-out_3]" : ""
          }`}
          style={{ color: "var(--accent-soft)" }}
        >
          Experiments →
        </Link>
        <button
          type="button"
          onClick={reset}
          title="Put the years back"
          aria-label="Reset the counter and hide the experiments link"
          className="text-mute transition-colors hover:text-[var(--accent)]"
        >
          <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3">
            <path
              d="M6 2.5A3.5 3.5 0 1 1 3.1 8.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path d="M5.5 1.1 7.5 2.5 5.5 3.9z" fill="currentColor" />
          </svg>
        </button>
        {burst ? <Confetti at={burst} onDone={() => setBurst(null)} /> : null}
      </p>
    );
  }

  return (
    <p className="label text-mute">
      ©{" "}
      <button
        ref={button}
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
