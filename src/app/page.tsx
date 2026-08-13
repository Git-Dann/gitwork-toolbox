import Link from "next/link";
import { Headline } from "@/components/brand";
import { CollectionCard, ResourceCard, StarterCard, ToolCard } from "@/components/cards";
import { Container, Panel, Section } from "@/components/page-shell";
import { ArrowList, Badge, Divider, Eyebrow, SectionHeading, Stat } from "@/components/ui";
import {
  counts,
  featuredStarters,
  groups,
  picks,
  shortlist,
  starterCollections,
  toolkits,
  tools,
  toolsInGroup,
} from "@/lib/data";

export default function HomePage() {
  const worthMoney = shortlist.find((section) => section.number === 1);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <Container className="py-16 sm:py-24">
          <Eyebrow accent>Gitwork · studio reference</Eyebrow>
          <Headline
            className="mt-6 max-w-4xl text-[2.75rem] sm:text-[4.25rem]"
            emphasis="actually use"
          >
            Every tool, prompt and kit we{" "}
          </Headline>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-soft">
            {counts.tools} tools we fetched and read properly, {counts.starters} Foundry starters
            you can drop straight into a workflow, and {counts.resources} things worth reading once.
            Nothing here is padded out with someone else's directory.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/starters"
              className="rounded-full px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Browse {counts.starters} starters
            </Link>
            <Link
              href="/tools"
              className="rounded-full border px-5 py-3 text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              The tools list
            </Link>
            <p className="label ml-1 text-mute">
              or press{" "}
              <kbd className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--border)" }}>
                ⌘K
              </kbd>{" "}
              to search
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat value={counts.entries} label="Entries in total" />
            <Stat value={counts.starters} label="Foundry starters" />
            <Stat value={counts.tools} label="Tools assessed" />
            <Stat value={counts.picks} label="Worth your time" />
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------- shortlist */}
      {worthMoney ? (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Read this first"
              title="The decision view"
              blurb="Of everything on the list, these are the calls worth making this week. The rest of the shortlist covers what to read, what to build, who to follow and what we have deliberately parked."
              action={{ href: "/shortlist", label: "Full shortlist" }}
            />
            <div
              className="surface divide-y overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {worthMoney.rows.map((row) => {
                const [item, cost, action, confidence] = row.map((cell) => cell.join(" "));
                return (
                  <div
                    key={item}
                    className="grid gap-3 border-b p-5 last:border-0 sm:grid-cols-[15rem_1fr] sm:gap-8"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div>
                      <p className="font-medium">{item}</p>
                      <p className="mt-1.5 font-mono text-xs text-mute">{cost}</p>
                      <Badge
                        className="mt-2.5"
                        tone={confidence.startsWith("High") ? "green" : "accent"}
                      >
                        {confidence} confidence
                      </Badge>
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
            eyebrow="Foundry starters"
            title="Lift these straight into a build"
            blurb={`${counts.prompts} prompts, ${counts.skills} skills, ${counts.kits} kits, ${counts.plugins} plugins and ${counts.starterCollections} collections — copy the prompt text, or install the kit and go.`}
            action={{ href: "/starters", label: "Starter library" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {featuredStarters.slice(0, 4).map((starter) => (
              <StarterCard key={starter.slug} starter={starter} />
            ))}
          </div>

          <Divider className="my-12" />

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
        </Container>
      </Section>

      {/* --------------------------------------------------------------- picks */}
      <Section className="border-t border-hair">
        <Container>
          <SectionHeading
            eyebrow={`${picks.tools.length + picks.resources.length} of ${counts.tools + counts.resources}`}
            title="Worth your time"
            blurb="Recommended in the portal, or rated high value when we assessed it. Everything else on the list is mid-table — and the shortlist says why."
            action={{ href: "/tools?recommended=1", label: "Recommended only" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {picks.tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
            {picks.resources.slice(0, 4).map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
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
                  .slice(0, 5)
                  .map((tool) => tool.name)}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------- collections */}
      <Section className="border-t border-hair">
        <Container>
          <SectionHeading
            eyebrow={`${counts.starterCollections} sets`}
            title="Collections"
            blurb="Grouped starter libraries — the index of what exists and which stage of a build each piece serves."
            action={{ href: "/collections", label: "All collections" }}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {starterCollections.slice(0, 4).map((collection) => (
              <StarterCard key={collection.slug} starter={collection} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ caveats */}
      <Section className="border-t border-hair">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <Eyebrow accent>How to read this</Eyebrow>
              <h2 className="display mt-4 text-2xl sm:text-3xl">
                Every row here was opened and read
                <span className="text-accent">.</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-soft">
                The imported 684-tool directory was dropped: unread listings with someone else's
                unverified pricing labels are not a reference, they are noise.
              </p>
              <Link
                href="/about"
                className="label mt-5 inline-block border-b pb-1 transition-colors hover:text-[var(--accent)]"
                style={{ borderColor: "var(--border-strong)" }}
              >
                How this is built →
              </Link>
            </div>
            <Panel>
              <ArrowList
                items={[
                  `Prices are what was published when we looked — ${counts.tools} tools, assessed 5 and 13 August 2026. Re-check before you spend.`,
                  "Recommended and Gitwork approved are set by hand in the admin portal, so they mean a person made a call.",
                  "Nothing carries an added date, so staleness cannot be judged from the data alone.",
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
