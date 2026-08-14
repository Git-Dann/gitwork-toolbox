"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CompactRow, ToolCard } from "@/components/cards";
import { SearchField, Select, useFilterWriter } from "@/components/filter-ui";
import type { Group, ToolListItem } from "@/lib/types";

/** Resources share the same areas as tools, so an area view lists both. */
export type ResourceListItem = {
  slug: string;
  name: string;
  resourceType: string;
  group: string;
  recommended: boolean;
  approved: boolean;
  icon: string | null;
};

type Sort = "verdict" | "name" | "category";

const SORTS: { value: Sort; label: string }[] = [
  { value: "verdict", label: "Verdict" },
  { value: "name", label: "A–Z" },
  { value: "category", label: "Category" },
];

const PRICING = ["Free", "Freemium", "Paid"] as const;

const VERDICTS = [
  { value: "recommended", label: "Recommended" },
  { value: "approved", label: "Gitwork approved" },
] as const;

const USEFULNESS_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Unknown: 3,
  None: 4,
  "Not assessed": 5,
};

/**
 * Every control sits above the grid it controls: search, then area, pricing, verdict and
 * sort as dropdowns. All of it round-trips through the URL, so a filtered view can be
 * pasted to someone.
 *
 * Option counts are computed against the filters already applied — the number next to
 * "Free" is how many results choosing it would actually give — and an option that would
 * empty the grid is not offered at all.
 */
