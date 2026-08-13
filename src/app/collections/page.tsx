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
  description: "Starter collections, filtered cuts and the tool areas.",
};

export default function CollectionsPage() {
  const freeTools = tools.filter((tool) => tool.pricing === "Free");

  const editorial = [
    {
      href: "/tools?recommended=1",
      title: "Recommended",
      blurb: "Picked by hand in the portal.",
      count: recommended.tools.length,
      countLabel: "tools",
      samples: recommended.tools.length
        ? recommended.tools.map((tool) => tool.name)
        : rankedTools.slice(0, 4).map((tool) => tool.name),
    },
    {
      href: "/tools",
      title: "Worth using",
      blurb: "Recommended or rated high.",
      count: picks.tools.length,
      countLabel: "tools",
      samples: picks.tools.map((tool) => tool.name),
    },
    {
      href: "/tools?price=Free",
      title: "Free or open source",
      blurb: "Real free tier or an open-source licence.",
      count: freeTools.length,
      countLabel: "tools",
      samples: freeTools.map((tool) => tool.name),
    },
    {
      href: "/shortlist#potential-to-build-ourselves",
      title: "Build candidates",
      blurb: "Worth building instead of buying.",
      count: 7,
      countLabel: "candidates",
      samples: ["Design token extractor", "Generative UI", "Enquiry triage", "Diff abridger"],
    },
    {
      href: "/shortlist#park-it",
      title: "Parked",
      blurb: "Ruled out, with the reason.",
      count: 20,
      countLabel: "items",
      samples: ["oil-motion", "Appllama", "Path.cv", "LogoCreator", "TinyFolder"],
    },
    {
      href: "/starters?type=KIT",
      title: "Kits & plugins",
      blurb: "Installable, not single prompts.",
      count: toolkits.length,
      countLabel: "kits & plugins",
      samples: toolkits.map((kit) => kit.name),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Saved views"
        title="Collections"
        lead="Saved views you can paste to someone."
      />

      <Container>
        <Section>
          <SectionHeading
            eyebrow={`${counts.starterCollections} sets`}
            title="Starter collections"
            action={{ href: "/starters?type=COLLECTION", label: "In the library" }}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {starterCollections.map((collection) => (
              <StarterCard key={collection.slug} starter={collection} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow="Filtered"
            title="Cuts"
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {editorial.map((item) => (
              <CollectionCard key={item.href} {...item} />
            ))}
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow={`${groups.length}`}
            title="Areas"
            action={{ href: "/tools", label: "All tools" }}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
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
