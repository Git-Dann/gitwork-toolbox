"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, Tag } from "@/lib/types";

type NavItem = { href: string; label: string; count?: number };

export type SidebarData = {
  counts: Record<string, number>;
  groups: Group[];
  tags: Tag[];
};

/**
 * One rail. Below the destinations it carries the filters for whichever list you are
 * looking at — pricing and areas on the tools page, types and topics on starters —
 * so there is never a second filter column competing with it for width.
 *
 * Filters are links that write the query string; the browsers read their state back
 * out of the URL, which also makes every view shareable.
 */
export function Sidebar({ counts, groups, tags }: SidebarData) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const close = () => setOpen(false);

  const primary: NavItem[] = [
    { href: "/", label: "Explore" },
    ...(counts.recent ? [{ href: "/new", label: "Newly added", count: counts.recent }] : []),
    { href: "/tools", label: "Tools", count: counts.tools },
    { href: "/starters", label: "Starters", count: counts.starters },
    { href: "/resources", label: "Resources", count: counts.resources },
    { href: "/collections", label: "Collections" },
    { href: "/shortlist", label: "Shortlist" },
  ];

  const isActive = (href: string) => {
    const [path] = href.split("?");
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const nav = (
    <div className="flex h-full flex-col overflow-y-auto px-2.5 pb-6">
      <Link href="/" onClick={close} className="mb-4 mt-4 block px-2" aria-label="Gitwork Toolbox">
        <Wordmark />
      </Link>

      <div className="px-0.5 pb-2">
        <CommandPalette variant="sidebar" />
      </div>

      <nav>
        {primary.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} />
        ))}
      </nav>

      {/* The filter rails read the query string, so they load inside a boundary and
          the destinations above stay statically rendered. */}
      {pathname === "/tools" ? (
        <Suspense fallback={<RailTitle>Filters</RailTitle>}>
          <ToolFilters counts={counts} groups={groups} onNavigate={close} />
        </Suspense>
      ) : pathname === "/starters" ? (
        <Suspense fallback={<RailTitle>Filters</RailTitle>}>
          <StarterFilters counts={counts} tags={tags} onNavigate={close} />
        </Suspense>
      ) : (
        <StarterShortcuts counts={counts} onNavigate={close} />
      )}

      <div className="mt-auto border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <NavLink
          item={{ href: "/about", label: "How this is built" }}
          active={isActive("/about")}
          subtle
          onNavigate={close}
        />
        <NavLink
          item={{ href: "/admin", label: "Admin" }}
          active={isActive("/admin")}
          subtle
          onNavigate={close}
        />
        <ThemeToggle />
        <a
          href="https://gitwork.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="label block px-2.5 py-2 text-mute transition-colors hover:text-[var(--accent)]"
        >
          gitwork.co.uk ↗
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-md lg:hidden"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link href="/" className="min-w-0 flex-1" aria-label="Gitwork Toolbox">
          <Wordmark />
        </Link>
        <CommandPalette variant="icon" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] border-r"
            style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
          >
            {nav}
          </div>
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 border-r lg:block"
        style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
      >
        {nav}
      </aside>
    </>
  );
}

/* --------------------------------------------------------------- filter rails */

const PRICING = ["Free", "Freemium", "Paid"] as const;

/** Builds a href that changes some params and keeps the rest. */
function useHrefBuilder(base: string) {
  const params = useSearchParams();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const search = next.toString();
    return search ? `${base}?${search}` : base;
  };
}

