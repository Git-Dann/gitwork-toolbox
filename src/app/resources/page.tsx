import type { Metadata } from "next";
import { ResourceCard } from "@/components/cards";
import { Container, PageHeader, Section } from "@/components/page-shell";
import { Badge, SectionHeading } from "@/components/ui";
import { counts, resources } from "@/lib/data";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "The things on the list that are not tools: articles, docs, social accounts, directories and hardware experiments, each with what to do about it.",
};

const ORDER = ["High", "Medium", "Low", "None", "Unknown", "Not assessed"];

export default function ResourcesPage() {
  const sorted = [...resources].sort(
    (a, b) =>
      ORDER.indexOf(a.usefulness) - ORDER.indexOf(b.usefulness) || a.name.localeCompare(b.name),
  );
  const lead = sorted.filter(
    (resource) => resource.recommended || resource.usefulness === "High",
  );
  const rest = sorted.filter((resource) => !lead.includes(resource));

  const types = [...new Set(resources.map((resource) => resource.resourceType))];

  return (
    <>
      <PageHeader
        eyebrow={`${counts.resources} items`}
        title="Resources"
        lead="Not tools: articles worth reading once, official docs, accounts worth following, other people's directories, and two hardware side projects. Each one says what to do with it."
        meta={types.map((type) => (
          <Badge key={type}>{type}</Badge>
        ))}
      />

      <Container>
        <Section>
          <SectionHeading
            eyebrow={`${lead.length} of ${resources.length}`}
            title="Read or follow these"
            blurb="Rated high value — each has a specific follow-on action, not just a bookmark."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {lead.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow="Everything else"
            title="Filed for reference"
            blurb="Recorded so nobody researches them twice. Several could not be read directly — the detail page says which."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rest.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </Section>
      </Container>
    </>
  );
}
