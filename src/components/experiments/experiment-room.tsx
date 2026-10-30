"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { lockScroll } from "@/lib/scroll-lock";
import { EXPERIMENTS } from "./registry";
import type { RoomData } from "./room-data";

/**
 * The room behind the footer counter. It takes the whole viewport rather than sitting in
 * the site's usual frame — no sidebar, no footer, nothing to click back to except the one
 * link — because a room you had to unlock should not look like another page of the list.
 */
const PICKED = "gitwork.experiment";

export function ExperimentRoom({ data }: { data: RoomData }) {
  const [slug, setSlug] = useState(EXPERIMENTS[0].slug);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = EXPERIMENTS.find((item) => item.slug === slug) ?? EXPERIMENTS[0];

  // The canvas fills the viewport, so the page behind must not scroll under it.
  useEffect(() => lockScroll(), []);

  /**
   * Which experiment is open lives in the URL fragment, with the last choice in
   * localStorage behind it. A refresh in the middle of a game used to drop you back on the
   * first experiment in the list, and the fragment means a link to one can be passed round
   * — which is as far as sharing goes, since the room itself still has to be unlocked.
   */
  const known = useCallback((value: string | null | undefined) => {
    return value && EXPERIMENTS.some((item) => item.slug === value) ? value : null;
  }, []);

  useEffect(() => {
    const fromHash = known(decodeURIComponent(window.location.hash.replace(/^#/, "")));
    let stored: string | null = null;
    try {
      stored = known(localStorage.getItem(PICKED));
    } catch {
      // Blocked storage just means the list opens where it always did.
    }
    const start = fromHash ?? stored;
    if (start) setSlug(start);

    const onHash = () => {
      const next = known(decodeURIComponent(window.location.hash.replace(/^#/, "")));
      if (next) setSlug(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [known]);

  const choose = useCallback((next: string) => {
    setSlug(next);
    setOpen(false);
    try {
      localStorage.setItem(PICKED, next);
    } catch {
      // The fragment still carries it for this tab.
    }
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0">{current.render(data)}</div>

      <div ref={menuRef} className="absolute left-5 top-5 z-10 w-[min(22rem,calc(100vw-2.5rem))]">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="label flex w-full items-center justify-between gap-3 rounded-full border px-4 py-2.5 backdrop-blur-md transition-colors"
          style={{
            borderColor: open ? "var(--accent)" : "var(--border)",
            background: "color-mix(in srgb, var(--bg) 94%, transparent)",
            color: "var(--text)",
          }}
        >
          <span className="flex items-center gap-2">
            Experiments
            <span className="text-mute">{EXPERIMENTS.length}</span>
          </span>
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="h-3 w-3 text-mute transition-transform"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          >
            <path
              d="M2.5 4.5 6 8 9.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open ? (
          <div
            className="surface mt-2 overflow-hidden backdrop-blur-md"
            style={{ background: "color-mix(in srgb, var(--bg-card) 92%, transparent)" }}
          >
            {EXPERIMENTS.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => choose(item.slug)}
                className="block w-full border-b px-4 py-3 text-left last:border-0 transition-colors hover:bg-[var(--bg-card-hover)]"
                style={{
                  borderColor: "var(--border)",
                  background: item.slug === slug ? "var(--accent-wash)" : undefined,
                }}
              >
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-mute">{item.blurb}</p>
              </button>
            ))}
            <div
              className="border-t px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
            >
              <p className="label mb-2 text-mute">How it works</p>
              <p className="text-xs leading-relaxed text-soft">{current.note}</p>
              <p className="label mt-3 leading-relaxed text-mute">
                {current.credits.map((credit) => credit.label).join(" · ")}
              </p>
              <Link
                href="/"
                className="label mt-3 inline-block text-mute hover:text-[var(--accent)]"
              >
                ← Back to the toolbox
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
