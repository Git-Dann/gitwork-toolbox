"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StarterCard } from "@/components/cards";
import { SearchField } from "@/components/filter-ui";
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

/** Type, topic and verdict filters live in the sidebar; this reads them off the URL. */
export function StarterBrowser({
  starters,
  tags,
}: {
  starters: StarterListItem[];
  tags: Tag[];
}) {
  const params = useSearchParams();

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

  const chips = [
    type ? TYPE_LABEL[type] : null,
    tag ? (tags.find((item) => item.tag === tag)?.label ?? tag) : null,
    recommendedOnly ? "Recommended" : null,
  ].filter(Boolean);

  return (
    <div>
      <SearchField value={query} onChange={setQuery} placeholder="Search starters…" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {filtered.length} {filtered.length === 1 ? "starter" : "starters"}
        </p>
        {chips.map((chip) => (
          <Badge key={chip as string} tone="accent">
            {chip}
          </Badge>
        ))}
        {chips.length || query.trim() ? (
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
