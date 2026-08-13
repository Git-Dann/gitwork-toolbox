import Link from "next/link";
import type { ReactNode } from "react";
import type { LinkStatus, Pricing, Usefulness } from "@/lib/types";

/* ------------------------------------------------------------------ monogram */

// No logo assets exist for 700-odd tools, so each one gets a typographic tile
// with a deterministic tint from the brand palette instead of a broken image.
const TINTS = [
  "bg-signal-soft text-signal-deep",
  "bg-[#ece8dd] text-ink",
  "bg-[#dcebe2] text-[#14663a]",
  "bg-[#dde6ff] text-[#173a8f]",
  "bg-[#f2e5d9] text-[#7a4a22]",
  "bg-[#e6e3f5] text-signal-deep",
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
    md: "h-10 w-10 text-[13px] rounded-lg",
    lg: "h-14 w-14 text-lg rounded-xl",
  }[size];

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-mono font-medium tracking-tight ${TINTS[hash(name) % TINTS.length]} ${dimensions} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/* -------------------------------------------------------------------- badges */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "green" | "flag" | "amber" | "solid";
  className?: string;
}) {
  const tones = {
    neutral: "border-line/15 text-mute",
    signal: "border-signal/25 bg-signal-soft/50 text-signal-deep",
    green: "border-green/25 bg-green/8 text-green",
    flag: "border-flag/25 bg-flag/8 text-flag",
    amber: "border-[#b4741c]/25 bg-[#b4741c]/8 text-[#8a5714]",
    solid: "border-ink bg-ink text-paper",
  }[tone];

  // Compound categories ("Design engineering / UI reference") are long enough to
  // break a pill, so a badge never wraps — it ellipsises inside its container.
  return (
    <span
      className={`label inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 ${tones} ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PricingBadge({ pricing }: { pricing: Pricing }) {
  const tone = pricing === "Free" ? "green" : pricing === "Freemium" ? "signal" : "neutral";
  return <Badge tone={tone}>{pricing}</Badge>;
}

export function PickBadge() {
  return <Badge tone="solid">Gitwork pick</Badge>;
}

export function LinkHealth({ status, label }: { status: LinkStatus; label: string }) {
  if (status === "ok" || status === "reviewed") return null;
  const tone = status === "dead" ? "flag" : "amber";
  return <Badge tone={tone}>{label}</Badge>;
}

const USEFULNESS_TONE: Record<Usefulness, "solid" | "signal" | "neutral"> = {
  High: "solid",
  Medium: "signal",
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

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`label text-mute ${className}`}>{children}</p>;
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
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h2 className="font-display text-2xl leading-tight sm:text-3xl">{title}</h2>
        {blurb ? <p className="mt-2 text-sm text-mute sm:text-[0.95rem]">{blurb}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="label shrink-0 border-b border-ink/20 pb-1 text-ink transition-colors hover:border-signal hover:text-signal"
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
      <p className="font-display text-3xl leading-none sm:text-4xl">{value}</p>
      <p className="label mt-2 text-mute">{label}</p>
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`hairline border-t ${className}`} />;
}
