import type { Metadata } from "next";
import { Suspense } from "react";
import { DesignBrowser } from "@/components/design-browser";
import { Container, PageHeader, Panel } from "@/components/page-shell";
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
        <Panel tone="flag" title="Read this before it reaches a client build">
          <p className="text-sm leading-relaxed text-soft">
            These are other companies&rsquo; design systems, reverse-engineered — exact brand
            hexes, proprietary typefaces, iconography. Use them for structure, hierarchy and
            motion, which is where the value is. Lifting Bumble&rsquo;s yellow and hexagons into a
            dating app for a client is trade dress, not inspiration, and the typefaces named in
            these specs (Brando, Uber Move, Airbnb Cereal and the rest) are licensed separately
            and are not ours to ship.
          </p>
        </Panel>

        <div className="mt-8">
          <Suspense
            fallback={<p className="label py-12 text-center text-mute">Loading the specs…</p>}
          >
            <DesignBrowser apps={designApps} categories={designCategories} />
          </Suspense>
        </div>
      </Container>
    </>
  );
}
