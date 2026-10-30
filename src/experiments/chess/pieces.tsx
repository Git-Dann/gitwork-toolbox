/**
 * Original piece artwork — simple solid forms built from the same geometry the rest of
 * the room uses, rather than a Staunton set. They have to read at about twenty pixels on
 * a phone, so each one is a silhouette with one distinguishing feature and nothing else.
 */

import type { ReactNode } from "react";

const SHAPES: Record<string, ReactNode> = {
  p: (
    <>
      <circle cx="32" cy="20" r="9" />
      <path d="M22 50c0-9 4.5-13 10-16 5.5 3 10 7 10 16z" />
      <rect x="18" y="50" width="28" height="6" rx="3" />
    </>
  ),
  n: (
    <>
      <path d="M24 54V38c0-10 5-16 11-19l-2-7 9 5c7 4 10 10 10 19v18z" />
      <rect x="18" y="54" width="30" height="6" rx="3" />
      <circle cx="40" cy="27" r="2.2" fill="var(--board-ink)" />
    </>
  ),
  b: (
    <>
      <circle cx="32" cy="17" r="5" />
      <path d="M22 50c0-13 5-21 10-26 5 5 10 13 10 26z" />
      <rect x="27" y="30" width="10" height="3.4" rx="1.7" fill="var(--board-ink)" />
      <rect x="18" y="50" width="28" height="6" rx="3" />
    </>
  ),
  r: (
    <>
      <path d="M21 14h6v5h4v-5h6v5h4v-5h6v11l-3 3v17l3 4H21l3-4V28l-3-3z" />
      <rect x="17" y="54" width="30" height="6" rx="3" />
    </>
  ),
  q: (
    <>
      <circle cx="18" cy="16" r="4" />
      <circle cx="32" cy="12" r="4.6" />
      <circle cx="46" cy="16" r="4" />
      <path d="M19 22l5 10h16l5-10 4 28H15z" />
      <rect x="15" y="52" width="34" height="6" rx="3" />
    </>
  ),
  k: (
    <>
      <rect x="29.6" y="6" width="4.8" height="15" rx="2" />
      <rect x="25" y="10.6" width="14" height="4.8" rx="2.4" />
      <path d="M20 50c0-14 5-22 12-26 7 4 12 12 12 26z" />
      <rect x="16" y="50" width="32" height="6" rx="3" />
    </>
  ),
};

export function Piece({ piece }: { piece: string }) {
  const white = piece === piece.toUpperCase();
  const kind = piece.toLowerCase();
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className="pointer-events-none h-full w-full"
      style={
        {
          "--board-ink": white ? "#2a2724" : "#efe9dd",
          fill: white ? "#f6f1e7" : "#26242a",
          stroke: white ? "#3a342c" : "#0e0d11",
          strokeWidth: 2.2,
          strokeLinejoin: "round",
          filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.35))",
        } as React.CSSProperties
      }
    >
      {SHAPES[kind]}
    </svg>
  );
}

export const GLYPH: Record<string, string> = {
  p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King",
};
