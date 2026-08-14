"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { href: string; label: string; count?: number };

export type SidebarData = { counts: Record<string, number> };

/**
 * Navigation only. Filters used to live down here as link lists, which meant the rail
 * changed shape depending on the page and a filter set sat as far from the grid it
 * filtered as the layout allows. They are dropdowns beside each search bar now, which is
 * where a list's own controls belong.
 */
export function Sidebar({ counts }: SidebarData) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const close = () => setOpen(false);

  const primary: NavItem[] = [
    { href: "/", label: "Explore" },
    ...(counts.recent ? [{ href: "/new", label: "Newly added", count: counts.recent }] : []),
    { href: "/tools", label: "Tools", count: counts.tools },
    { href: "/starters", label: "Starters", count: counts.starters },
    { href: "/resources", label: "Resources", count: counts.resources },
    { href: "/collections", label: "Collections" },
  ];

  const isActive = (href: string) => {
    const [path] = href.split("?");
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const nav = (
    <div className="flex h-full flex-col overflow-y-auto px-2.5 pb-6">
      <Link href="/" onClick={close} className="mb-4 mt-4 block px-2" aria-label="Gitwork Toolbox">
        <Wordmark />
      </Link>

      <div className="px-0.5 pb-2">
        <CommandPalette variant="sidebar" />
      </div>

      <nav>
        {primary.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} />
        ))}
      </nav>

      <div className="mt-auto border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <NavLink
          item={{ href: "/admin", label: "Admin" }}
          active={isActive("/admin")}
          subtle
          onNavigate={close}
        />
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
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link href="/" className="min-w-0 flex-1" aria-label="Gitwork Toolbox">
          <Wordmark />
        </Link>
        <CommandPalette variant="icon" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] border-r"
            style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
          >
            {nav}
          </div>
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 border-r lg:block"
        style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
      >
        {nav}
      </aside>
    </>
  );
}

/* ---------------------------------------------------------------------- bits */


const ROW =
  "flex items-center justify-between gap-2 rounded-md px-2.5 py-[7px] text-[13px] transition-colors";

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
      className={ROW}
      style={
        active
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { color: subtle ? "var(--text-soft)" : "var(--text)" }
      }
      data-hover-surface={active ? undefined : "true"}
    >
      <span className="truncate">{item.label}</span>
      <Count value={item.count} active={active} />
    </Link>
  );
}


function Count({ value, active }: { value?: number; active: boolean }) {
  if (value === undefined) return null;
  return (
    <span
      className="font-mono text-[11px]"
      style={{
        color: active ? "var(--on-accent)" : "var(--text-mute)",
        opacity: active ? 0.8 : 1,
      }}
    >
      {value}
    </span>
  );
}
