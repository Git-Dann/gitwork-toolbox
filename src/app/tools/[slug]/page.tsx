import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutboundLink, ToolCard } from "@/components/cards";
import { BackLink, Container, DefinitionRow, Panel, Section } from "@/components/page-shell";
import {
  ApprovedBadge,
  Badge,
  Eyebrow,
  LinkHealth,
  Monogram,
  RecommendedBadge,
  SectionHeading,
  UsefulnessBadge,
} from "@/components/ui";
import { getGroup, getTool, relatedTools, tools } from "@/lib/data";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "Tool not found" };
  return { title: tool.name, description: tool.what.slice(0, 180) };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const group = getGroup(tool.group);
  const related = relatedTools(tool);

  return (
    <>
      <div className="border-b border-hair">
        <Container className="py-10">
          <BackLink href="/tools">All tools</BackLink>

          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start">
            <Monogram name={tool.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="display text-3xl sm:text-[2.75rem]">
                {tool.name}
                <span className="text-accent">.</span>
              </h1>
              {tool.domain ? (
                <OutboundLink
                  href={tool.website}
                  className="mt-2.5 font-mono text-xs text-mute transition-colors hover:text-[var(--accent)]"
                >
                  {tool.domain}
                </OutboundLink>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {tool.recommended ? <RecommendedBadge /> : null}
                {tool.approved ? <ApprovedBadge /> : null}
                <Badge tone={tool.pricing === "Free" ? "green" : "neutral"}>{tool.pricing}</Badge>
                <Badge>{tool.category}</Badge>
                <UsefulnessBadge usefulness={tool.usefulness} />
                <LinkHealth status={tool.linkStatus} label={tool.linkLabel} />
              </div>
            </div>
            {tool.website ? (
              <OutboundLink
                href={tool.website}
                className="label shrink-0 rounded-full px-4 py-2.5"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Visit site
              </OutboundLink>
            ) : null}
          </div>

          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-soft">{tool.what}</p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
          <div className="space-y-5">
            <Panel tone="accent" title="Gitwork's read">
              <div className="prose-tight text-sm leading-relaxed">
                {tool.notes.map((note, index) => (
                  <p key={index}>{note}</p>
                ))}
              </div>
            </Panel>

            {tool.adminNote ? (
              <Panel title="Studio note">
                <p className="text-sm leading-relaxed text-soft">{tool.adminNote}</p>
              </Panel>
            ) : null}

            {tool.linkStatus === "dead" ? (
              <Panel tone="flag" title="Link check failed">
                <p className="text-sm leading-relaxed text-soft">
                  {tool.linkLabel} when it was checked. The row is kept so the tool is not
                  re-researched from scratch, but do not expect the site to load.
                </p>
              </Panel>
            ) : null}

            <div>
              <Eyebrow className="mb-3">Detail</Eyebrow>
              <dl className="surface px-5 py-2">
                <DefinitionRow term="Price">{tool.priceDetail || "—"}</DefinitionRow>
                <DefinitionRow term="Build ourselves?">{tool.buildVerdict}</DefinitionRow>
                <DefinitionRow term="Useful to Gitwork">{tool.usefulness}</DefinitionRow>
                <DefinitionRow term="Link check">{tool.linkLabel}</DefinitionRow>
                <DefinitionRow term="Website">
                  {tool.website ? (
                    <OutboundLink
                      href={tool.website}
                      className="text-accent transition-opacity hover:opacity-80"
                    >
                      {tool.website}
                    </OutboundLink>
                  ) : (
                    "—"
                  )}
                </DefinitionRow>
              </dl>
            </div>
          </div>

          <aside>
            <Panel title="Where it sits">
              <div className="space-y-3 text-sm">
                <Link
                  href={`/tools?group=${tool.group}`}
                  className="block transition-colors hover:text-[var(--accent)]"
                >
                  {group?.name ?? "Uncategorised"}
                  <span className="ml-2 font-mono text-[11px] text-mute">{group?.count ?? 0}</span>
                </Link>
                <Link
                  href={`/tools?price=${tool.pricing}`}
                  className="block text-soft transition-colors hover:text-[var(--accent)]"
                >
                  {tool.pricing} tools
                </Link>
                <Link
                  href="/shortlist"
                  className="block text-soft transition-colors hover:text-[var(--accent)]"
                >
                  Shortlist &amp; actions
                </Link>
              </div>
            </Panel>
          </aside>
        </div>

        {related.length ? (
          <Section className="pb-0">
            <SectionHeading eyebrow="Same ground" title="Related tools" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {related.map((item) => (
                <ToolCard key={item.slug} tool={item} />
              ))}
            </div>
          </Section>
        ) : null}
      </Container>
    </>
  );
}
