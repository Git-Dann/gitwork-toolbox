import Link from "next/link";
import { OutboundLink } from "@/components/cards";
import { Container } from "@/components/page-shell";
import { counts, groups } from "@/lib/data";

const YEAR = 2026;

export function SiteFooter() {
  const starterTypes = [
    { href: "/starters?type=PROMPT", label: `Prompts (${counts.prompts})` },
    { href: "/starters?type=SKILL", label: `Skills (${counts.skills})` },
    { href: "/starters?type=KIT", label: `Kits (${counts.kits})` },
    { href: "/starters?type=PLUGIN", label: `Plugins (${counts.plugins})` },
    { href: "/starters?type=COLLECTION", label: `Collections (${counts.starterCollections})` },
  ];

  return (
    <footer className="mt-16 border-t border-hair">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="display text-lg">
              Gitwork<span className="text-accent">.</span> Toolbox
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-soft">
              {counts.tools} tools · {counts.starters} starters · {counts.resources} resources
            </p>
            <OutboundLink
              href="https://gitwork.co.uk"
              className="label mt-4 transition-colors hover:text-[var(--accent)]"
            >
              gitwork.co.uk
            </OutboundLink>
          </div>

          <FooterColumn title="Browse">
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
            {counts.recent ? <FooterLink href="/new">Newly added</FooterLink> : null}
            <FooterLink href="/collections">Collections</FooterLink>
            <FooterLink href="/resources">Resources</FooterLink>
            <FooterLink href="/admin">Admin portal</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-6">
          <p className="label text-mute">© {YEAR} Gitwork</p>
          <p className="label text-mute">Internal · not indexed</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{title}</p>
      <ul className="mt-3.5 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-soft transition-colors hover:text-[var(--accent)]">
        {children}
      </Link>
    </li>
  );
}
