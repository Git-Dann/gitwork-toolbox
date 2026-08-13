"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import type { Group } from "@/lib/types";

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/starters", label: "Starters" },
  { href: "/collections", label: "Collections" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/resources", label: "Resources" },
];

export function SiteHeader({ groups }: { groups: Group[] }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label="Gitwork Toolbox">
          <span className="text-lg font-semibold tracking-tight">Gitwork</span>
          <span className="h-1.5 w-1.5 translate-y-[-3px] bg-signal" />
          <span className="label text-mute">Toolbox</span>
        </Link>

        <nav className="no-scrollbar ml-auto hidden items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto md:ml-0">
          <CommandPalette />
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-line/8 px-4 py-2 sm:px-6 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`label shrink-0 rounded-full px-3 py-1.5 ${
              pathname.startsWith(item.href) ? "bg-ink text-paper" : "text-mute"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto border-t border-line/8 px-4 py-2.5 sm:px-6 md:flex">
        <span className="label shrink-0 pr-1 text-mute">Browse</span>
        {groups.map((group) => (
          <Link
            key={group.slug}
            href={`/tools?group=${group.slug}`}
            className="label shrink-0 rounded-full border border-line/12 bg-white/50 px-2.5 py-1.5 text-ink/70 transition-colors hover:border-signal/40 hover:text-signal"
          >
            {group.name}
            <span className="ml-1.5 text-mute">{group.count}</span>
          </Link>
        ))}
      </div>
    </header>
  );
}
