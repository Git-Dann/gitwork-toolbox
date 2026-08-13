"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CompactRow, ToolCard } from "@/components/cards";
import { SearchField } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
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

const USEFULNESS_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Unknown: 3,
  None: 4,
  "Not assessed": 5,
};

/**
 * Filtering lives in the sidebar as links that write the query string; this reads
 * it back out. Search and sort are local, and get mirrored into the URL so a view
 * can be pasted to someone.
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
  const recommendedOnly = params.get("recommended") === "1";
  const approvedOnly = params.get("approved") === "1";
  const hideDead = params.get("dead") !== "1";

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "verdict");
  const lastWritten = useRef<string | null>(null);

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

  // The area counts include resources, so an area view has to show them too.
  const areaResources = useMemo(() => {
    if (!group) return [];
    const q = query.trim().toLowerCase();
    return resources.filter(
      (resource) => resource.group === group && (!q || resource.name.toLowerCase().includes(q)),
    );
  }, [resources, group, query]);

  const groupName = groups.find((item) => item.slug === group)?.name;
  const activeChips = [groupName, pricing, recommendedOnly ? "Recommended" : null].filter(Boolean);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchField value={query} onChange={setQuery} placeholder="Search tools…" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
        {activeChips.map((chip) => (
          <Badge key={chip as string} tone="accent">
            {chip}
          </Badge>
        ))}
        {activeChips.length || query.trim() ? (
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
