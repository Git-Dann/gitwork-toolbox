"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StarterCard } from "@/components/cards";
import { Collapsible, FilterGroup, FilterOption, SearchField, Toggle } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { StarterListItem, StarterType, Tag } from "@/lib/types";

const TYPES: { value: StarterType; label: string }[] = [
  { value: "PROMPT", label: "Prompts" },
  { value: "SKILL", label: "Skills" },
  { value: "KIT", label: "Kits" },
  { value: "COLLECTION", label: "Collections" },
  { value: "PLUGIN", label: "Plugins" },
];

const PAGE = 36;

export function StarterBrowser({
  starters,
  tags,
}: {
  starters: StarterListItem[];
  tags: Tag[];
}) {
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "");
  const [featuredOnly, setFeaturedOnly] = useState(params.get("featured") === "1");
  const [recommendedOnly, setRecommendedOnly] = useState(params.get("recommended") === "1");
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (type) next.set("type", type);
    if (tag) next.set("tag", tag);
    if (featuredOnly) next.set("featured", "1");
    if (recommendedOnly) next.set("recommended", "1");
    const search = next.toString();
    window.history.replaceState(null, "", search ? `/starters?${search}` : "/starters");
  }, [query, type, tag, featuredOnly, recommendedOnly]);

  useEffect(() => setLimit(PAGE), [query, type, tag, featuredOnly, recommendedOnly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return starters.filter((starter) => {
      if (type && starter.type !== type) return false;
      if (tag && !starter.tags.includes(tag)) return false;
      if (featuredOnly && !starter.featured) return false;
      if (recommendedOnly && !starter.recommended) return false;
      if (!q) return true;
      return (
        starter.name.toLowerCase().includes(q) ||
        starter.summary.toLowerCase().includes(q) ||
        starter.tags.some((item) => item.includes(q))
      );
    });
  }, [starters, query, type, tag, featuredOnly, recommendedOnly]);

  const reset = () => {
    setQuery("");
    setType("");
    setTag("");
    setFeaturedOnly(false);
    setRecommendedOnly(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <button
        type="button"
        onClick={() => setShowFilters((value) => !value)}
        aria-expanded={showFilters}
        className="label flex items-center justify-between rounded-full border px-4 py-3 lg:hidden"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <span>{showFilters ? "Hide filters" : "Filters"}</span>
        <span className="text-mute">{filtered.length} shown</span>
      </button>

      <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
        <div className="lg:sticky lg:top-8">
          <FilterGroup title="Type">
            <FilterOption
              label="Everything"
              count={starters.length}
              active={!type}
              onClick={() => setType("")}
            />
            {TYPES.map((item) => (
              <FilterOption
                key={item.value}
                label={item.label}
                count={starters.filter((starter) => starter.type === item.value).length}
                active={type === item.value}
                onClick={() => setType(type === item.value ? "" : item.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Verdict">
            <Toggle
              label="Recommended only"
              hint="Flagged by Dan or Harry"
              active={recommendedOnly}
              onClick={() => setRecommendedOnly((value) => !value)}
            />
            <Toggle
              label="Featured in Foundry"
              active={featuredOnly}
              onClick={() => setFeaturedOnly((value) => !value)}
            />
          </FilterGroup>

          <FilterGroup title="Topic & model">
            <Collapsible visible={10} moreLabel="All topics">
              {tags.map((item) => (
                <FilterOption
                  key={item.tag}
                  label={item.label}
                  count={item.count}
                  active={tag === item.tag}
                  onClick={() => setTag(tag === item.tag ? "" : item.tag)}
                />
              ))}
            </Collapsible>
          </FilterGroup>
        </div>
      </aside>

      <div className="min-w-0">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search prompts, skills and kits…"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="label text-mute">
            {filtered.length} {filtered.length === 1 ? "starter" : "starters"}
          </p>
          {type ? <Badge tone="accent">{TYPES.find((t) => t.value === type)?.label}</Badge> : null}
          {tag ? <Badge tone="accent">{tags.find((t) => t.tag === tag)?.label ?? tag}</Badge> : null}
          {query.trim() || type || tag || featuredOnly ? (
            <button type="button" onClick={reset} className="label text-accent hover:underline">
              Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="surface mt-6 p-8 text-center">
            <p className="display text-xl">No starters match that.</p>
            <button
              type="button"
              onClick={reset}
              className="label mt-5 rounded-full px-4 py-2.5"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.slice(0, limit).map((starter) => (
                <StarterCard key={starter.slug} starter={starter} />
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
    </div>
  );
}