export function ToolBrowser({
  tools,
  resources,
  groups,
}: {
  tools: ToolListItem[];
  resources: ResourceListItem[];
  groups: Group[];
}) {
  const params = useSearchParams();

  const group = params.get("group") ?? "";
  const pricing = params.get("price") ?? "";
  // Recommended and approved were separate toggles and are now one dropdown. Old links
  // carrying either param still resolve, with recommended winning if both are set.
  const verdict = params.get("recommended") === "1"
    ? "recommended"
    : params.get("approved") === "1"
      ? "approved"
      : "";
  const hideDead = params.get("dead") !== "1";

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "verdict");
  const lastWritten = useRef<string | null>(null);
  const write = useFilterWriter("/tools");

  // Mirror search and sort back into the URL without stamping on the rail's filters.
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    if (sort !== "verdict") next.set("sort", sort);
    else next.delete("sort");
    const search = next.toString();
    if (search === params.toString() || search === lastWritten.current) return;
    lastWritten.current = search;
    window.history.replaceState(null, "", search ? `/tools?${search}` : "/tools");
  }, [query, sort, params]);

  // Adopt a query typed or linked from elsewhere.
  useEffect(() => {
    const incoming = params.get("q") ?? "";
    setQuery((current) => (current === incoming ? current : incoming));
  }, [params]);

  // One matcher, so the counts and the grid can never disagree about what a filter means.
  const matches = useMemo(
    () =>
      (tool: ToolListItem, over: { group?: string; pricing?: string; verdict?: string } = {}) => {
        const g = over.group ?? group;
        const p = over.pricing ?? pricing;
        const v = over.verdict ?? verdict;
        if (g && tool.group !== g) return false;
        if (p && tool.pricing !== p) return false;
        if (v === "recommended" && !tool.recommended) return false;
        if (v === "approved" && !tool.approved) return false;
        if (hideDead && tool.linkStatus === "dead") return false;
        return true;
      },
    [group, pricing, verdict, hideDead],
  );

  const countWith = (over: { group?: string; pricing?: string; verdict?: string }) =>
    tools.filter((tool) => matches(tool, over)).length;

  const areaOptions = useMemo(() => {
    // An area holding only resources still leads somewhere — the area view lists them
    // beneath the grid — so it stays offered at zero tools. That only holds while nothing
    // else is narrowing though: pricing and verdict apply to tools and not to resources,
    // so under those filters a zero-tool area really is a dead end and is dropped.
    const narrowed = Boolean(pricing || verdict);
    const options = groups
      .map((item) => ({ item, count: countWith({ group: item.slug }) }))
      .filter(
        (o) =>
          o.count > 0 ||
          group === o.item.slug ||
          (!narrowed && o.item.count > 0),
      )
      .map((o) => ({ value: o.item.slug, label: `${o.item.name} (${o.count})` }));
    return [{ value: "", label: `All areas (${countWith({ group: "" })})` }, ...options];
  }, [groups, tools, group, pricing, verdict, hideDead]);

  const pricingOptions = useMemo(() => {
    const options = PRICING.map((tier) => ({ tier, count: countWith({ pricing: tier }) }))
      .filter((o) => o.count > 0 || pricing === o.tier)
      .map((o) => ({ value: o.tier, label: `${o.tier} (${o.count})` }));
    return [{ value: "", label: `Any pricing (${countWith({ pricing: "" })})` }, ...options];
  }, [tools, group, pricing, verdict, hideDead]);

  const verdictOptions = useMemo(() => {
    const options = VERDICTS.map((item) => ({ item, count: countWith({ verdict: item.value }) }))
      .filter((o) => o.count > 0 || verdict === o.item.value)
      .map((o) => ({ value: o.item.value, label: `${o.item.label} (${o.count})` }));
    return [{ value: "", label: `Any verdict (${countWith({ verdict: "" })})` }, ...options];
  }, [tools, group, pricing, verdict, hideDead]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools
      .filter((tool) => {
        if (!matches(tool)) return false;
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
  }, [tools, query, matches, sort]);

  // The area counts include resources, so an area view has to show them too.
  const areaResources = useMemo(() => {
    if (!group) return [];
    const q = query.trim().toLowerCase();
    return resources.filter(
      (resource) => resource.group === group && (!q || resource.name.toLowerCase().includes(q)),
    );
  }, [resources, group, query]);

  const groupName = groups.find((item) => item.slug === group)?.name;
  const hasFilter = Boolean(group || pricing || verdict || query.trim());

  return (
    <div>
      <div className="flex flex-col gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search tools…" />
        <div className="flex flex-wrap gap-2">
          <Select
            ariaLabel="Area"
            value={group}
            onChange={(value) => write({ group: value })}
            options={areaOptions}
          />
          <Select
            ariaLabel="Pricing"
            value={pricing}
            onChange={(value) => write({ price: value })}
            options={pricingOptions}
          />
          <Select
            ariaLabel="Verdict"
            value={verdict}
            onChange={(value) =>
              write({
                recommended: value === "recommended" ? "1" : null,
                approved: value === "approved" ? "1" : null,
              })
            }
            options={verdictOptions}
          />
          <Select
            id="sort"
            ariaLabel="Sort"
            value={sort}
            onChange={(value) => setSort(value as Sort)}
            options={SORTS.map((s) => ({ ...s, label: `Sort: ${s.label}` }))}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
          {groupName ? ` · ${groupName}` : ""}
        </p>
        {hasFilter ? (
          <a href="/tools" className="label text-accent hover:underline">
            Clear
          </a>
        ) : null}
      </div>

      {filtered.length === 0 && areaResources.length === 0 ? (
        <div className="surface mt-5 p-8 text-center">
          <p className="display text-xl">No matches.</p>
          <a
            href="/tools"
            className="label mt-5 inline-block rounded-full px-4 py-2.5"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Clear filters
          </a>
        </div>
      ) : (
        <>
          {filtered.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          ) : null}

          {areaResources.length ? (
            <div className="mt-8 border-t border-hair pt-6">
              <p className="label mb-3 text-mute">Resources · {groupName}</p>
              <div className="grid gap-x-8 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
                {areaResources.map((resource) => (
                  <CompactRow
                    key={resource.slug}
                    href={`/resources/${resource.slug}`}
                    name={resource.name}
                    descriptor={resource.resourceType}
                    recommended={resource.recommended}
                    approved={resource.approved}
                    icon={resource.icon}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
