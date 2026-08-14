"use client";

import { useRouter } from "next/navigation";

/**
 * Filters live in the URL, not in component state — that is what makes any view
 * pasteable to someone else, and what lets the browsers and the cards agree on what is
 * showing. Reads come from useSearchParams; writes come through here.
 *
 * It builds from window.location.search rather than from the params snapshot, because
 * the search box mirrors itself in with history.replaceState, which the router does not
 * see. Building from the snapshot would silently drop whatever was typed.
 */
export function useFilterWriter(base: string) {
  const router = useRouter();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    router.replace(search ? `${base}?${search}` : base, { scroll: false });
    return search;
  };
}

/**
 * The only dropdown shape on the site. Two things it gets right that are easy to get
 * wrong: a native select draws its chevron hard against the inner right edge, which on a
 * pill crowds the border curve — so the arrow is ours, inset to match SearchField's clear
 * button, with pr-10 reserving room for it. And the width is left to the browser, which
 * sizes a select to its widest option; fixed widths clipped "Discovery & Reference (8)"
 * and would clip again the next time a category is renamed.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative w-auto max-w-full ${className}`}>
      <select
        id={id}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-full border py-2 pl-4 pr-10 text-sm outline-none transition-colors focus:border-[var(--accent)]"
        style={{ borderColor: "var(--border)", background: "var(--bg-input)", color: "var(--text)" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-mute"
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
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border py-2.5 pl-4 pr-10 text-sm outline-none transition-colors placeholder:text-[var(--text-mute)] focus:border-[var(--accent)]"
        style={{ borderColor: "var(--border)", background: "var(--bg-input)", color: "var(--text)" }}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-[var(--text)]"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
