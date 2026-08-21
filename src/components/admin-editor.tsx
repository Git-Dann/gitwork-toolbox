"use client";

import { useMemo, useState } from "react";
import { SearchField, Select } from "@/components/filter-ui";
import { Badge } from "@/components/ui";
import type { AdminItem } from "@/lib/types";

type Draft = { recommended: boolean; approved: boolean; note: string };

const TABS: { kind: AdminItem["kind"]; label: string }[] = [
  { kind: "tools", label: "Tools" },
  { kind: "starters", label: "Starters" },
  { kind: "resources", label: "Resources" },
];

const key = (item: { kind: string; slug: string }) => `${item.kind}:${item.slug}`;

/** The filter dimension is the area for tools and resources, the type for starters. */
const BUCKET_LABEL: Record<AdminItem["kind"], string> = {
  tools: "area",
  starters: "type",
  resources: "area",
};

type Flag = "" | "recommended" | "approved" | "unflagged" | "noted" | "changed";

type Sort = "flagged" | "name" | "added" | "bucket";

const SORTS: { value: Sort; label: string }[] = [
  { value: "flagged", label: "Flagged first" },
  { value: "name", label: "A–Z" },
  { value: "added", label: "Newest" },
  { value: "bucket", label: "Grouped" },
];

const HREF: Record<AdminItem["kind"], string> = {
  tools: "/tools",
  starters: "/starters",
  resources: "/resources",
};

export function AdminEditor({
  items,
  canSave,
  configNote,
}: {
  items: AdminItem[];
  canSave: boolean;
  configNote?: string;
}) {
  const [kind, setKind] = useState<AdminItem["kind"]>("tools");
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("");
  const [flag, setFlag] = useState<Flag>("");
  const [sort, setSort] = useState<Sort>("flagged");
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

  // One predicate, so the option counts and the list can never disagree. Flags read the
  // draft rather than the saved value — tick something and it stays where you can see it.
  const matches = useMemo(
    () =>
      (item: AdminItem, over: { bucket?: string; flag?: Flag } = {}) => {
        if (item.kind !== kind) return false;
        const b = over.bucket ?? bucket;
        const f = over.flag ?? flag;
        if (b && item.bucket !== b) return false;
        const draft = current(item);
        if (f === "recommended" && !draft.recommended) return false;
        if (f === "approved" && !draft.approved) return false;
        if (f === "unflagged" && (draft.recommended || draft.approved)) return false;
        if (f === "noted" && !draft.note.trim()) return false;
        if (f === "changed" && !drafts[key(item)]) return false;
        return true;
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, kind, bucket, flag, drafts],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (item: AdminItem) => {
      const draft = current(item);
      return Number(draft.recommended) * 2 + Number(draft.approved);
    };
    return items
      .filter((item) => matches(item))
      .filter(
        (item) =>
          !q || item.name.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "added") {
          // Anything imported before we started stamping dates sorts last, then A–Z.
          return (
            (Date.parse(b.addedAt ?? "") || 0) - (Date.parse(a.addedAt ?? "") || 0) ||
            a.name.localeCompare(b.name)
          );
        }
        if (sort === "bucket") {
          return a.bucketLabel.localeCompare(b.bucketLabel) || a.name.localeCompare(b.name);
        }
        return rank(b) - rank(a) || a.name.localeCompare(b.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, matches, query, sort, drafts]);

  const countWith = (over: { bucket?: string; flag?: Flag }) =>
    items.filter((item) => matches(item, over)).length;

  // Only buckets that exist inside the current tab and flag filter, counted within them,
  // so picking one can never land on an empty list.
  const bucketOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (item.kind === kind && item.bucket) seen.set(item.bucket, item.bucketLabel);
    }
    const options = [...seen.entries()]
      .map(([value, label]) => ({ value, label, n: countWith({ bucket: value }) }))
      .filter((option) => option.n > 0 || bucket === option.value)
      .map((option) => ({ value: option.value, label: `${option.label} (${option.n})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: "", label: `All ${BUCKET_LABEL[kind]}s (${countWith({ bucket: "" })})` },
      ...options,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, bucket, flag, drafts]);

  const flagOptions = useMemo(() => {
    const options: { value: Flag; label: string }[] = [
      { value: "unflagged", label: "Not yet flagged" },
      { value: "recommended", label: "Recommended" },
      { value: "approved", label: "Approved" },
      { value: "noted", label: "Has a note" },
      { value: "changed", label: "Unsaved" },
    ];
    return [
      { value: "", label: `Any state (${countWith({ flag: "" })})` },
      ...options
        .map((option) => ({ ...option, n: countWith({ flag: option.value }) }))
        .filter((option) => option.n > 0 || flag === option.value)
        .map((option) => ({ value: option.value, label: `${option.label} (${option.n})` })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, bucket, flag, drafts]);

  // A bucket belongs to one tab, so switching tab drops it rather than emptying the list.
  const selectKind = (next: AdminItem["kind"]) => {
    setKind(next);
    setBucket("");
  };

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
              onClick={() => selectKind(tab.kind)}
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
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Find an item…" />
        <div className="flex flex-wrap gap-2">
          <Select
            ariaLabel={BUCKET_LABEL[kind] === "type" ? "Type" : "Area"}
            value={bucket}
            onChange={setBucket}
            options={bucketOptions}
          />
          <Select
            ariaLabel="State"
            value={flag}
            onChange={(value) => setFlag(value as Flag)}
            options={flagOptions}
          />
          <Select
            ariaLabel="Sort"
            value={sort}
            onChange={(value) => setSort(value as Sort)}
            options={SORTS.map((option) => ({ ...option, label: `Sort: ${option.label}` }))}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="label text-mute">
          {visible.length} of {items.filter((item) => item.kind === kind).length}
        </p>
        {bucket || flag || query.trim() ? (
          <button
            type="button"
            onClick={() => {
              setBucket("");
              setFlag("");
              setQuery("");
            }}
            className="label text-accent hover:underline"
          >
            Clear
          </button>
        ) : null}
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
                  <a
                    href={`${HREF[item.kind]}/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium hover:text-[var(--accent)]"
                  >
                    {item.name}
                  </a>
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
                  placeholder="Note (shown on the page)"
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
                : "Nothing is live until you publish."}
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
