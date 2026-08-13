import Image from "next/image";
import Link from "next/link";
import { ExternalIcon, ItemIcon, Monogram } from "@/components/ui";
import { isNew } from "@/lib/data";
import type { Resource, StarterListItem, ToolListItem } from "@/lib/types";

/**
 * Cards stay deliberately plain: the site's own preview image where there is one,
 * then icon, name, a line of description and a line of grey metadata. Status lives
 * in small marks next to the name — a violet check for Gitwork approved, a star for
 * recommended — rather than a row of pills.
 */

/**
 * The vendor's own og:image, committed to public/previews. Entries without one get
 * the same box holding their icon, so a grid row keeps its rhythm either way.
 */
function Preview({
  src,
  name,
  icon,
}: {
  src?: string | null;
  name: string;
  icon?: string | null;
}) {
  return (
    <span
      className="relative mb-3.5 grid aspect-[16/10] place-items-center overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--bg-input)" }}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name} preview`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover"
        />
      ) : (
        <ItemIcon name={name} icon={icon} size="lg" className="opacity-70" />
      )}
    </span>
  );
}

function Marks({
  recommended,
  approved,
  addedAt,
}: {
  recommended?: boolean;
  approved?: boolean;
  addedAt?: string;
}) {
  const fresh = isNew(addedAt);
  if (!recommended && !approved && !fresh) return null;
  return (
    <span className="ml-1.5 inline-flex shrink-0 items-center gap-1">
      {fresh ? (
        <span className="label text-accent" title="Added recently">
          New
        </span>
      ) : null}
      {recommended ? (
        <span className="text-accent" title="Recommended" aria-label="Recommended">
          ★
        </span>
      ) : null}
      {approved ? (
        <span
          className="grid h-3.5 w-3.5 place-items-center rounded-full text-[9px]"
          style={{ background: "var(--accent)", color: "#fff" }}
          title="Gitwork approved"
          aria-label="Gitwork approved"
        >
          ✓
        </span>
      ) : null}
    </span>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 truncate font-mono text-[11px] text-mute">{children}</p>;
}

const CARD = "surface surface-hover group flex h-full flex-col p-4";
const NAME = "truncate font-medium leading-snug transition-colors group-hover:text-[var(--accent-soft)]";
const BODY = "mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-soft";

export function ToolCard({ tool }: { tool: ToolListItem }) {
  const dead = tool.linkStatus === "dead";
  return (
    <Link href={`/tools/${tool.slug}`} className={CARD} aria-label={tool.name}>
      <Preview src={tool.preview} name={tool.name} icon={tool.icon} />
      <div className="flex items-start gap-3">
        <ItemIcon name={tool.name} icon={tool.icon} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center">
            <h3 className={NAME}>{tool.name}</h3>
            <Marks recommended={tool.recommended} approved={tool.approved} addedAt={tool.addedAt} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-mute">
            {tool.domain || tool.category}
          </p>
        </div>
      </div>
      <p className={BODY}>{tool.what}</p>
      <Meta>
        {tool.pricing} · {tool.category.split(" / ")[0]}
        {dead ? " · dead link" : ""}
      </Meta>
    </Link>
  );
}

export function StarterCard({ starter }: { starter: StarterListItem }) {
  const tags = starter.tags.filter((tag) => tag !== "prompt-library").slice(0, 2);
  return (
    <Link href={`/starters/${starter.slug}`} className={CARD}>
      <div className="flex items-start gap-3">
        <Monogram name={starter.name} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center">
            <h3 className={NAME}>{starter.name}</h3>
            <Marks recommended={starter.recommended} approved={starter.approved} addedAt={starter.addedAt} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-mute">{starter.typeLabel}</p>
        </div>
      </div>
      <p className={BODY}>{starter.summary}</p>
      <Meta>{tags.length ? tags.join(" · ") : starter.typeLabel}</Meta>
    </Link>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link href={`/resources/${resource.slug}`} className={CARD}>
      <Preview src={resource.preview} name={resource.name} icon={resource.icon} />
      <div className="flex items-start gap-3">
        <ItemIcon name={resource.name} icon={resource.icon} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center">
            <h3 className={NAME}>{resource.name}</h3>
            <Marks recommended={resource.recommended} approved={resource.approved} addedAt={resource.addedAt} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-mute">{resource.domain}</p>
        </div>
      </div>
      <p className={BODY}>{resource.takeaway}</p>
      <Meta>{resource.resourceType}</Meta>
    </Link>
  );
}

/** The compact icon-and-one-liner row used for rails on the home page. */
export function CompactRow({
  href,
  name,
  descriptor,
  recommended,
  approved,
  addedAt,
  icon,
}: {
  href: string;
  name: string;
  descriptor: string;
  recommended?: boolean;
  approved?: boolean;
  addedAt?: string;
  icon?: string | null;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg py-2 pr-2">
      <ItemIcon name={name} icon={icon} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center">
          <span className="truncate text-sm font-medium transition-colors group-hover:text-[var(--accent-soft)]">
            {name}
          </span>
          <Marks recommended={recommended} approved={approved} addedAt={addedAt} />
        </span>
        <span className="block truncate text-xs text-mute">{descriptor}</span>
      </span>
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
    <Link href={href} className="surface surface-hover group flex h-full flex-col p-4">
      <div className="flex gap-1.5">
        {samples.slice(0, 4).map((name) => (
          <Monogram key={name} name={name} size="sm" />
        ))}
      </div>
      <h3 className="mt-3.5 font-medium transition-colors group-hover:text-[var(--accent-soft)]">
        {title}
      </h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-soft">{blurb}</p>
      <Meta>
        {count} {countLabel}
      </Meta>
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
