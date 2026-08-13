import type { Metadata } from "next";
import { CollectionCard, StarterCard } from "@/components/cards";
import { Container, PageHeader, Section } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import {
  counts,
  groups,
  picks,
  rankedTools,
  recommended,
  starterCollections,
  toolkits,
  tools,
  toolsInGroup,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Curated sets: Foundry starter collections, the tool areas, and the editorial cuts worth keeping.",
};

export default function CollectionsPage() {
  const freeTools = tools.filter((tool) => tool.pricing === "Free");

  const editorial = [
    {
      href: "/tools?recommended=1",
      title: "Recommended",
      blurb: "Flagged by hand in the admin portal — the ones we would put on a client project.",
      count: recommended.tools.length,
      countLabel: "tools",
      samples: recommended.tools.length
        ? recommended.tools.map((tool) => tool.name)
        : rankedTools.slice(0, 4).map((tool) => tool.name),
    },
    {
      href: "/tools",
      title: "Worth your time",
      blurb: "Recommended, or rated high value at assessment. Best verdict first.",
      count: picks.tools.length,
      countLabel: "tools",
      samples: picks.tools.map((tool) => tool.name),
    },
    {
      href: "/tools?price=Free",
      title: "Free or open source",
      blurb: "A genuine free tier or an open-source licence. Check the licence before shipping.",
      count: freeTools.length,
      countLabel: "tools",
      samples: freeTools.map((tool) => tool.name),
    },
    {
      href: "/shortlist#potential-to-build-ourselves",
      title: "Build candidates",
      blurb: "The seven things worth building instead of buying — ranked, with a verdict.",
      count: 7,
      countLabel: "candidates",
      samples: ["Design token extractor", "Generative UI", "Enquiry triage", "Diff abridger"],
    },
    {
      href: "/shortlist#park-it",
      title: "Parked",
      blurb: "Recorded so nobody re-researches them. Read this before adding to the stack.",
      count: 20,
      countLabel: "items",
      samples: ["oil-motion", "Appllama", "Path.cv", "LogoCreator", "TinyFolder"],
    },
    {
      href: "/starters?type=KIT",
      title: "Kits & plugins",
      blurb: "Installable scaffolds and delivery workflows rather than single prompts.",
      count: toolkits.length,
      countLabel: "kits & plugins",
      samples: toolkits.map((kit) => kit.name),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Curated sets"
        title="Collections"
        lead="Ways into the list that are more useful than alphabetical: Foundry's own starter collections, the tool areas, and the editorial cuts."
      />

      <Container>
        <Section>
          <SectionHeading
            eyebrow={`${counts.starterCollections} sets`}
            title="Foundry starter collections"
            blurb="Each one is an index in its own right — what exists in the library and which stage of a build it serves."
            action={{ href: "/starters?type=COLLECTION", label: "In the library" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {starterCollections.map((collection) => (
              <StarterCard key={collection.slug} starter={collection} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow="Editorial"
            title="Cuts worth keeping"
            blurb="Filtered views of the same data, saved as links you can paste to someone."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {editorial.map((item) => (
              <CollectionCard key={item.href} {...item} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow={`${groups.length} areas`}
            title="Tool areas"
            action={{ href: "/tools", label: "All tools" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <CollectionCard
                key={group.slug}
                href={`/tools?group=${group.slug}`}
                title={group.name}
                blurb={group.blurb}
                count={group.count}
                countLabel="tools & resources"
                samples={toolsInGroup(group.slug)
                  .slice(0, 5)
                  .map((tool) => tool.name)}
              />
            ))}
          </div>
        </Section>
      </Container>
    </>
  );
}
