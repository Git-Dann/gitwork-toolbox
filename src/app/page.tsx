import Link from "next/link";
import { Headline } from "@/components/brand";
import { CollectionCard, CompactRow, StarterCard, ToolCard } from "@/components/cards";
import { Container, Panel, Section } from "@/components/page-shell";
import { ArrowList, Divider, Eyebrow, SectionHeading, Stat } from "@/components/ui";
import {
  counts,
  groups,
  picks,
  recommended,
  shortlist,
  starterCollections,
  toolkits,
  tools,
  toolsInGroup,
} from "@/lib/data";

export default function HomePage() {
  const worthMoney = shortlist.find((section) => section.number === 1);
  const recommendedAll = [
    ...recommended.tools.map((tool) => ({
      href: `/tools/${tool.slug}`,
      name: tool.name,
      descriptor: tool.category.split(" / ")[0],
      recommended: true,
      approved: tool.approved,
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
    })),
  ];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-hair">
        <Container className="py-12 sm:py-16">
          <Eyebrow accent>Gitwork · studio reference</Eyebrow>
          <Headline className="mt-4 max-w-3xl text-[2rem] sm:text-[2.75rem]" emphasis="actually use">
            Every tool, prompt and kit we{" "}
          </Headline>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-soft">
            {counts.tools} tools we read properly, {counts.starters} Foundry starters to drop into a
            workflow, and {counts.resources} things worth reading once.
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
            <p className="label ml-1 text-mute">
              or{" "}
              <kbd className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--border)" }}>
                ⌘K
              </kbd>
            </p>
          </div>

          <div className="mt-11 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={counts.entries} label="Entries" />
            <Stat value={counts.recommended} label="Recommended" />
            <Stat value={counts.approved} label="Gitwork approved" />
            <Stat value={counts.free} label="Free tools" />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------- recommended */}
      {recommendedAll.length ? (
        <Section>
          <Container>
            <SectionHeading
              eyebrow={`${counts.recommended} of ${counts.entries}`}
              title="Recommended"
              blurb="Flagged by hand in the portal — what we would actually reach for."
              action={{ href: "/tools?recommended=1", label: "Tools only" }}
            />
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {recommendedAll.map((item) => (
                <CompactRow key={item.href} {...item} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- shortlist */}
      {worthMoney ? (
        <Section className="border-t border-hair">
          <Container>
            <SectionHeading
              eyebrow="Read this first"
              title="The decision view"
              blurb="The calls worth making this week. The full shortlist covers what to read, what to build, who to follow and what we have parked."
              action={{ href: "/shortlist", label: "Full shortlist" }}
            />
            <div className="surface overflow-hidden">
              {worthMoney.rows.map((row) => {
                const [item, cost, action] = row.map((cell) => cell.join(" "));
                return (
                  <div
                    key={item}
                    className="grid gap-1.5 border-b border-hair p-4 last:border-0 sm:grid-cols-[14rem_1fr] sm:gap-6"
                  >
                    <div>
                      <p className="text-sm font-medium">{item}</p>
                      <p className="mt-1 font-mono text-[11px] text-mute">{cost}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-soft">{action}</p>
                  </div>
                );
              })}
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
            blurb="Scaffolds and delivery workflows rather than single prompts."
            action={{ href: "/starters?type=KIT", label: "All kits" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {toolkits.slice(0, 4).map((kit) => (
              <StarterCard key={kit.slug} starter={kit} />
            ))}
          </div>

          <Divider className="my-10" />

          <SectionHeading
            eyebrow={`${counts.starterCollections} sets`}
            title="Collections"
            blurb="Grouped starter libraries — which stage of a build each piece serves."
            action={{ href: "/collections", label: "All collections" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
            eyebrow="Assessed high value"
            title="Worth your time"
            blurb="Rated high when we read it, whether or not it has been flagged since."
            action={{ href: "/tools", label: "All tools" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                  .slice(0, 4)
                  .map((tool) => tool.name)}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ caveats */}
      <Section className="border-t border-hair">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="display text-xl">
                Every row here was opened and read
                <span className="text-accent">.</span>
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-soft">
                The imported 684-tool directory was dropped: unread listings with someone else's
                unverified pricing labels are noise, not a reference.
              </p>
              <Link
                href="/about"
                className="label mt-4 inline-block border-b pb-1 transition-colors hover:text-[var(--accent)]"
                style={{ borderColor: "var(--border-strong)" }}
              >
                How this is built →
              </Link>
            </div>
            <Panel>
              <ArrowList
                items={[
                  `Prices are what was published when we looked — ${counts.tools} tools, assessed 5 and 13 August 2026. Re-check before you spend.`,
                  "Recommended and Gitwork approved are set by hand in the admin portal, so they mean a person made the call.",
                  "Dead and paywalled links stay on the list but are hidden by default, so nobody re-researches them.",
                ]}
              />
            </Panel>
          </div>
        </Container>
      </Section>
    </>
  );
}
