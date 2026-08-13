"use client";

import { useMemo, useState } from "react";
import { SearchField } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { AdminItem } from "@/lib/types";

type Draft = { recommended: boolean; approved: boolean; note: string };

const TABS: { kind: AdminItem["kind"]; label: string }[] = [
  { kind: "tools", label: "Tools" },
  { kind: "starters", label: "Starters" },
  { kind: "resources", label: "Resources" },
];

const key = (item: { kind: string; slug: string }) => `${item.kind}:${item.slug}`;

export function AdminEditor({
  items,
  session,
  canSave,
  configNote,
}: {
  items: AdminItem[];
  session: string;
  canSave: boolean;
  configNote?: string;
}) {
  const [kind, setKind] = useState<AdminItem["kind"]>("tools");
  const [query, setQuery] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);

  const original = useMemo(() => {
    const map = new Map<string, Draft>();
    for (const item of items) {
      map.set(key(item), {
        recommended: item.recommended,
        approved: item.approved,
        note: item.note,
      });
    }
    return map;
  }, [items]);

  const current = (item: AdminItem): Draft =>
    drafts[key(item)] ?? original.get(key(item)) ?? { recommended: false, approved: false, note: "" };

  const update = (item: AdminItem, patch: Partial<Draft>) => {
    const next = { ...current(item), ...patch };
    const base = original.get(key(item))!;
    setDrafts((drafts) => {
      const copy = { ...drafts };
      const unchanged =
        next.recommended === base.recommended &&
        next.approved === base.approved &&
        next.note === base.note;
      if (unchanged) delete copy[key(item)];
      else copy[key(item)] = next;
      return copy;
    });
    setResult(null);
  };

  const changeCount = Object.keys(drafts).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => item.kind === kind)
      .filter((item) => {
        const draft = current(item);
        if (flaggedOnly && !draft.recommended && !draft.approved) return false;
        if (!q) return true;
        return item.name.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const da = current(a);
        const db = current(b);
        return (
          Number(db.recommended) - Number(da.recommended) ||
          Number(db.approved) - Number(da.approved) ||
          a.name.localeCompare(b.name)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, query, flaggedOnly, drafts]);

  const save = async () => {
    setBusy(true);
    setResult(null);
    const changes = Object.entries(drafts).map(([composite, draft]) => {
      const [itemKind, ...rest] = composite.split(":");
      return { kind: itemKind, slug: rest.join(":"), ...draft };
    });

    try {
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const body = await response.json();
      if (!response.ok) {
        setResult({ ok: false, message: body.error ?? "Could not save." });
      } else {
        setResult({
          ok: true,
          message: `Committed ${body.sha} — the site rebuilds in about a minute, then the badges appear.`,
          url: body.url,
        });
        setDrafts({});
      }
    } catch {
      setResult({ ok: false, message: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };

  const counts = {
    recommended: items.filter((item) => current(item).recommended).length,
    approved: items.filter((item) => current(item).approved).length,
  };

  return (
    <div>
      {configNote ? (
        <div
          className="mb-6 rounded-[var(--radius-card)] border p-4 text-sm"
          style={{ borderColor: "rgb(232 176 75 / 0.4)", background: "rgb(232 176 75 / 0.08)" }}
        >
          {configNote}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              onClick={() => setKind(tab.kind)}
              className="rounded-full px-3.5 py-2 text-sm transition-colors"
              style={
                kind === tab.kind
                  ? { background: "var(--accent)", color: "var(--on-accent)" }
                  : { color: "var(--text-soft)" }
              }
            >
              {tab.label}
              <span className="ml-2 font-mono text-[11px] opacity-70">
                {items.filter((item) => item.kind === tab.kind).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="solid">{counts.recommended} recommended</Badge>
          <Badge tone="accent">{counts.approved} approved</Badge>
          <button type="button" onClick={signOut} className="label text-mute hover:text-[var(--accent)]">
            Sign out ({session})
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchField value={query} onChange={setQuery} placeholder="Find an item by name…" />
        </div>
        <button
          type="button"
          onClick={() => setFlaggedOnly((value) => !value)}
          className="label rounded-full border px-3.5 py-2.5"
          style={
            flaggedOnly
              ? { borderColor: "var(--accent)", color: "var(--accent-soft)" }
              : { borderColor: "var(--border)", color: "var(--text-mute)" }
          }
        >
          Flagged only
        </button>
      </div>

      <div className="surface mt-5 overflow-hidden">
        <div
          className="hidden items-center gap-4 border-b px-4 py-3 sm:flex"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="label flex-1 text-mute">Item</span>
          <span className="label w-28 text-center text-mute">Recommended</span>
          <span className="label w-24 text-center text-mute">Approved</span>
          <span className="label w-64 text-mute">Studio note</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-mute">Nothing matches that.</p>
        ) : (
          visible.map((item) => {
            const draft = current(item);
            const dirty = Boolean(drafts[key(item)]);
            return (
              <div
                key={key(item)}
                className="flex flex-col gap-3 border-b px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4"
                style={{
                  borderColor: "var(--border)",
                  background: dirty ? "var(--accent-wash)" : undefined,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate font-mono text-[11px] text-mute">{item.meta}</p>
                </div>

                <div className="flex items-center gap-6 sm:gap-0">
                  <div className="sm:w-28 sm:text-center">
                    <Check
                      label="Recommended"
                      checked={draft.recommended}
                      onChange={(value) => update(item, { recommended: value })}
                    />
                  </div>
                  <div className="sm:w-24 sm:text-center">
                    <Check
                      label="Approved"
                      checked={draft.approved}
                      onChange={(value) => update(item, { approved: value })}
                    />
                  </div>
                </div>

                <input
                  value={draft.note}
                  onChange={(event) => update(item, { note: event.target.value })}
                  placeholder="Optional — shown on the page"
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--accent)] sm:w-64"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-input)",
                    color: "var(--text)",
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Save bar */}
      <div
        className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-4 border-t py-4 backdrop-blur-md"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        }}
      >
        <div className="min-w-0">
          {result ? (
            <p
              className="text-sm"
              style={{ color: result.ok ? "var(--color-green)" : "var(--color-flag)" }}
            >
              {result.message}
              {result.url ? (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline"
                >
                  view commit
                </a>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-mute">
              {changeCount
                ? `${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}`
                : "Tick what you rate. Nothing is live until you publish."}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !changeCount || !canSave}
          className="label rounded-full px-5 py-3 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {busy ? "Publishing…" : `Publish ${changeCount || ""}`.trim()}
        </button>
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
      className="inline-flex items-center gap-2"
    >
      <span
        className="grid h-5 w-5 place-items-center rounded border transition-colors"
        style={{
          borderColor: checked ? "var(--accent)" : "var(--border-strong)",
          background: checked ? "var(--accent)" : "transparent",
          color: "#fff",
        }}
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M2.5 6.5 4.8 8.8 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="text-xs text-mute sm:hidden">{label}</span>
    </button>
  );
}
