import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/page-shell";
import { StarterBrowser } from "@/components/starter-browser";
import { Badge } from "@/components/ui";
import { counts, starterTags, starters } from "@/lib/data";
import type { StarterListItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Starter library",
  description: `${counts.starters} Foundry starters — prompts, skills, kits, plugins and collections you can lift straight into a workflow.`,
};

const listItems: StarterListItem[] = starters.map((starter) => ({
  slug: starter.slug,
  name: starter.name,
  summary: starter.summary,
  type: starter.type,
  typeLabel: starter.typeLabel,
  tags: starter.tags,
  featured: starter.featured,
  recommended: starter.recommended,
  approved: starter.approved,
  addedAt: starter.addedAt,
}));

export default function StartersPage() {
  return (
    <>
      <PageHeader
        eyebrow={`${counts.starters} from Foundry`}
        title="The starter library"
        lead="Copy the text into any agent, or install the kit."
        meta={
          <>
            <Badge>{counts.prompts} prompts</Badge>
            <Badge tone="accent">{counts.skills} skills</Badge>
            <Badge tone="accent">{counts.kits} kits</Badge>
            <Badge tone="accent">{counts.plugins} plugins</Badge>
            <Badge>{counts.starterCollections} collections</Badge>
          </>
        }
      />
      <Container className="py-10">
        <Suspense
          fallback={<p className="label py-12 text-center text-mute">Loading the library…</p>}
        >
          <StarterBrowser starters={listItems} tags={starterTags} />
        </Suspense>
      </Container>
    </>
  );
}
