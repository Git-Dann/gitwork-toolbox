import Link from "next/link";
import { OutboundLink } from "@/components/cards";
import { counts, groups, meta } from "@/lib/data";

const YEAR = 2026;

export function SiteFooter() {
  const starterTypes = [
    { href: "/starters?type=PROMPT", label: `Prompts (${counts.prompts})` },
    { href: "/starters?type=SKILL", label: `Skills (${counts.skills})` },
    { href: "/starters?type=KIT", label: `Kits (${counts.kits})` },
    { href: "/starters?type=COLLECTION", label: `Collections (${counts.starterCollections})` },
    { href: "/starters?type=PLUGIN", label: `Plugins (${counts.plugins})` },
  ];

  return (
    <footer className="mt-20 border-t border-line/10 bg-white/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold tracking-tight">Gitwork</span>
              <span className="h-1.5 w-1.5 translate-y-[-3px] bg-signal" />
              <span className="label text-mute">Toolbox</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mute">
              The studio's working reference: {counts.tools} tools, {counts.starters} Foundry
              starters and {counts.resources} resources, with Gitwork's own verdict where we have
              one.
            </p>
            <OutboundLink
              href="https://gitwork.co.uk"
              className="label mt-4 text-ink transition-colors hover:text-signal"
            >
              gitwork.co.uk
            </OutboundLink>
          </div>

          <FooterColumn title="Browse tools">
            {groups.map((group) => (
              <FooterLink key={group.slug} href={`/tools?group=${group.slug}`}>
                {group.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Starter library">
            {starterTypes.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="The workbook">
            <FooterLink href="/shortlist">Shortlist &amp; actions</FooterLink>
            <FooterLink href="/collections">Collections</FooterLink>
            <FooterLink href="/resources">Resources</FooterLink>
            <FooterLink href="/about">How this is built</FooterLink>
            <li>
              <OutboundLink
                href="https://toolkit.dailyprompting.com/"
                className="text-sm text-mute transition-colors hover:text-signal"
              >
                700 AI Toolkit
              </OutboundLink>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line/10 pt-6">
          <p className="label text-mute">© {YEAR} Gitwork — from prompt to production</p>
          <p className="label text-mute">
            {meta.dataQuality.length ? "Internal reference · not indexed" : ""}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label text-ink">{title}</p>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-mute transition-colors hover:text-signal">
        {children}
      </Link>
    </li>
  );
}
