"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/filter-ui";
import { Badge } from "@/components/ui";

export type QueueItem = {
  url: string;
  name: string;
  host: string | null;
  discoveredVia: string;
  sourceCategory: string | null;
  claim: string | null;
  claimedTier: string | null;
  title: string;
  description: string;
  figures: string[];
  priceSource: string | null;
  mentionsFree: boolean;
  licence: string | null;
  blocked: boolean;
  stars?: number;
  pushedAt?: string;
  archived?: boolean;
};

/**
 * The gate. Every card shows only what was actually verified — the vendor's own words and
 * the figures their pricing page served — next to what the directory claimed, because the
 * two disagree often enough to matter. Approving publishes it marked "Not assessed";
 * rejecting stops discovery offering the domain again.
 */
export function ProposalQueue({ items, canSave }: { items: QueueItem[]; canSave: boolean }) {
  const [decisions, setDecisions] = useState<Record<string, "approve" | "reject">>({});
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ busy: boolean; message?: string; error?: string }>({
    busy: false,
  });

  const sources = useMemo(
    () => [...new Set(items.map((item) => item.discoveredVia))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!source || item.discoveredVia === source) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          (item.host ?? "").includes(q) ||
          item.description.toLowerCase().includes(q)),
    );
  }, [items, source, query]);

  const pendingCount = Object.keys(decisions).length;

  async function publish() {
    setState({ busy: true });
    try {
      const response = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisions: Object.entries(decisions).map(([url, decision]) => ({ url, decision })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "That did not save.");
      setDecisions({});
      setState({
        busy: false,
        message: `${body.approved} published, ${body.rejected} rejected. The site rebuilds in about a minute.`,
      });
    } catch (error) {
      setState({ busy: false, error: error instanceof Error ? error.message : "That did not save." });
    }
  }

  if (!items.length) {
    return (
      <p className="label py-8 text-center text-mute">
        Queue empty — run <code className="font-mono">npm run discover</code> then{" "}
        <code className="font-mono">npm run assess</code>.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the queue…"
            className="w-full rounded-full border py-2.5 pl-4 pr-4 text-sm outline-none transition-colors placeholder:text-[var(--text-mute)] focus:border-[var(--accent)]"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-input)",
              color: "var(--text)",
            }}
          />
        </div>
        <Select
          ariaLabel="Source"
          value={source}
          onChange={setSource}
          className="shrink-0 sm:w-52"
          options={[
            { value: "", label: `All sources (${items.length})` },
            ...sources.map((item) => ({
              value: item,
              label: `${item} (${items.filter((entry) => entry.discoveredVia === item).length})`,
            })),
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {visible.length} pending · {pendingCount} decided
        </p>
        {pendingCount ? (
          <button
            type="button"
            onClick={publish}
            disabled={state.busy || !canSave}
            className="label rounded-full px-4 py-2 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            {state.busy ? "Publishing…" : `Publish ${pendingCount}`}
          </button>
        ) : null}
        {state.message ? <span className="label text-accent">{state.message}</span> : null}
        {state.error ? <span className="label text-[var(--danger,#ff6b6b)]">{state.error}</span> : null}
      </div>

      <div className="mt-5 space-y-3">
        {visible.slice(0, 60).map((item) => {
          const decision = decisions[item.url];
          return (
            <div key={item.url} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-[var(--accent)]"
                  >
                    {item.name} ↗
                  </a>
                  <p className="mt-0.5 font-mono text-[11px] text-mute">{item.host}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((current) => ({ ...current, [item.url]: "approve" }))
                    }
                    className="label rounded-full border px-3 py-1.5"
                    style={
                      decision === "approve"
                        ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                        : { borderColor: "var(--border)", color: "var(--text-soft)" }
                    }
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisions((current) => ({ ...current, [item.url]: "reject" }))}
                    className="label rounded-full border px-3 py-1.5"
                    style={
                      decision === "reject"
                        ? { background: "var(--text-mute)", color: "var(--bg)", borderColor: "var(--text-mute)" }
                        : { borderColor: "var(--border)", color: "var(--text-soft)" }
                    }
                  >
                    Never
                  </button>
                </div>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-soft">
                {item.description || item.title || "No description served."}
              </p>

              {item.claim && item.claim !== item.description ? (
                <p className="mt-1.5 text-xs text-mute">
                  Directory claimed: “{item.claim}”
                  {item.claimedTier ? ` · listed as ${item.claimedTier}` : ""}
                </p>
              ) : null}

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge>{item.discoveredVia}</Badge>
                {item.sourceCategory ? <Badge>{item.sourceCategory}</Badge> : null}
                {item.figures.length ? (
                  <Badge tone="accent">
                    {item.priceSource}: {item.figures.slice(0, 4).join(" ")}
                  </Badge>
                ) : (
                  <Badge>no figures published</Badge>
                )}
                {item.mentionsFree ? <Badge tone="green">mentions free</Badge> : null}
                {item.licence ? <Badge tone="green">{item.licence}</Badge> : null}
                {item.blocked ? <Badge tone="flag">blocked bot check</Badge> : null}
                {item.archived ? <Badge tone="flag">repo archived</Badge> : null}
                {item.stars ? <Badge>{item.stars.toLocaleString()}★</Badge> : null}
              </div>
            </div>
          );
        })}
      </div>

      {visible.length > 60 ? (
        <p className="label mt-5 text-center text-mute">
          Showing 60 of {visible.length}. Decide these, publish, and the rest move up.
        </p>
      ) : null}
    </div>
  );
}
