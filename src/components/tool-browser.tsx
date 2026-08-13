"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToolCard } from "@/components/cards";
import { FilterGroup, FilterOption, SearchField, Toggle } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { Group, Pricing, ToolListItem } from "@/lib/types";

const PRICING: Pricing[] = ["Free", "Freemium", "Paid"];

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
}: {
  tools: ToolListItem[];
  groups: Group[];
}) {
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [group, setGroup] = useState(params.get("group") ?? "");
  const [pricing, setPricing] = useState(params.get("price") ?? "");
  const [recommendedOnly, setRecommendedOnly] = useState(params.get("recommended") === "1");
  const [approvedOnly, setApprovedOnly] = useState(params.get("approved") === "1");
  const [hideDead, setHideDead] = useState(params.get("dead") !== "1");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "verdict");
  const [showFilters, setShowFilters] = useState(false);

  // Filters live in the URL so any view can be pasted into Slack.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (group) next.set("group", group);
    if (pricing) next.set("price", pricing);
    if (recommendedOnly) next.set("recommended", "1");
    if (approvedOnly) next.set("approved", "1");
    if (!hideDead) next.set("dead", "1");
    if (sort !== "verdict") next.set("sort", sort);
    const search = next.toString();
    window.history.replaceState(null, "", search ? `/tools?${search}` : "/tools");
  }, [query, group, pricing, recommendedOnly, approvedOnly, hideDead, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools
      .filter((tool) => {
        if (group && tool.group !== group) return false;
        if (pricing && tool.pricing !== pricing) return false;
        if (recommendedOnly && !tool.recommended) return false;
        if (approvedOnly && !tool.approved) return false;
        if (hideDead && tool.linkStatus === "dead") return false;
        if (!q) return true;
        return (
          tool.name.toLowerCase().includes(q) ||
          tool.what.toLowerCase().includes(q) ||
          tool.category.toLowerCase().includes(q) ||
          tool.domain.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "category") {
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        }
        return (
          Number(b.recommended) - Number(a.recommended) ||
          USEFULNESS_RANK[a.usefulness] - USEFULNESS_RANK[b.usefulness] ||
          a.name.localeCompare(b.name)
        );
      });
  }, [tools, query, group, pricing, recommendedOnly, approvedOnly, hideDead, sort]);

  const reset = useCallback(() => {
    setQuery("");
    setGroup("");
    setPricing("");
    setRecommendedOnly(false);
    setApprovedOnly(false);
    setHideDead(true);
    setSort("verdict");
  }, []);

  const activeFilters =
    (query.trim() ? 1 : 0) +
    (group ? 1 : 0) +
    (pricing ? 1 : 0) +
    (recommendedOnly ? 1 : 0) +
    (approvedOnly ? 1 : 0);

  const groupName = groups.find((item) => item.slug === group)?.name;

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
        <span className="text-mute">
          {activeFilters ? `${activeFilters} active` : `${filtered.length} shown`}
        </span>
      </button>

      <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
        <div className="lg:sticky lg:top-8">
          <FilterGroup title="Verdict">
            <Toggle
              label="Recommended only"
              hint="Flagged by Dan or Harry"
              active={recommendedOnly}
              onClick={() => setRecommendedOnly((value) => !value)}
            />
            <Toggle
              label="Gitwork approved only"
              hint="Cleared for client work"
              active={approvedOnly}
              onClick={() => setApprovedOnly((value) => !value)}
            />
            <Toggle
              label="Hide dead links"
              hint="404s and domains that no longer resolve"
              active={hideDead}
              onClick={() => setHideDead((value) => !value)}
            />
          </FilterGroup>

          <FilterGroup title="Pricing">
            <FilterOption
              label="Any"
              count={tools.length}
              active={!pricing}
              onClick={() => setPricing("")}
            />
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

          <FilterGroup title="Area">
            <FilterOption label="Everything" active={!group} onClick={() => setGroup("")} />
            {groups
              .map((item) => ({
                ...item,
                tools: tools.filter((tool) => tool.group === item.slug).length,
              }))
              .filter((item) => item.tools > 0)
              .map((item) => (
                <FilterOption
                  key={item.slug}
                  label={item.name}
                  count={item.tools}
                  active={group === item.slug}
                  onClick={() => setGroup(group === item.slug ? "" : item.slug)}
                />
              ))}
          </FilterGroup>
        </div>
      </aside>

      <div className="min-w-0">
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
              className="rounded-full border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-input)",
                color: "var(--text)",
              }}
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
          {groupName ? <Badge tone="accent">{groupName}</Badge> : null}
          {pricing ? <Badge tone="accent">{pricing}</Badge> : null}
          {recommendedOnly ? <Badge tone="solid">Recommended</Badge> : null}
          {activeFilters ? (
            <button type="button" onClick={reset} className="label text-accent hover:underline">
              Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="surface mt-6 p-8 text-center">
            <p className="display text-xl">Nothing matches that.</p>
            <p className="mt-2 text-sm text-soft">
              Try a broader area, or clear the filters and search again.
            </p>
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
