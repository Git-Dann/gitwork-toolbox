import Link from "next/link";
import {
  Badge,
  ExternalIcon,
  LinkHealth,
  Monogram,
  PickBadge,
  PricingBadge,
} from "@/components/ui";
import type { Resource, StarterListItem, ToolListItem } from "@/lib/types";

export function ToolCard({ tool }: { tool: ToolListItem }) {
  const isPick = tool.assessed && tool.usefulness === "High";
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="card card-hover group flex h-full flex-col p-4"
      aria-label={tool.name}
    >
      <div className="flex items-start gap-3">
        <Monogram name={tool.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium leading-snug group-hover:text-signal">{tool.name}</h3>
          <p className="label mt-1 truncate text-mute normal-case tracking-normal">
            {tool.domain || tool.category}
          </p>
        </div>
        {isPick ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-signal" /> : null}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/75">{tool.what}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 overflow-hidden pt-1">
        <PricingBadge pricing={tool.pricing} />
        {/* Cards show the head of a compound category; the detail page has it all. */}
        <Badge>{tool.category.split(" / ")[0]}</Badge>
        {isPick ? <PickBadge /> : null}
        <LinkHealth status={tool.linkStatus} label={tool.linkLabel} />
      </div>
    </Link>
  );
}

export function ToolRow({ tool }: { tool: ToolListItem }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-center gap-3 border-b border-line/8 py-3 last:border-0"
    >
      <Monogram name={tool.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-signal">{tool.name}</p>
        <p className="truncate text-xs text-mute">{tool.what}</p>
      </div>
      <PricingBadge pricing={tool.pricing} />
    </Link>
  );
}

export function StarterCard({ starter }: { starter: StarterListItem }) {
  return (
    <Link
      href={`/starters/${starter.slug}`}
      className="card card-hover group flex h-full flex-col p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone={starter.type === "PROMPT" ? "neutral" : "signal"}>{starter.typeLabel}</Badge>
        {starter.featured ? <Badge tone="solid">Featured</Badge> : null}
      </div>
      <h3 className="mt-3 font-medium leading-snug group-hover:text-signal">{starter.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/75">
        {starter.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
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
      className="card card-hover group flex h-full flex-col p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge>{resource.resourceType}</Badge>
        {resource.usefulness === "High" ? <Badge tone="solid">High value</Badge> : null}
      </div>
      <h3 className="mt-3 font-medium leading-snug group-hover:text-signal">{resource.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/75">
        {resource.takeaway}
      </p>
      <p className="label mt-4 truncate text-mute normal-case tracking-normal">{resource.domain}</p>
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
    <Link href={href} className="card card-hover group flex h-full flex-col p-5">
      <div className="flex gap-1.5">
        {samples.slice(0, 5).map((name) => (
          <Monogram key={name} name={name} size="sm" />
        ))}
      </div>
      <h3 className="mt-4 font-display text-xl leading-snug group-hover:text-signal">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{blurb}</p>
      <p className="label mt-4 text-ink/60">
        {count} {countLabel}
      </p>
    </Link>
  );
}

export function OutboundLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {children}
      <ExternalIcon />
    </a>
  );
}
