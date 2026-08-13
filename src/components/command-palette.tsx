"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchEntry } from "@/lib/types";

const HREF: Record<SearchEntry["kind"], string> = {
  tool: "/tools/",
  starter: "/starters/",
  resource: "/resources/",
};

const KIND_LABEL: Record<SearchEntry["kind"], string> = {
  tool: "Tool",
  starter: "Starter",
  resource: "Resource",
};

function score(entry: SearchEntry, query: string) {
  const name = entry.name.toLowerCase();
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (name.includes(query)) return 60;
  if (entry.meta.toLowerCase().includes(query)) return 30;
  if (entry.blurb.toLowerCase().includes(query)) return 20;
  return 0;
}

export function CommandPalette({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The index loads on first open instead of shipping in every page payload.
  useEffect(() => {
    if (!open || entries) return;
    let cancelled = false;
    fetch("/search-index.json")
      .then((response) => response.json())
      .then((data: SearchEntry[]) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entries]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "/" && !typing && !open) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return entries.filter((entry) => entry.pick).slice(0, 12);
    return entries
      .map((entry) => ({ entry, value: score(entry, q) }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value || a.entry.name.length - b.entry.name.length)
      .slice(0, 24)
      .map((row) => row.entry);
  }, [entries, query]);

  const go = useCallback(
    (entry: SearchEntry) => {
      setOpen(false);
      setQuery("");
      router.push(`${HREF[entry.kind]}${entry.slug}`);
    },
    [router],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search the toolbox"
          className="grid h-9 w-9 place-items-center rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <SearchIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-input)",
            color: "var(--text-mute)",
          }}
          aria-label="Search the toolbox"
        >
          <SearchIcon />
          <span className="flex-1 text-left">Search</span>
          <kbd
            className="label rounded border px-1.5 py-0.5 text-[10px]"
            style={{ borderColor: "var(--border)" }}
          >
            ⌘K
          </kbd>
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            className="surface relative z-10 w-full max-w-xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search the toolbox…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-mute)]"
              />
              <kbd
                className="label rounded border px-1.5 py-0.5 text-[10px] text-mute"
                style={{ borderColor: "var(--border)" }}
              >
                Esc
              </kbd>
            </div>

            {entries === null ? (
              <p className="px-4 py-6 text-sm text-mute">Loading the index…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-mute">
                No matches for “{query}”.
              </p>
            ) : (
              <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-1">
                {!query.trim() ? (
                  <li className="label px-4 py-2 text-mute">Recommended</li>
                ) : null}
                {results.map((entry, index) => (
                  <li key={`${entry.kind}-${entry.slug}`}>
                    <button
                      type="button"
                      onClick={() => go(entry)}
                      onMouseEnter={() => setActive(index)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      style={index === active ? { background: "var(--accent-wash)" } : undefined}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{entry.name}</span>
                        <span className="block truncate text-xs text-mute">{entry.blurb}</span>
                      </span>
                      <span className="label shrink-0 text-mute">{KIND_LABEL[entry.kind]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}
