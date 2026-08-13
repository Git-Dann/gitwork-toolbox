import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompactRow } from "@/components/cards";
import { Container, PageHeader, Section } from "@/components/page-shell";
import { Eyebrow } from "@/components/ui";
import { recentlyAdded } from "@/lib/data";
import type { RecentEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Newly added",
  description: "Everything added to the toolbox since the original import, newest first.",
};

const HREF: Record<RecentEntry["kind"], string> = {
  tool: "/tools/",
  starter: "/starters/",
  resource: "/resources/",
};

const KIND_LABEL: Record<RecentEntry["kind"], string> = {
  tool: "Tool",
  starter: "Starter",
  resource: "Resource",
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
        eyebrow={`${recentlyAdded.length} total`}
        title="Newly added"
        lead="Newest first."
      />
      <Container>
        {days.map(([day, entries]) => (
          <Section key={day} className="border-b border-hair py-8 last:border-0">
            <Eyebrow accent className="mb-4">
              {new Date(day).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {entries[0].addedBy ? ` · ${entries[0].addedBy}` : ""}
            </Eyebrow>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => (
                <CompactRow
                  key={`${entry.kind}-${entry.slug}`}
                  href={`${HREF[entry.kind]}${entry.slug}`}
                  name={entry.name}
                  descriptor={`${KIND_LABEL[entry.kind]} · ${entry.descriptor}`}
                  recommended={entry.recommended}
                  approved={entry.approved}
                  addedAt={entry.addedAt}
                  icon={entry.icon}
                />
              ))}
            </div>
          </Section>
        ))}
      </Container>
    </>
  );
}
