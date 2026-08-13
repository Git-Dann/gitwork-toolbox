/** The Gitwork marks, matching the studio's report covers. */

export function Roundel({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: "var(--text)" }}
    >
      <span
        className="font-display leading-none"
        style={{ color: "var(--bg)", fontSize: size * 0.58, marginTop: -size * 0.02 }}
      >
        G
      </span>
      <span
        className="absolute rounded-full"
        style={{
          width: Math.max(3, size * 0.13),
          height: Math.max(3, size * 0.13),
          right: size * 0.14,
          bottom: size * 0.22,
          background: "var(--accent)",
        }}
      />
    </span>
  );
}

export function Wordmark({ subtitle = "Toolbox" }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Roundel size={26} />
      <span className="flex flex-col leading-none">
        <span className="display text-[1.05rem]">
          Gitwork<span className="text-accent">.</span>
        </span>
        <span className="label mt-0.5 text-mute">{subtitle}</span>
      </span>
    </span>
  );
}

/** Headline with the brand's violet full stop, and optional violet italic run. */
export function Headline({
  children,
  emphasis,
  tail = ".",
  className = "",
}: {
  children: React.ReactNode;
  emphasis?: string;
  tail?: string;
  className?: string;
}) {
  return (
    <h1 className={`display ${className}`}>
      {children}
      {emphasis ? <em className="text-accent italic">{emphasis}</em> : null}
      <span className="text-accent">{tail}</span>
    </h1>
  );
}
