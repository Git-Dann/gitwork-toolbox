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
  const highValue = sorted.filter((resource) => resource.usefulness === "High");
  const rest = sorted.filter((resource) => resource.usefulness !== "High");

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
            eyebrow={`${highValue.length} of ${resources.length}`}
            title="Read or follow these"
            blurb="Rated high value — each has a specific follow-on action, not just a bookmark."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highValue.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading
            eyebrow="Everything else"
            title="Filed for reference"
            blurb="Recorded so nobody researches them twice. Several could not be read directly — the detail page says which."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </Section>
      </Container>
    </>
  );
}
