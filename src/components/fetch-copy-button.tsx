"use client";

import { useState } from "react";

/**
 * Copies a file that is not in the page.
 *
 * The four DESIGN.md flavours for one app run to 80KB. Inlining them so CopyButton
 * could reach them would put that in every app page's payload for a button most
 * visitors never press, so this fetches the spec from public/ on click instead.
 */
export function FetchCopyButton({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint?: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "copied" | "failed">("idle");

  const copy = async () => {
    setState("working");
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  };

  const text =
    state === "working" ? "Fetching…" : state === "copied" ? "Copied" : state === "failed" ? "Failed — open it instead" : label;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="label inline-flex items-center gap-2 rounded-full border px-3.5 py-2 transition-colors"
      style={
        state === "copied"
          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
          : { borderColor: "var(--border)", color: "var(--text-soft)" }
      }
    >
      {text}
      {hint && state === "idle" ? <span className="font-mono text-[11px] text-mute">{hint}</span> : null}
    </button>
  );
}
