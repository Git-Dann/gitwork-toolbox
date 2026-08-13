"use client";

import { useState } from "react";

export function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/10 py-4 first:pt-0 last:border-0">
      <p className="label mb-3 text-ink">{title}</p>
      <div className="space-y-1.5">{children}</div>
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
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active ? "bg-ink text-paper" : "text-ink/75 hover:bg-ink/5"
      }`}
    >
      <span className="truncate">{label}</span>
      {count === undefined ? null : (
        <span className={`font-mono text-[11px] ${active ? "text-paper/70" : "text-mute"}`}>
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
      className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-ink/5"
    >
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
          active ? "border-signal bg-signal text-white" : "border-line/25 bg-white"
        }`}
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
        <span className="block text-sm text-ink/85">{label}</span>
        {hint ? <span className="block text-xs text-mute">{hint}</span> : null}
      </span>
    </button>
  );
}

/** Long option lists (50 categories) collapse to a readable number. */
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
          className="label px-2 pt-1 text-signal hover:underline"
        >
          {expanded ? "Show fewer" : `${moreLabel} (${children.length})`}
        </button>
      ) : null}
    </>
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
        className="hairline w-full rounded-full border bg-white py-2.5 pl-4 pr-10 text-sm outline-none transition-colors placeholder:text-mute focus:border-signal/50"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
