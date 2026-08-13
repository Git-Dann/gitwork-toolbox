import Link from "next/link";
import {
  ApprovedBadge,
  Badge,
  ExternalIcon,
  LinkHealth,
  Monogram,
  PricingBadge,
  RecommendedBadge,
} from "@/components/ui";
import type { Resource, StarterListItem, ToolListItem } from "@/lib/types";

export function ToolCard({ tool }: { tool: ToolListItem }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="surface surface-hover group flex h-full flex-col p-4"
      aria-label={tool.name}
    >
      <div className="flex items-start gap-3">
        <Monogram name={tool.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium leading-snug transition-colors group-hover:text-[var(--accent-soft)]">
            {tool.name}
          </h3>
          <p className="mt-1 truncate font-mono text-[11px] text-mute">
            {tool.domain || tool.category}
          </p>
        </div>
        {tool.recommended ? (
          <span className="mt-1 shrink-0 text-accent" aria-hidden>
            ★
          </span>
        ) : null}
      </div>

      <p className="mt-3.5 line-clamp-3 text-sm leading-relaxed text-soft">{tool.what}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 overflow-hidden pt-1">
        <PricingBadge pricing={tool.pricing} />
        {/* Cards show the head of a compound category; the detail page has it all. */}
        <Badge>{tool.category.split(" / ")[0]}</Badge>
        {tool.approved ? <ApprovedBadge /> : null}
        <LinkHealth status={tool.linkStatus} label={tool.linkLabel} />
      </div>
    </Link>
  );
}

export function StarterCard({ starter }: { starter: StarterListItem }) {
  return (
    <Link
      href={`/starters/${starter.slug}`}
      className="surface surface-hover group flex h-full flex-col p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone={starter.type === "PROMPT" ? "neutral" : "accent"}>{starter.typeLabel}</Badge>
        {starter.recommended ? (
          <RecommendedBadge />
        ) : starter.featured ? (
          <Badge tone="accent">Featured</Badge>
        ) : null}
      </div>
      <h3 className="mt-3.5 font-medium leading-snug transition-colors group-hover:text-[var(--accent-soft)]">
        {starter.name}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-soft">
        {starter.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {starter.tags
          .filter((tag) => tag !== "prompt-library")
          .slice(0, 3)
          .map((tag) => (
            <span key={tag} className="label text-mute">
              #{tag}
            </span>
          ))}
      </div>
    </Link>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link
      href={`/resources/${resource.slug}`}
      className="surface surface-hover group flex h-full flex-col p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge>{resource.resourceType}</Badge>
        {resource.recommended ? (
          <RecommendedBadge />
        ) : resource.usefulness === "High" ? (
          <Badge tone="accent">High value</Badge>
        ) : null}
      </div>
      <h3 className="mt-3.5 font-medium leading-snug transition-colors group-hover:text-[var(--accent-soft)]">
        {resource.name}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-soft">
        {resource.takeaway}
      </p>
      <p className="mt-4 truncate font-mono text-[11px] text-mute">{resource.domain}</p>
    </Link>
  );
}

export function CollectionCard({
  href,
  title,
  blurb,
  count,
  countLabel,
  samples,
}: {
  href: string;
  title: string;
  blurb: string;
  count: number;
  countLabel: string;
  samples: string[];
}) {
  return (
    <Link href={href} className="surface surface-hover group flex h-full flex-col p-5">
      <div className="flex gap-1.5">
        {samples.slice(0, 5).map((name) => (
          <Monogram key={name} name={name} size="sm" />
        ))}
      </div>
      <h3 className="display mt-4 text-xl transition-colors group-hover:text-[var(--accent-soft)]">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-soft">{blurb}</p>
      <p className="label mt-4 text-mute">
        {count} {countLabel}
      </p>
    </Link>
  );
}

export function OutboundLink({
  href,
  children,
  className = "",
  style,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={style}
    >
      {children}
      <ExternalIcon />
    </a>
  );
}
