import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceCard, StarterCard, ToolCard } from "@/components/cards";
import { Container, PageHeader, Section } from "@/components/page-shell";
import { Eyebrow } from "@/components/ui";
import { getResource, getStarter, getTool, recentlyAdded } from "@/lib/data";
import type { RecentEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Newly added",
  description: "Everything added to the toolbox since the original import, newest first.",
};

/** Groups entries by the day they landed, so a posting session reads as one batch. */
function byDay(entries: RecentEntry[]) {
  const days = new Map<string, RecentEntry[]>();
  for (const entry of entries) {
    const day = entry.addedAt.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.entries()];
}

export default function NewPage() {
  // The page only exists once something has been added.
  if (!recentlyAdded.length) notFound();

  const days = byDay(recentlyAdded);

  return (
    <>
      <PageHeader
        eyebrow={recentlyAdded.length === 1 ? "1 entry" : `${recentlyAdded.length} entries`}
        title="Newly added"
      />
      <Container>
        {days.map(([day, entries]) => (
          <Section key={day} className="border-b border-hair py-7 last:border-0">
            <Eyebrow accent className="mb-4">
              {new Date(day).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {entries[0].addedBy ? ` · ${entries[0].addedBy}` : ""}
            </Eyebrow>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
              {entries.map((entry) => {
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
              })}
            </div>
          </Section>
        ))}
      </Container>
    </>
  );
}
