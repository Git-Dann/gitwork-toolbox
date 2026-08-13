import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line/10 bg-white/40">
      <Container className="py-10 sm:py-14">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
        {lead ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/70">{lead}</p> : null}
        {meta ? <div className="mt-5 flex flex-wrap items-center gap-2">{meta}</div> : null}
        {children}
      </Container>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="label inline-flex items-center gap-1.5 text-mute transition-colors hover:text-signal"
    >
      ← {children}
    </Link>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-10 sm:py-14 ${className}`}>
      {children}
    </section>
  );
}

/** The bordered block used for verdicts, prices and callouts on detail pages. */
export function Panel({
  title,
  tone = "plain",
  children,
}: {
  title?: string;
  tone?: "plain" | "signal" | "flag";
  children: ReactNode;
}) {
  const tones = {
    plain: "border-line/10 bg-white",
    signal: "border-signal/20 bg-signal-soft/35",
    flag: "border-flag/20 bg-flag/5",
  }[tone];

  return (
    <div className={`rounded-[var(--radius-card)] border p-5 ${tones}`}>
      {title ? <p className="label mb-3 text-ink">{title}</p> : null}
      {children}
    </div>
  );
}

export function DefinitionRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line/8 py-3 last:border-0 sm:flex-row sm:gap-6">
      <dt className="label w-40 shrink-0 pt-0.5 text-mute">{term}</dt>
      <dd className="flex-1 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}
