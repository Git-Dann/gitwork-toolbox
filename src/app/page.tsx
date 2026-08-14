import Link from "next/link";
import { Headline } from "@/components/brand";
import {
  CollectionCard,
  CompactRow,
  ResourceCard,
  StarterCard,
  ToolCard,
} from "@/components/cards";
import { Container, Section } from "@/components/page-shell";
import { Divider, Eyebrow, SectionHeading } from "@/components/ui";
import {
  counts,
  getResource,
  getStarter,
  getTool,
  groups,
  picks,
  recentlyAdded,
  recommended,
  starterCollections,
  toolkits,
  tools,
  toolsInGroup,
} from "@/lib/data";

export default function HomePage() {
  const recommendedAll = [
    ...recommended.tools.map((tool) => ({
      href: `/tools/${tool.slug}`,
      name: tool.name,
      descriptor: tool.category.split(" / ")[0],
      recommended: true,
      approved: tool.approved,
      icon: tool.icon,
    })),
    ...recommended.starters.map((starter) => ({
      href: `/starters/${starter.slug}`,
      name: starter.name,
      descriptor: starter.typeLabel,
      recommended: true,
      approved: starter.approved,
    })),
    ...recommended.resources.map((resource) => ({
      href: `/resources/${resource.slug}`,
      name: resource.name,
      descriptor: resource.resourceType,
      recommended: true,
      approved: resource.approved,
      icon: resource.icon,
    })),
  ];

  // The newest entries as real cards: a rail that starts life with one item still
  // needs to look deliberate.
  const newestCards = recentlyAdded.slice(0, 4).map((entry) => {
    if (entry.kind === "tool") {
      const tool = getTool(entry.slug);
      return tool ? <ToolCard key={entry.slug} tool={tool} /> : null;
    }
    if (entry.kind === "resource") {
      const resource = getResource(entry.slug);
      return resource ? <ResourceCard key={entry.slug} resource={resource} /> : null;
    }
    const starter = getStarter(entry.slug);
    return starter ? <StarterCard key={entry.slug} starter={starter} /> : null;
  });

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-hair">
        <Container className="py-10 sm:py-14">
          <Eyebrow accent>Gitwork · studio reference</Eyebrow>
          {/* Says what the page is, because that is what a reference has to do
              first. The previous headline — "every tool, prompt and kit we
              actually use" — claimed first-hand use of all of it, which is not
              true of a catalogue this size and is the kind of claim a developer
              checks exactly once before distrusting everything else on the page.
              The ratings below are research, not a usage log, and the copy now
              matches that. */}
          <Headline className="mt-4 max-w-3xl text-[2rem] sm:text-[2.75rem]" emphasis="in one place">
            Every tool, prompt and kit,{" "}
          </Headline>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-soft">
            A reference for the team: starters you can install, prompts you can lift, and a tools
            list with what each one does and what it costs. Start here rather than in a search
            engine.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              href="/starters"
              className="rounded-full px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Browse {counts.starters} starters
            </Link>
            <Link
              href="/tools"
              className="rounded-full border px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              The tools list
            </Link>
          </div>
        </Container>
      </section>

      {/* -------------------------------------------------------- newly added */}
      {recentlyAdded.length ? (
        <Section>
          <Container>
            <SectionHeading
              eyebrow={recentlyAdded.length === 1 ? "1 new" : `${recentlyAdded.length} new`}
              title="Newly added"
              action={{ href: "/new", label: "All additions" }}
            />
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
              {newestCards}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* --------------------------------------------------------- recommended */}
      {recommendedAll.length ? (
        <Section className={recentlyAdded.length ? "border-t border-hair" : ""}>
          <Container>
            <SectionHeading
              eyebrow={`${counts.recommended} picked by hand`}
              title="Recommended"
              action={{ href: "/tools?recommended=1", label: "Tools only" }}
            />
            <div className="grid gap-x-8 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
              {recommendedAll.map((item) => (
                <CompactRow key={item.href} {...item} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ starters */}
      <Section className="border-t border-hair">
        <Container>
          <SectionHeading
            eyebrow="Installable"
            title="Kits & plugins"
            action={{ href: "/starters?type=KIT", label: "All kits" }}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {toolkits.slice(0, 4).map((kit) => (
              <StarterCard key={kit.slug} starter={kit} />
            ))}
          </div>

          <Divider className="my-10" />

          <SectionHeading
            eyebrow={`${counts.starterCollections} sets`}
            title="Collections"
            action={{ href: "/collections", label: "All collections" }}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {starterCollections.slice(0, 4).map((collection) => (
              <StarterCard key={collection.slug} starter={collection} />
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- picks */}
      <Section className="border-t border-hair">
        <Container>
          <SectionHeading
            eyebrow="Rated high"
            title="Worth using"
            action={{ href: "/tools", label: "All tools" }}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {picks.tools.slice(0, 4).map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </Container>
      </Section>

      {/* -------------------------------------------------------------- browse */}
      <Section className="border-t border-hair">
        <Container>
          <SectionHeading
            eyebrow={`${groups.length} areas`}
            title="Browse by area"
            action={{ href: "/tools", label: "Everything" }}
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
                  .slice(0, 4)
                  .map((tool) => tool.name)}
              />
            ))}
          </div>
        </Container>
      </Section>

    </>
  );
}
