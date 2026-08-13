"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Group } from "@/lib/types";

type NavItem = { href: string; label: string; count?: number };

export function Sidebar({
  groups,
  counts,
}: {
  groups: Group[];
  counts: Record<string, number>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the slide-over on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const primary: NavItem[] = [
    { href: "/", label: "Explore" },
    // Only once something has been posted.
    ...(counts.recent ? [{ href: "/new", label: "Newly added", count: counts.recent }] : []),
    { href: "/tools", label: "Tools", count: counts.tools },
    { href: "/starters", label: "Starters", count: counts.starters },
    { href: "/collections", label: "Collections" },
    { href: "/shortlist", label: "Shortlist" },
    { href: "/resources", label: "Resources", count: counts.resources },
  ];

  const library: NavItem[] = [
    { href: "/starters?type=PROMPT", label: "Prompts", count: counts.prompts },
    { href: "/starters?type=SKILL", label: "Skills", count: counts.skills },
    { href: "/starters?type=KIT", label: "Kits", count: counts.kits },
    { href: "/starters?type=PLUGIN", label: "Plugins", count: counts.plugins },
    { href: "/starters?type=COLLECTION", label: "Collections", count: counts.starterCollections },
  ];

  const isActive = (href: string) => {
    const [path] = href.split("?");
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const nav = (
    <div className="flex h-full flex-col overflow-y-auto px-2.5 pb-6">
      <Link href="/" className="mb-4 mt-4 block px-2" aria-label="Gitwork Toolbox">
        <Wordmark />
      </Link>

      <div className="px-0.5 pb-2">
        <CommandPalette variant="sidebar" />
      </div>

      <Section>
        {primary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onNavigate={() => setOpen(false)}
          />
        ))}
      </Section>

      <SectionTitle>Starter library</SectionTitle>
      <Section>
        {library.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={false}
            subtle
            onNavigate={() => setOpen(false)}
          />
        ))}
      </Section>

      <SectionTitle>Areas</SectionTitle>
      <Section>
        {groups.map((group) => (
          <NavLink
            key={group.slug}
            item={{ href: `/tools?group=${group.slug}`, label: group.name, count: group.count }}
            active={false}
            subtle
            onNavigate={() => setOpen(false)}
          />
        ))}
      </Section>

      <div className="mt-auto border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <NavLink item={{ href: "/about", label: "How this is built" }} active={isActive("/about")} subtle />
        <NavLink item={{ href: "/admin", label: "Admin" }} active={isActive("/admin")} subtle />
        <ThemeToggle />
        <a
          href="https://gitwork.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="label block px-2.5 py-2 text-mute transition-colors hover:text-[var(--accent)]"
        >
          gitwork.co.uk ↗
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/" className="flex-1" aria-label="Gitwork Toolbox">
          <Wordmark />
        </Link>
        <CommandPalette variant="icon" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-y-0 left-0 w-[17rem] border-r"
            style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
          >
            {nav}
          </div>
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 border-r lg:block"
        style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
      >
        {nav}
      </aside>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="label mt-5 mb-1.5 px-2.5 text-mute">{children}</p>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <nav>{children}</nav>;
}

function NavLink({
  item,
  active,
  subtle = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  subtle?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center justify-between gap-2 rounded-md px-2.5 py-[7px] text-[13px] transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { color: subtle ? "var(--text-soft)" : "var(--text)" }
      }
      data-hover-surface={active ? undefined : "true"}
    >
      <span className="truncate">{item.label}</span>
      {item.count === undefined ? null : (
        <span
          className="font-mono text-[11px]"
          style={{ color: active ? "var(--on-accent)" : "var(--text-mute)", opacity: active ? 0.8 : 1 }}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
