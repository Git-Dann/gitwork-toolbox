"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group, Meta } from "@/lib/types";

type NavItem = { href: string; label: string; count?: number };

export type SidebarData = {
  counts: Record<string, number>;
  groups: Group[];
  toolFacets: Meta["toolFacets"];
  starterFacets: Meta["starterFacets"];
};

/**
 * One rail. Below the destinations it carries the filters for whichever list you are
 * looking at — pricing and areas on the tools page, type and verdict on starters — so
 * there is never a second filter column competing with it for width. Topic is not here:
 * 150 options belong in the dropdown beside the search bar, not in a rail.
 *
 * Filters are links that write the query string; the browsers read their state back
 * out of the URL, which also makes every view shareable.
 */
export function Sidebar({ counts, groups, toolFacets, starterFacets }: SidebarData) {
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

      {/* Filters for the list you are actually looking at, and nothing otherwise.
          The rail used to fall back to a "Starter library" block on every other
          page, so Resources, Collections and Explore each carried a five-item
          section belonging to a destination you had not chosen — and the rail
          reshuffled under the cursor on every navigation. The types are still one
          click away: they are the Type filter on /starters.

          These read the query string, so they load inside a boundary and the
          destinations above stay statically rendered. */}
      {pathname === "/tools" ? (
        <Suspense fallback={<RailTitle>Filters</RailTitle>}>
          <ToolFilters counts={counts} groups={groups} facets={toolFacets} onNavigate={close} />
        </Suspense>
      ) : pathname === "/starters" ? (
        <Suspense fallback={<RailTitle>Filters</RailTitle>}>
          <StarterFilters facets={starterFacets} onNavigate={close} />
        </Suspense>
      ) : null}

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
  facets,
  onNavigate,
}: {
  counts: Record<string, number>;
  groups: Group[];
  facets: Meta["toolFacets"];
  onNavigate: () => void;
}) {
  const params = useSearchParams();
  const href = useHrefBuilder("/tools");
  const price = params.get("price") ?? "";
  const group = params.get("group") ?? "";
  const recommended = params.get("recommended") === "1";
  const approved = params.get("approved") === "1";
  const hideDead = params.get("dead") !== "1";

  // Count each option against the filters already applied, ignoring the one being
  // counted — so a number in the rail is always the number of results you would get.
  const countWith = (over: { price?: string; group?: string; recommended?: boolean; approved?: boolean }) =>
    facets.filter((f) => {
      const p = over.price ?? price;
      const g = over.group ?? group;
      const r = over.recommended ?? recommended;
      const a = over.approved ?? approved;
      if (p && f.p !== p) return false;
      if (g && f.g !== g) return false;
      if (r && !f.r) return false;
      if (a && !f.a) return false;
      if (hideDead && f.d) return false;
      return true;
    }).length;

  const pricingOptions = PRICING.map((tier) => ({
    tier,
    count: countWith({ price: tier }),
  })).filter((option) => option.count > 0 || price === option.tier);

  // An area with no matching tools may still hold resources, and an area view lists
  // both — so it stays listed as long as it holds something.
  const areaOptions = groups
    .map((item) => ({ item, count: countWith({ group: item.slug }) }))
    .filter((option) => option.count > 0 || option.item.count > 0 || group === option.item.slug);

  return (
    <>
      <RailTitle>Verdict</RailTitle>
      <nav>
        <FilterLink
          href={href({ recommended: recommended ? null : "1" })}
          label="Recommended"
          count={countWith({ recommended: true })}
          active={recommended}
          onNavigate={onNavigate}
        />
        <FilterLink
          href={href({ approved: approved ? null : "1" })}
          label="Gitwork approved"
          count={countWith({ approved: true })}
          active={approved}
          onNavigate={onNavigate}
        />
      </nav>

      <RailTitle>Pricing</RailTitle>
      <nav>
        <FilterLink
          href={href({ price: null })}
          label="Any"
          count={countWith({ price: "" })}
          active={!price}
          onNavigate={onNavigate}
        />
        {pricingOptions.map((option) => (
          <FilterLink
            key={option.tier}
            href={href({ price: price === option.tier ? null : option.tier })}
            label={option.tier}
            count={option.count}
            active={price === option.tier}
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
        {areaOptions.map((option) => (
          <FilterLink
            key={option.item.slug}
            href={href({ group: group === option.item.slug ? null : option.item.slug })}
            label={option.item.name}
            count={option.item.count}
            active={group === option.item.slug}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

const TYPES = [
  { value: "PROMPT", label: "Prompts" },
  { value: "SKILL", label: "Skills" },
  { value: "KIT", label: "Kits" },
  { value: "PLUGIN", label: "Plugins" },
  { value: "COLLECTION", label: "Collections" },
] as const;

function StarterFilters({
  facets,
  onNavigate,
}: {
  facets: Meta["starterFacets"];
  onNavigate: () => void;
}) {
  const params = useSearchParams();
  const href = useHrefBuilder("/starters");
  const type = params.get("type") ?? "";
  const tag = params.get("tag") ?? "";
  const recommended = params.get("recommended") === "1";

  const inType = type ? facets.filter((f) => f.t === type) : facets;

  // Switching type drops a topic that does not exist inside it.
  const typeHref = (value: string | null) => {
    const keepTag =
      tag && (!value || facets.some((f) => f.t === value && f.g.includes(tag))) ? tag : null;
    return href({ type: value, tag: keepTag });
  };

  const typeCount = (value: string) =>
    facets.filter((f) => f.t === value && (!tag || f.g.includes(tag)) && (!recommended || f.r))
      .length;

  return (
    <>
      <RailTitle>Type</RailTitle>
      <nav>
        <FilterLink
          href={typeHref(null)}
          label="Everything"
          count={facets.filter((f) => (!tag || f.g.includes(tag)) && (!recommended || f.r)).length}
          active={!type}
          onNavigate={onNavigate}
        />
        {TYPES.map((item) => (
          <FilterLink
            key={item.value}
            href={typeHref(type === item.value ? null : item.value)}
            label={item.label}
            count={typeCount(item.value)}
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
          count={inType.filter((f) => f.r && (!tag || f.g.includes(tag))).length}
          active={recommended}
          onNavigate={onNavigate}
        />
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