function ToolFilters({
  counts,
  groups,
  onNavigate,
}: {
  counts: Record<string, number>;
  groups: Group[];
  onNavigate: () => void;
}) {
  const params = useSearchParams();
  const href = useHrefBuilder("/tools");
  const price = params.get("price") ?? "";
  const group = params.get("group") ?? "";
  const recommended = params.get("recommended") === "1";
  const approved = params.get("approved") === "1";

  return (
    <>
      <RailTitle>Verdict</RailTitle>
      <nav>
        <FilterLink
          href={href({ recommended: recommended ? null : "1" })}
          label="Recommended"
          count={counts.recommended}
          active={recommended}
          onNavigate={onNavigate}
        />
        <FilterLink
          href={href({ approved: approved ? null : "1" })}
          label="Gitwork approved"
          count={counts.approved}
          active={approved}
          onNavigate={onNavigate}
        />
      </nav>

      <RailTitle>Pricing</RailTitle>
      <nav>
        <FilterLink
          href={href({ price: null })}
          label="Any"
          count={counts.tools}
          active={!price}
          onNavigate={onNavigate}
        />
        {PRICING.map((tier) => (
          <FilterLink
            key={tier}
            href={href({ price: price === tier ? null : tier })}
            label={tier}
            count={counts[tier.toLowerCase()]}
            active={price === tier}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <RailTitle>Areas</RailTitle>
      <nav>
        <FilterLink
          href={href({ group: null })}
          label="Everything"
          active={!group}
          onNavigate={onNavigate}
        />
        {groups.map((item) => (
          <FilterLink
            key={item.slug}
            href={href({ group: group === item.slug ? null : item.slug })}
            label={item.name}
            count={item.count}
            active={group === item.slug}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

const TYPES = [
  { value: "PROMPT", label: "Prompts", key: "prompts" },
  { value: "SKILL", label: "Skills", key: "skills" },
  { value: "KIT", label: "Kits", key: "kits" },
  { value: "PLUGIN", label: "Plugins", key: "plugins" },
  { value: "COLLECTION", label: "Collections", key: "starterCollections" },
] as const;

function StarterFilters({
  counts,
  tags,
  onNavigate,
}: {
  counts: Record<string, number>;
  tags: Tag[];
  onNavigate: () => void;
}) {
  const params = useSearchParams();
  const href = useHrefBuilder("/starters");
  const [allTopics, setAllTopics] = useState(false);
  const type = params.get("type") ?? "";
  const tag = params.get("tag") ?? "";
  const recommended = params.get("recommended") === "1";

  const shown = allTopics ? tags : tags.slice(0, 8);

  return (
    <>
      <RailTitle>Type</RailTitle>
      <nav>
        <FilterLink
          href={href({ type: null })}
          label="Everything"
          count={counts.starters}
          active={!type}
          onNavigate={onNavigate}
        />
        {TYPES.map((item) => (
          <FilterLink
            key={item.value}
            href={href({ type: type === item.value ? null : item.value })}
            label={item.label}
            count={counts[item.key]}
            active={type === item.value}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <RailTitle>Verdict</RailTitle>
      <nav>
        <FilterLink
          href={href({ recommended: recommended ? null : "1" })}
          label="Recommended"
          active={recommended}
          onNavigate={onNavigate}
        />
      </nav>

      <RailTitle>Topic</RailTitle>
      <nav>
        {shown.map((item) => (
          <FilterLink
            key={item.tag}
            href={href({ tag: tag === item.tag ? null : item.tag })}
            label={item.label}
            count={item.count}
            active={tag === item.tag}
            onNavigate={onNavigate}
          />
        ))}
        {tags.length > 8 ? (
          <button
            type="button"
            onClick={() => setAllTopics((value) => !value)}
            className="label px-2.5 pt-1.5 text-accent hover:underline"
          >
            {allTopics ? "Fewer" : `All ${tags.length}`}
          </button>
        ) : null}
      </nav>
    </>
  );
}

/** Off the browse pages the rail still offers the library by type. */
function StarterShortcuts({
  counts,
  onNavigate,
}: {
  counts: Record<string, number>;
  onNavigate: () => void;
}) {
  return (
    <>
      <RailTitle>Starter library</RailTitle>
      <nav>
        {TYPES.map((item) => (
          <NavLink
            key={item.value}
            item={{
              href: `/starters?type=${item.value}`,
              label: item.label,
              count: counts[item.key],
            }}
            active={false}
            subtle
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

/* ---------------------------------------------------------------------- bits */

function RailTitle({ children }: { children: React.ReactNode }) {
  return <p className="label mt-6 mb-1.5 px-2.5 text-mute">{children}</p>;
}

const ROW =
  "flex items-center justify-between gap-2 rounded-md px-2.5 py-[7px] text-[13px] transition-colors";

function NavLink({
  item,
  active,
  subtle = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  subtle?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={ROW}
      style={
        active
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { color: subtle ? "var(--text-soft)" : "var(--text)" }
      }
      data-hover-surface={active ? undefined : "true"}
    >
      <span className="truncate">{item.label}</span>
      <Count value={item.count} active={active} />
    </Link>
  );
}

function FilterLink({
  href,
  label,
  count,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      scroll={false}
      className={ROW}
      style={
        active
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { color: "var(--text-soft)" }
      }
      data-hover-surface={active ? undefined : "true"}
    >
      <span className="truncate">{label}</span>
      <Count value={count} active={active} />
    </Link>
  );
}

function Count({ value, active }: { value?: number; active: boolean }) {
  if (value === undefined) return null;
  return (
    <span
      className="font-mono text-[11px]"
      style={{
        color: active ? "var(--on-accent)" : "var(--text-mute)",
        opacity: active ? 0.8 : 1,
      }}
    >
      {value}
    </span>
  );
}
