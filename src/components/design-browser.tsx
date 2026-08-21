"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchField, Select, useFilterWriter } from "@/components/filter-ui";
import type { DesignApp } from "@/lib/types";

const PAGE = 48;

/**
 * Same control shape as the tools and starters lists: search, then dropdowns, all of it
 * in the URL. Category counts are computed against the search, so a count is what
 * choosing it would actually return.
 */
export function DesignBrowser({
  apps,
  categories,
}: {
  apps: DesignApp[];
  categories: { slug: string; label: string; count: number }[];
}) {
  const params = useSearchParams();
  const write = useFilterWriter("/design-md");

  const category = params.get("category") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [limit, setLimit] = useState(PAGE);
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    const search = next.toString();
    if (search === params.toString() || search === lastWritten.current) return;
    lastWritten.current = search;
    window.history.replaceState(null, "", search ? `/design-md?${search}` : "/design-md");
  }, [query, params]);

  useEffect(() => {
    const incoming = params.get("q") ?? "";
    setQuery((current) => (current === incoming ? current : incoming));
  }, [params]);

  useEffect(() => setLimit(PAGE), [query, category]);

  const matchesQuery = (app: DesignApp, q: string) =>
    !q || app.name.toLowerCase().includes(q) || app.summary.toLowerCase().includes(q);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => (!category || app.category === category) && matchesQuery(app, q));
  }, [apps, category, query]);

  const categoryOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inQuery = apps.filter((app) => matchesQuery(app, q));
    const options = categories
      .map((item) => ({ item, count: inQuery.filter((app) => app.category === item.slug).length }))
      .filter((o) => o.count > 0 || category === o.item.slug)
      .map((o) => ({ value: o.item.slug, label: `${o.item.label} (${o.count})` }));
    return [{ value: "", label: `All categories (${inQuery.length})` }, ...options];
  }, [apps, categories, category, query]);

  return (
    <div>
      <div className="flex flex-col gap-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search 200 apps — name, colour, typeface…"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            ariaLabel="Category"
            value={category}
            onChange={(value) => write({ category: value })}
            options={categoryOptions}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {filtered.length} {filtered.length === 1 ? "app" : "apps"}
        </p>
        {category || query.trim() ? (
          <a href="/design-md" className="label text-accent hover:underline">
            Clear
          </a>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="surface mt-5 p-8 text-center">
          <p className="display text-xl">No matches.</p>
          <a
            href="/design-md"
            className="label mt-5 inline-block rounded-full px-4 py-2.5"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Clear filters
          </a>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {filtered.slice(0, limit).map((app) => (
              <Link
                key={app.slug}
                href={`/design-md/${app.slug}`}
                className="surface surface-hover group flex h-full min-w-0 flex-col overflow-hidden p-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {app.accent ? (
                    <span
                      aria-hidden
                      className="h-7 w-7 shrink-0 rounded-lg border"
                      style={{ background: app.accent, borderColor: "var(--border)" }}
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{app.name}</span>
                  {app.accent ? (
                    <span className="font-mono text-[10px] text-mute">{app.accent}</span>
                  ) : null}
                </div>
                <p className="prose-tight mt-2.5 line-clamp-3 text-[0.82rem] leading-relaxed text-soft">
                  {app.descriptor}
                </p>
                <p className="label mt-auto pt-3 text-mute">
                  {app.flavours.length} flavours · {Math.round(app.bytes / 1024)}KB
                </p>
              </Link>
            ))}
          </div>

          {filtered.length > limit ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setLimit((value) => value + PAGE)}
                className="rounded-full px-5 py-2.5 text-sm transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Load {Math.min(PAGE, filtered.length - limit)} more
              </button>
              <p className="label text-mute">
                Showing {limit} of {filtered.length}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
