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
  return <div className={`mx-auto w-full max-w-[92rem] px-5 sm:px-8 ${className}`}>{children}</div>;
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
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <Container className="py-10 sm:py-14">
        <Eyebrow accent>{eyebrow}</Eyebrow>
        <h1 className="display mt-4 max-w-4xl text-4xl sm:text-[3.25rem]">
          {title}
          <span className="text-accent">.</span>
        </h1>
        {lead ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-soft">{lead}</p>
        ) : null}
        {meta ? <div className="mt-6 flex flex-wrap items-center gap-2">{meta}</div> : null}
        {children}
      </Container>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="label inline-flex items-center gap-1.5 text-mute transition-colors hover:text-[var(--accent)]"
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
  tone?: "plain" | "accent" | "flag";
  children: ReactNode;
}) {
  const tones = {
    plain: { borderColor: "var(--border)", background: "var(--bg-card)" },
    accent: { borderColor: "rgb(107 82 255 / 0.3)", background: "var(--accent-wash)" },
    flag: { borderColor: "rgb(255 107 107 / 0.28)", background: "rgb(255 107 107 / 0.07)" },
  }[tone];

  return (
    <div className="rounded-[var(--radius-card)] border p-5" style={tones}>
      {title ? (
        <p className="label mb-3" style={{ color: tone === "accent" ? "var(--accent-soft)" : "var(--text)" }}>
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function DefinitionRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-1 border-b py-3.5 last:border-0 sm:flex-row sm:gap-6"
      style={{ borderColor: "var(--border)" }}
    >
      <dt className="label w-44 shrink-0 pt-0.5 text-mute">{term}</dt>
      <dd className="flex-1 text-sm leading-relaxed text-soft">{children}</dd>
    </div>
  );
}
