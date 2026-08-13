import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OutboundLink, ResourceCard } from "@/components/cards";
import { BackLink, Container, DefinitionRow, Panel, Section } from "@/components/page-shell";
import {
  ApprovedBadge,
  Badge,
  Eyebrow,
  Monogram,
  RecommendedBadge,
  SectionHeading,
  UsefulnessBadge,
} from "@/components/ui";
import { getResource, resources } from "@/lib/data";

export function generateStaticParams() {
  return resources.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) return { title: "Resource not found" };
  return { title: resource.name, description: resource.takeaway.slice(0, 180) };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const related = resources
    .filter((item) => item.slug !== resource.slug && item.group === resource.group)
    .slice(0, 3);

  return (
    <>
      <div className="border-b border-hair">
        <Container className="py-10">
          <BackLink href="/resources">All resources</BackLink>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <Monogram name={resource.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="display text-3xl sm:text-[2.5rem]">
                {resource.name}
                <span className="text-accent">.</span>
              </h1>
              {resource.domain ? (
                <OutboundLink
                  href={resource.link}
                  className="mt-2.5 font-mono text-xs text-mute transition-colors hover:text-[var(--accent)]"
                >
                  {resource.domain}
                </OutboundLink>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {resource.recommended ? <RecommendedBadge /> : null}
                {resource.approved ? <ApprovedBadge /> : null}
                <Badge tone="accent">{resource.resourceType}</Badge>
                <Badge>{resource.category}</Badge>
                <UsefulnessBadge usefulness={resource.usefulness} />
              </div>
            </div>
            <OutboundLink
              href={resource.link}
              className="label shrink-0 rounded-full px-4 py-2.5"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Open
            </OutboundLink>
          </div>

          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-soft">{resource.takeaway}</p>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            <Panel tone="accent" title="What to do with it">
              <p className="text-sm leading-relaxed text-soft">{resource.whatToDo}</p>
            </Panel>

            {resource.notes.length ? (
              <Panel title="Watch out for">
                <div className="prose-tight text-sm leading-relaxed">
                  {resource.notes.map((note, index) => (
                    <p key={index}>{note}</p>
                  ))}
                </div>
              </Panel>
            ) : null}

            <div>
              <Eyebrow className="mb-2">Detail</Eyebrow>
              <dl className="surface px-5 py-2">
                <DefinitionRow term="Type">{resource.resourceType}</DefinitionRow>
                <DefinitionRow term="Category">{resource.category}</DefinitionRow>
                <DefinitionRow term="Cost">{resource.cost}</DefinitionRow>
                <DefinitionRow term="Useful to Gitwork">{resource.usefulness}</DefinitionRow>
                <DefinitionRow term="Link">
                  <OutboundLink href={resource.link} className="text-accent hover:underline">
                    {resource.link}
                  </OutboundLink>
                </DefinitionRow>
              </dl>
            </div>
          </div>

          <aside>
            <Panel title="Where it sits">
              <p className="text-sm leading-relaxed text-mute">
                Filed under {resource.category}. Resources are not tools — nothing here goes into the
                stack, it gets read, followed or filed.
              </p>
            </Panel>
          </aside>
        </div>

        {related.length ? (
          <Section className="pb-0">
            <SectionHeading eyebrow="Same ground" title="Related resources" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <ResourceCard key={item.slug} resource={item} />
              ))}
            </div>
          </Section>
        ) : null}
      </Container>
    </>
  );
}
