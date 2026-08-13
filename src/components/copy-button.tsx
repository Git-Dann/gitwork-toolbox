"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy prompt",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`label inline-flex items-center gap-2 rounded-full px-4 py-2.5 transition-opacity hover:opacity-85 ${className}`}
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
    >
      {state === "copied" ? (
        <>
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path
              d="M2 6.3 4.5 8.8 10 3.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied
        </>
      ) : state === "failed" ? (
        "Select and copy manually"
      ) : (
        <>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 3.5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
