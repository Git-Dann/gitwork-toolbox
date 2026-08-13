import Link from "next/link";
import { CollectionCard, ResourceCard, StarterCard, ToolCard } from "@/components/cards";
import { Container, Section } from "@/components/page-shell";
import { Badge, Divider, Eyebrow, SectionHeading, Stat } from "@/components/ui";
import {
  counts,
  featuredStarters,
  groups,
  meta,
  picks,
  shortlist,
  starterCollections,
  toolkits,
  tools,
  toolsInGroup,
} from "@/lib/data";

export default function HomePage() {
  const worthMoney = shortlist.find((section) => section.number === 1);
  const freeStandouts = tools
    .filter((tool) => tool.pricing === "Free" && tool.assessed)
    .slice(0, 6);
  const deadLinks = tools.filter((tool) => tool.linkStatus === "dead").length;

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-line/10 bg-white/40">
        <Container className="py-14 sm:py-20">
          <Eyebrow>Gitwork · studio reference</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-[2.75rem] leading-[1.02] sm:text-6xl">
            Every tool, prompt and kit the studio actually uses.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
            One place for the {counts.tools} AI tools on our list and the {counts.starters} Foundry
            starters you can drop straight into a workflow. Where we have looked at something
            properly, you get the verdict — including the ones to leave alone.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/tools"
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-85"
            >
              Browse {counts.tools} tools
            </Link>
            <Link
              href="/starters"
              className="hairline rounded-full border bg-white px-5 py-3 text-sm font-medium transition-colors hover:border-signal/50 hover:text-signal"
            >
              Starter library
            </Link>
            <p className="label ml-1 text-mute">
              or press <kbd className="rounded border border-line/15 px-1.5 py-0.5">⌘K</kbd> to
              search
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={counts.tools} label="Tools listed" />
            <Stat value={counts.starters} label="Foundry starters" />
            <Stat value={counts.assessed} label="Assessed by us" />
            <Stat value={counts.free} label="Genuinely free" />
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
            <div className="card divide-y divide-line/8">
              {worthMoney.rows.map((row) => {
                const [item, cost, action, confidence] = row.map((cell) => cell.join(" "));
                return (
                  <div key={item} className="grid gap-2 p-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
                    <div>
                      <p className="font-medium">{item}</p>
                      <p className="label mt-1.5 text-mute normal-case tracking-normal">{cost}</p>
                      <Badge className="mt-2" tone={confidence.startsWith("High") ? "green" : "signal"}>
                        {confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-ink/75">{action}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* --------------------------------------------------------------- picks */}
      <Section className="border-t border-line/10 bg-white/40">
        <Container>
          <SectionHeading
            eyebrow={`${picks.tools.length + picks.resources.length} of ${counts.assessed} assessed`}
            title="Gitwork picks"
            blurb="Fetched, read and rated high value for the way we work. Everything else on the list is either mid-table or somebody else's opinion."
            action={{ href: "/tools?picks=1", label: "All picks" }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {picks.tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
            {picks.resources.slice(0, 3).map((resource) => (
              <ResourceCard key={resource.slug} resource={resource} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ starters */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Foundry starters"
            title="Prompts, skills and kits to lift straight into a build"
            blurb={`${counts.prompts} prompts, ${counts.skills} skills, ${counts.kits} kits, ${counts.plugins} plugins and ${counts.starterCollections} collections — copy the prompt text, or install the kit and go.`}
            action={{ href: "/starters", label: "Starter library" }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStarters.map((starter) => (
              <StarterCard key={starter.slug} starter={starter} />
            ))}
            {toolkits.slice(0, 1).map((starter) => (
              <StarterCard key={starter.slug} starter={starter} />
            ))}
          </div>

          <Divider className="my-10" />

          <SectionHeading
            eyebrow="Curated sets"
            title="Collections"
            blurb="Grouped starter libraries — the index of what exists and which stage of a build each piece serves."
            action={{ href: "/collections", label: "All collections" }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {starterCollections.slice(0, 6).map((collection) => (
              <StarterCard key={collection.slug} starter={collection} />
            ))}
          </div>
        </Container>
      </Section>

      {/* -------------------------------------------------------------- browse */}
      <Section className="border-t border-line/10 bg-white/40">
        <Container>
          <SectionHeading
            eyebrow={`${counts.categories} categories`}
            title="Browse by area"
            blurb="The two source lists use different category names, so both are folded into these ten areas."
            action={{ href: "/tools", label: "Everything" }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* ---------------------------------------------------------------- free */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow={`${counts.free} tools`}
            title="Free or open source"
            blurb="A real free tier or an open-source licence — the ones below we have also read properly."
            action={{ href: "/tools?price=Free", label: "All free tools" }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {freeStandouts.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ caveats */}
      <Section className="border-t border-line/10">
        <Container>
          <div className="card grid gap-6 p-6 sm:grid-cols-[1fr_1.4fr] sm:p-8">
            <div>
              <Eyebrow>Before you trust a row</Eyebrow>
              <h2 className="mt-3 font-display text-2xl leading-tight">
                {counts.tools - counts.assessed + counts.resources} of these came from someone
                else's directory.
              </h2>
              <Link
                href="/about"
                className="label mt-4 inline-block border-b border-ink/20 pb-1 transition-colors hover:border-signal hover:text-signal"
              >
                How this is built →
              </Link>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-ink/75">
              <li>
                <strong className="font-medium">Pricing labels are theirs, not ours.</strong>{" "}
                Directory rows carry the directory's own Free / Freemium / Paid label, unverified
                against any vendor's current pricing page.
              </li>
              <li>
                <strong className="font-medium">{deadLinks} links are dead or paywalled</strong> and
                are hidden by default on the tools page. Turn the filter off to see them.
              </li>
              <li>
                <strong className="font-medium">Nothing here has an added date</strong>, so staleness
                cannot be judged from the data. Re-check anything before you spend money on it.
              </li>
              <li>
                <strong className="font-medium">{meta.duplicatePairs.length} duplicate pairs</strong>{" "}
                were collapsed out of the directory — mostly the same product listed twice with “AI”
                appended.
              </li>
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
