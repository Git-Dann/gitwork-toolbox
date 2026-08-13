"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/cards";
import { Collapsible, FilterGroup, FilterOption, SearchField, Toggle } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { Category, Group, Pricing, ToolListItem } from "@/lib/types";

const PRICING: Pricing[] = ["Free", "Freemium", "Paid"];
const PAGE = 48;

type Sort = "verdict" | "name" | "category";

const SORTS: { value: Sort; label: string }[] = [
  { value: "verdict", label: "Gitwork verdict" },
  { value: "name", label: "A–Z" },
  { value: "category", label: "Category" },
];

const USEFULNESS_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Unknown: 3,
  None: 4,
  "Not assessed": 5,
};

export function ToolBrowser({
  tools,
  groups,
  categories,
}: {
  tools: ToolListItem[];
  groups: Group[];
  categories: Category[];
}) {
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [group, setGroup] = useState(params.get("group") ?? "");
  const [category, setCategory] = useState(params.get("cat") ?? "");
  const [pricing, setPricing] = useState<string>(params.get("price") ?? "");
  const [assessedOnly, setAssessedOnly] = useState(params.get("assessed") === "1");
  const [picksOnly, setPicksOnly] = useState(params.get("picks") === "1");
  const [hideDead, setHideDead] = useState(params.get("dead") !== "1");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "verdict");
  const [limit, setLimit] = useState(PAGE);
  // On a phone the filter panel is taller than the screen, so results come first
  // and filtering is behind a toggle.
  const [showFilters, setShowFilters] = useState(false);

  // Filters live in the URL so any view can be pasted into Slack.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (group) next.set("group", group);
    if (category) next.set("cat", category);
    if (pricing) next.set("price", pricing);
    if (assessedOnly) next.set("assessed", "1");
    if (picksOnly) next.set("picks", "1");
    if (!hideDead) next.set("dead", "1");
    if (sort !== "verdict") next.set("sort", sort);
    const search = next.toString();
    window.history.replaceState(null, "", search ? `/tools?${search}` : "/tools");
  }, [query, group, category, pricing, assessedOnly, picksOnly, hideDead, sort]);

  useEffect(() => setLimit(PAGE), [query, group, category, pricing, assessedOnly, picksOnly, sort]);

  const visibleCategories = useMemo(
    () => categories.filter((item) => !group || item.group === group),
    [categories, group],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = tools.filter((tool) => {
      if (group && tool.group !== group) return false;
      if (category && tool.category !== category) return false;
      if (pricing && tool.pricing !== pricing) return false;
      if (assessedOnly && !tool.assessed) return false;
      if (picksOnly && !(tool.assessed && tool.usefulness === "High")) return false;
      if (hideDead && tool.linkStatus === "dead") return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.what.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.domain.toLowerCase().includes(q)
      );
    });

    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "category") {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      }
      return (
        USEFULNESS_RANK[a.usefulness] - USEFULNESS_RANK[b.usefulness] ||
        Number(b.assessed) - Number(a.assessed) ||
        a.name.localeCompare(b.name)
      );
    });
  }, [tools, query, group, category, pricing, assessedOnly, picksOnly, hideDead, sort]);

  const reset = useCallback(() => {
    setQuery("");
    setGroup("");
    setCategory("");
    setPricing("");
    setAssessedOnly(false);
    setPicksOnly(false);
    setHideDead(true);
    setSort("verdict");
  }, []);

  const activeFilters =
    (query.trim() ? 1 : 0) +
    (group ? 1 : 0) +
    (category ? 1 : 0) +
    (pricing ? 1 : 0) +
    (assessedOnly ? 1 : 0) +
    (picksOnly ? 1 : 0);

  const groupName = groups.find((item) => item.slug === group)?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <button
        type="button"
        onClick={() => setShowFilters((value) => !value)}
        aria-expanded={showFilters}
        className="hairline label flex items-center justify-between rounded-full border bg-white px-4 py-3 lg:hidden"
      >
        <span>{showFilters ? "Hide filters" : "Filters"}</span>
        <span className="text-mute">
          {activeFilters ? `${activeFilters} active` : `${filtered.length} shown`}
        </span>
      </button>

      <aside
        className={`${showFilters ? "block" : "hidden"} lg:sticky lg:top-40 lg:block lg:self-start`}
      >
        <div className="card p-4">
          <FilterGroup title="Pricing">
            <FilterOption label="Any" active={!pricing} onClick={() => setPricing("")} />
            {PRICING.map((tier) => (
              <FilterOption
                key={tier}
                label={tier}
                count={tools.filter((tool) => tool.pricing === tier).length}
                active={pricing === tier}
                onClick={() => setPricing(pricing === tier ? "" : tier)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Trust">
            <Toggle
              label="Gitwork assessed only"
              hint="Fetched and reviewed by us"
              active={assessedOnly}
              onClick={() => setAssessedOnly((value) => !value)}
            />
            <Toggle
              label="Gitwork picks only"
              hint="Rated high value"
              active={picksOnly}
              onClick={() => setPicksOnly((value) => !value)}
            />
            <Toggle
              label="Hide dead links"
              hint="404s and domains that no longer resolve"
              active={hideDead}
              onClick={() => setHideDead((value) => !value)}
            />
          </FilterGroup>

          <FilterGroup title="Area">
            <FilterOption
              label="Everything"
              count={tools.length}
              active={!group}
              onClick={() => {
                setGroup("");
                setCategory("");
              }}
            />
            {groups.map((item) => (
              <FilterOption
                key={item.slug}
                label={item.name}
                count={item.count}
                active={group === item.slug}
                onClick={() => {
                  setGroup(group === item.slug ? "" : item.slug);
                  setCategory("");
                }}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Category">
            <Collapsible visible={8} moreLabel="All categories">
              {visibleCategories.map((item) => (
                <FilterOption
                  key={item.name}
                  label={item.name}
                  count={item.count}
                  active={category === item.name}
                  onClick={() => setCategory(category === item.name ? "" : item.name)}
                />
              ))}
            </Collapsible>
          </FilterGroup>
        </div>
      </aside>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search by name, what it does, category or domain…"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="label text-mute" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="hairline rounded-full border bg-white px-3 py-2 text-sm outline-none"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="label text-mute">
            {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
          </p>
          {groupName ? <Badge tone="signal">{groupName}</Badge> : null}
          {category ? <Badge tone="signal">{category}</Badge> : null}
          {pricing ? <Badge tone="signal">{pricing}</Badge> : null}
          {picksOnly ? <Badge tone="solid">Picks</Badge> : null}
          {activeFilters ? (
            <button type="button" onClick={reset} className="label text-signal hover:underline">
              Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="card mt-6 p-8 text-center">
            <p className="font-display text-xl">Nothing matches that.</p>
            <p className="mt-2 text-sm text-mute">
              Try a broader area, or clear the filters and search again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="label mt-4 rounded-full bg-ink px-4 py-2 text-paper"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, limit).map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>

            {filtered.length > limit ? (
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLimit((value) => value + PAGE)}
                  className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-85"
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
