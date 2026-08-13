"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StarterCard } from "@/components/cards";
import { SearchField, Select } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { StarterListItem, Tag } from "@/lib/types";

const PAGE = 36;

const TYPE_LABEL: Record<string, string> = {
  PROMPT: "Prompts",
  SKILL: "Skills",
  KIT: "Kits",
  COLLECTION: "Collections",
  PLUGIN: "Plugins",
};

/**
 * Type and verdict live in the sidebar and are read off the URL. Topic sits here, at the
 * end of the search bar — there are 150 of them, which is a list, not a rail.
 */
export function StarterBrowser({
  starters,
  tags,
}: {
  starters: StarterListItem[];
  tags: Tag[];
}) {
  const params = useSearchParams();
  const router = useRouter();

  const type = params.get("type") ?? "";
  const tag = params.get("tag") ?? "";
  const recommendedOnly = params.get("recommended") === "1";
  const featuredOnly = params.get("featured") === "1";

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
    window.history.replaceState(null, "", search ? `/starters?${search}` : "/starters");
  }, [query, params]);

  useEffect(() => {
    const incoming = params.get("q") ?? "";
    setQuery((current) => (current === incoming ? current : incoming));
  }, [params]);

  useEffect(() => setLimit(PAGE), [query, type, tag, recommendedOnly, featuredOnly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return starters.filter((starter) => {
      if (type && starter.type !== type) return false;
      if (tag && !starter.tags.includes(tag)) return false;
      if (recommendedOnly && !starter.recommended) return false;
      if (featuredOnly && !starter.featured) return false;
      if (!q) return true;
      return (
        starter.name.toLowerCase().includes(q) ||
        starter.summary.toLowerCase().includes(q) ||
        starter.tags.some((item) => item.includes(q))
      );
    });
  }, [starters, query, type, tag, recommendedOnly, featuredOnly]);

  const labelFor = (value: string) => tags.find((item) => item.tag === value)?.label ?? value;

  // Only topics present in what is currently selected, counted within it, so picking one
  // can never land on an empty grid. Alphabetical, because a 150-option list is scanned
  // and typed at rather than read top to bottom.
  const topicOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const starter of starters) {
      if (type && starter.type !== type) continue;
      if (recommendedOnly && !starter.recommended) continue;
      if (featuredOnly && !starter.featured) continue;
      for (const item of starter.tags) {
        if (item === "prompt-library") continue;
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    const options = [...counts.entries()]
      .map(([value, count]) => ({ value, label: `${labelFor(value)} (${count})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: "", label: counts.size ? `All topics (${counts.size})` : "All topics" },
      // A topic arriving from an old link stays selected rather than silently resetting.
      ...(tag && !counts.has(tag) ? [{ value: tag, label: `${labelFor(tag)} (0)` }] : []),
      ...options,
    ];
  }, [starters, tags, type, recommendedOnly, featuredOnly, tag]);

  // The URL is the source of truth — the sidebar counts read the tag back out of it, so
  // this goes through the router rather than a bare history.replaceState.
  const selectTopic = (value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set("tag", value);
    else next.delete("tag");
    const search = next.toString();
    lastWritten.current = search;
    router.replace(search ? `/starters?${search}` : "/starters", { scroll: false });
  };

  const chips = [
    type ? TYPE_LABEL[type] : null,
    recommendedOnly ? "Recommended" : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchField value={query} onChange={setQuery} placeholder="Search starters…" />
        </div>
        <Select
          id="topic"
          ariaLabel="Topic"
          value={tag}
          onChange={selectTopic}
          options={topicOptions}
          className="shrink-0 sm:w-52"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {filtered.length} {filtered.length === 1 ? "starter" : "starters"}
        </p>
        {chips.map((chip) => (
          <Badge key={chip as string} tone="accent">
            {chip}
          </Badge>
        ))}
        {chips.length || tag || query.trim() ? (
          <a href="/starters" className="label text-accent hover:underline">
            Clear
          </a>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="surface mt-5 p-8 text-center">
          <p className="display text-xl">No matches.</p>
          <a
            href="/starters"
            className="label mt-5 inline-block rounded-full px-4 py-2.5"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Clear filters
          </a>
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
  );
}
