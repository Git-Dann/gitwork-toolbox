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
          <Headline className="mt-4 max-w-3xl text-[2rem] sm:text-[2.75rem]" emphasis="actually use">
            Every tool, prompt and kit we{" "}
          </Headline>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-soft">
            Grab a prompt, install a kit, or find out what a tool actually costs and whether it
            holds up on client work — before you commit to it.
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
              eyebrow="Buy · read · build · park"
              title="Shortlist"
              action={{ href: "/shortlist", label: "All 5 sections" }}
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
            eyebrow="Rated high"
            title="Worth using"
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

    </>
  );
}
