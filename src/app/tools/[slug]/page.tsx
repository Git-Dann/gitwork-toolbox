import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutboundLink, ToolCard } from "@/components/cards";
import {
  BackLink,
  Container,
  DefinitionRow,
  Panel,
  Section,
} from "@/components/page-shell";
import {
  Badge,
  Eyebrow,
  LinkHealth,
  Monogram,
  PickBadge,
  PricingBadge,
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
  const isPick = tool.assessed && tool.usefulness === "High";

  return (
    <>
      <div className="border-b border-line/10 bg-white/40">
        <Container className="py-8 sm:py-12">
          <BackLink href="/tools">All tools</BackLink>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <Monogram name={tool.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl leading-tight sm:text-4xl">{tool.name}</h1>
              {tool.domain ? (
                <OutboundLink
                  href={tool.website}
                  className="label mt-2 text-mute normal-case tracking-normal transition-colors hover:text-signal"
                >
                  {tool.domain}
                </OutboundLink>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <PricingBadge pricing={tool.pricing} />
                <Link href={`/tools?cat=${encodeURIComponent(tool.category)}`}>
                  <Badge>{tool.category}</Badge>
                </Link>
                {isPick ? <PickBadge /> : null}
                <UsefulnessBadge usefulness={tool.usefulness} />
                <LinkHealth status={tool.linkStatus} label={tool.linkLabel} />
              </div>
            </div>
            {tool.website ? (
              <OutboundLink
                href={tool.website}
                className="label shrink-0 rounded-full bg-ink px-4 py-2.5 text-paper transition-opacity hover:opacity-85"
              >
                Visit site
              </OutboundLink>
            ) : null}
          </div>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink/80">{tool.what}</p>
        </Container>
      </div>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            {tool.assessed ? (
              <Panel tone="signal" title="Gitwork's read">
                <div className="prose-tight text-sm leading-relaxed text-ink/85">
                  {tool.notes.map((note, index) => (
                    <p key={index}>{note}</p>
                  ))}
                </div>
              </Panel>
            ) : (
              <Panel title="Not assessed">
                <p className="text-sm leading-relaxed text-ink/75">
                  This row came from the{" "}
                  <OutboundLink
                    href="https://toolkit.dailyprompting.com/"
                    className="text-signal hover:underline"
                  >
                    700 AI Toolkit
                  </OutboundLink>{" "}
                  directory with its own one-line description and pricing label. Nobody at Gitwork
                  has evaluated it, and the directory very likely hasn't either. Treat it as a lead,
                  not a recommendation.
                </p>
              </Panel>
            )}

            {tool.linkStatus === "dead" ? (
              <Panel tone="flag" title="Link check failed">
                <p className="text-sm leading-relaxed text-ink/80">
                  {tool.linkLabel} when it was checked. The row is kept so the tool is not
                  re-researched from scratch, but do not expect the site to load.
                </p>
              </Panel>
            ) : null}

            <div>
              <Eyebrow className="mb-2">Detail</Eyebrow>
              <dl className="card px-5 py-2">
                <DefinitionRow term="Price">{tool.priceDetail || "—"}</DefinitionRow>
                <DefinitionRow term="Build ourselves?">
                  {tool.buildVerdict === "Not assessed" ? (
                    <span className="text-mute">Not assessed</span>
                  ) : (
                    tool.buildVerdict
                  )}
                </DefinitionRow>
                <DefinitionRow term="Useful to Gitwork">
                  {tool.usefulness === "Not assessed" ? (
                    <span className="text-mute">Not assessed</span>
                  ) : (
                    tool.usefulness
                  )}
                </DefinitionRow>
                <DefinitionRow term="Link check">{tool.linkLabel}</DefinitionRow>
                <DefinitionRow term="Source">
                  {tool.assessed ? "Assessed by Gitwork" : "700 AI Toolkit directory"}
                </DefinitionRow>
                <DefinitionRow term="Website">
                  {tool.website ? (
                    <OutboundLink href={tool.website} className="text-signal hover:underline">
                      {tool.website}
                    </OutboundLink>
                  ) : (
                    "—"
                  )}
                </DefinitionRow>
              </dl>
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title="Where it sits">
              <div className="space-y-3 text-sm">
                <Link
                  href={`/tools?group=${tool.group}`}
                  className="block transition-colors hover:text-signal"
                >
                  {group?.name ?? "Uncategorised"}
                  <span className="label ml-2 text-mute">{group?.count ?? 0}</span>
                </Link>
                <Link
                  href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                  className="block text-mute transition-colors hover:text-signal"
                >
                  {tool.category}
                </Link>
                <Link
                  href={`/tools?price=${tool.pricing}`}
                  className="block text-mute transition-colors hover:text-signal"
                >
                  {tool.pricing} tools
                </Link>
              </div>
            </Panel>
          </aside>
        </div>

        {related.length ? (
          <Section className="pb-0">
            <SectionHeading
              eyebrow="Same ground"
              title="Related tools"
              action={{ href: `/tools?cat=${encodeURIComponent(tool.category)}`, label: "See all" }}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
