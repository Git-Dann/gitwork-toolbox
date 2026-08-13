import Link from "next/link";
import type { ReactNode } from "react";
import type { LinkStatus, Pricing, Usefulness } from "@/lib/types";

/* ------------------------------------------------------------------ monogram */

// No logo assets exist for these tools, so each gets a typographic tile with a
// deterministic violet-family tint rather than a broken image.
const TINTS = [
  { bg: "rgb(107 82 255 / 0.18)", fg: "#a99bff" },
  { bg: "rgb(143 125 255 / 0.14)", fg: "#b6a9ff" },
  { bg: "rgb(62 207 142 / 0.14)", fg: "#6fdcac" },
  { bg: "rgb(232 176 75 / 0.14)", fg: "#e8c07a" },
  { bg: "rgb(242 237 228 / 0.10)", fg: "#d7d3ca" },
  { bg: "rgb(68 54 201 / 0.20)", fg: "#9c92ff" },
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) % 100000;
  return h;
}

export function initialsOf(name: string) {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .replace(/[^A-Za-z0-9 .-]/g, " ")
    .split(/[\s.-]+/)
    .filter(Boolean);
  if (!words.length) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function Monogram({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: "h-8 w-8 text-[11px] rounded-md",
    md: "h-11 w-11 text-[13px] rounded-lg",
    lg: "h-16 w-16 text-lg rounded-xl",
  }[size];
  const tint = TINTS[hash(name) % TINTS.length];

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-mono font-medium tracking-tight ${dimensions} ${className}`}
      style={{ background: tint.bg, color: tint.fg }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* -------------------------------------------------------------------- badges */

type Tone = "neutral" | "accent" | "green" | "flag" | "amber" | "solid";

const TONES: Record<Tone, { border: string; bg: string; color: string }> = {
  neutral: { border: "var(--border)", bg: "transparent", color: "var(--text-mute)" },
  accent: { border: "rgb(107 82 255 / 0.35)", bg: "var(--accent-wash)", color: "var(--accent-soft)" },
  green: { border: "rgb(62 207 142 / 0.3)", bg: "rgb(62 207 142 / 0.1)", color: "#5bd6a0" },
  flag: { border: "rgb(255 107 107 / 0.3)", bg: "rgb(255 107 107 / 0.1)", color: "#ff8f8f" },
  amber: { border: "rgb(232 176 75 / 0.3)", bg: "rgb(232 176 75 / 0.1)", color: "#e8c07a" },
  solid: { border: "var(--accent)", bg: "var(--accent)", color: "var(--on-accent)" },
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`label inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 ${className}`}
      style={{ borderColor: t.border, background: t.bg, color: t.color }}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PricingBadge({ pricing }: { pricing: Pricing }) {
  const tone: Tone = pricing === "Free" ? "green" : pricing === "Freemium" ? "accent" : "neutral";
  return <Badge tone={tone}>{pricing}</Badge>;
}

/** Set in the admin portal: actively recommended for studio work. */
export function RecommendedBadge() {
  return <Badge tone="solid">★ Recommended</Badge>;
}

/** Set in the admin portal: checked over and cleared for client work. */
export function ApprovedBadge() {
  return <Badge tone="accent">✓ Gitwork approved</Badge>;
}

export function LinkHealth({ status, label }: { status: LinkStatus; label: string }) {
  if (status === "ok" || status === "reviewed") return null;
  return <Badge tone={status === "dead" ? "flag" : "amber"}>{label}</Badge>;
}

const USEFULNESS_TONE: Record<Usefulness, Tone> = {
  High: "accent",
  Medium: "neutral",
  Low: "neutral",
  None: "neutral",
  Unknown: "neutral",
  "Not assessed": "neutral",
};

export function UsefulnessBadge({ usefulness }: { usefulness: Usefulness }) {
  if (usefulness === "Not assessed") return null;
  return <Badge tone={USEFULNESS_TONE[usefulness]}>{usefulness} value</Badge>;
}

/* ------------------------------------------------------------------ headings */

export function Eyebrow({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <p className={`label ${accent ? "text-accent" : "text-mute"} ${className}`}>{children}</p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  action,
}: {
  eyebrow?: string;
  title: string;
  blurb?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow accent className="mb-2.5">{eyebrow}</Eyebrow> : null}
        <h2 className="display text-2xl sm:text-[1.75rem]">
          {title}
          <span className="text-accent">.</span>
        </h2>
        {blurb ? <p className="mt-2.5 text-sm leading-relaxed text-soft">{blurb}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="label shrink-0 border-b pb-1 transition-colors hover:text-[var(--accent)]"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------- bits */

export function ExternalIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 ${className}`}
    >
      <path d="M6.5 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 2.5H13.5V6.5" />
      <path d="M13.5 2.5 7.5 8.5" />
    </svg>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="display text-3xl sm:text-4xl">
        {value}
        <span className="text-accent">.</span>
      </p>
      <p className="label mt-2 text-mute">{label}</p>
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-t ${className}`} style={{ borderColor: "var(--border)" }} />;
}

/** The violet arrow bullet used through the studio's documents. */
export function ArrowList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-soft">
          <span className="mt-0.5 shrink-0 text-accent">→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
