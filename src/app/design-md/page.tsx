import type { Metadata } from "next";
import { Suspense } from "react";
import { DesignBrowser } from "@/components/design-browser";
import { Container, PageHeader } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { designApps, designCategories, designIndex } from "@/lib/data";

export const metadata: Metadata = {
  title: "DESIGN.md specs",
  description: `Reverse-engineered design systems for ${designIndex.counts.apps} apps — colours, type ramps, component states, motion and haptics, in markdown an agent reads natively.`,
};

export default function DesignMdPage() {
  const { counts } = designIndex;
  return (
    <>
      <PageHeader
        eyebrow={`${counts.apps} apps · ${counts.specs} specs`}
        title="DESIGN.md"
        lead="Hand one to an agent and it stops guessing at the styling."
        meta={
          <>
            <Badge tone="accent">Framework-neutral</Badge>
            <Badge>SwiftUI</Badge>
            <Badge>Expo</Badge>
            <Badge>Jetpack Compose</Badge>
          </>
        }
      />

      <Container className="py-8">
        <Suspense fallback={<p className="label py-12 text-center text-mute">Loading the specs…</p>}>
          <DesignBrowser apps={designApps} categories={designCategories} />
        </Suspense>
      </Container>
    </>
  );
}
