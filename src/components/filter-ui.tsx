"use client";

import { useState } from "react";

export function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="border-b py-4 first:pt-0 last:border-0 last:pb-0"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="label mb-3">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-hover-surface={active ? undefined : "true"}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { color: "var(--text-soft)" }
      }
    >
      <span className="truncate">{label}</span>
      {count === undefined ? null : (
        <span
          className="font-mono text-[11px]"
          style={{ color: active ? "var(--on-accent)" : "var(--text-mute)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Toggle({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-hover-surface="true"
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
    >
      <span
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border"
        style={{
          borderColor: active ? "var(--accent)" : "var(--border-strong)",
          background: active ? "var(--accent)" : "transparent",
          color: "#fff",
        }}
      >
        {active ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path
              d="M2.5 6.5 4.8 8.8 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-soft">{label}</span>
        {hint ? <span className="block text-xs text-mute">{hint}</span> : null}
      </span>
    </button>
  );
}

/** Long option lists collapse to a readable number. */
export function Collapsible({
  children,
  visible = 8,
  moreLabel = "Show all",
}: {
  children: React.ReactNode[];
  visible?: number;
  moreLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? children : children.slice(0, visible);

  return (
    <>
      {items}
      {children.length > visible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="label px-2.5 pt-1.5 text-accent hover:underline"
        >
          {expanded ? "Show fewer" : `${moreLabel} (${children.length})`}
        </button>
      ) : null}
    </>
  );
}

/**
 * The only dropdown shape on the site. A native select draws its chevron hard against
 * the inner right edge, which on a pill crowds the border curve — so the arrow is ours,
 * inset to match SearchField's clear button, with pr-10 reserving room for it.
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
    <div className={`relative ${className}`}>
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
