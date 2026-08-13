import type { Metadata } from "next";
import { Container, PageHeader, Panel, Section } from "@/components/page-shell";
import { ArrowList, Eyebrow, SectionHeading, Stat } from "@/components/ui";
import { counts, meta } from "@/lib/data";

export const metadata: Metadata = {
  title: "How this is built",
  description:
    "Where the data comes from, what was left out, and how the recommended and approved flags are set.",
};

export default function AboutPage() {
  const updated = meta.overrides.updatedAt
    ? new Date(meta.overrides.updatedAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Provenance"
        title="How this is built"
        lead="Two sources, both ours: the tools we assessed by hand, and the Foundry starter library. Nothing is padded out with third-party listings."
      />

      <Container>
        <Section>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat value={counts.tools} label="Tools assessed" />
            <Stat value={counts.starters} label="Foundry starters" />
            <Stat value={counts.resources} label="Resources" />
            <Stat value={counts.entries} label="Entries in total" />
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow="Sources"
            title="Where each row came from"
            blurb="Both sources are committed to the repository, so the site can always be rebuilt from scratch."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel tone="accent" title="The assessed tools list">
              <p className="text-sm leading-relaxed text-soft">
                {counts.tools} tools and {counts.resources} resources, each one fetched and read
                individually on 5 and 13 August 2026, with a real verdict in the “Useful to Gitwork”
                and “Build ourselves?” fields. It comes from a Google Sheet, exported as .xlsx and
                extracted by a stdlib Python script.
              </p>
            </Panel>
            <Panel title="Foundry starters">
              <p className="text-sm leading-relaxed text-soft">
                {counts.starters} starters exported from Foundry: {counts.prompts} prompts,{" "}
                {counts.skills} skills, {counts.kits} kits, {counts.plugins} plugins and{" "}
                {counts.starterCollections} collections. Each carries its full prompt text, so the
                page you read is the thing you paste.
              </p>
            </Panel>
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading
            eyebrow="Editorial rules"
            title="What is deliberately not here"
          />
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <Panel>
              <ArrowList
                items={[
                  "The 684-tool 700 AI Toolkit import was dropped. Unread listings carrying someone else's unverified pricing labels are noise, not a reference.",
                  "Three rows from the Resources tab are filtered out in the build script: a private billing page, a private Notion page, and a live client site that belongs in the CRM.",
                  "No logins, accounts or favourites on the public side. The only authenticated surface is the admin portal.",
                  "The site carries a noindex tag and a robots.txt disallow, because the verdicts here are written for internal use.",
                ]}
              />
            </Panel>
            <Panel title="Recommended vs approved">
              <p className="text-sm leading-relaxed text-soft">
                <strong className="text-[var(--text)]">Recommended</strong> means someone at Gitwork
                would actively reach for it. <strong className="text-[var(--text)]">Gitwork
                approved</strong> means it has been checked over and cleared for client work. Both
                are set by hand by Dan or Harry in the admin portal — never inferred from the data.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-soft">
                {counts.recommended} recommended, {counts.approved} approved.
                {updated ? ` Last changed ${updated} by ${meta.overrides.updatedBy}.` : ""}
              </p>
            </Panel>
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading eyebrow="This site" title="How it is put together" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Build">
              <p className="text-sm leading-relaxed text-soft">
                Next.js on Vercel, statically generated, no database. A build step compiles the two
                source files plus the admin flags into typed JSON, so re-exporting a source and
                rebuilding is the whole update process.
              </p>
            </Panel>
            <Panel title="Updating the content">
              <div className="prose-tight text-sm leading-relaxed">
                <p>
                  Re-export the sheet over <code>data/source/ai-tools-and-links.xlsx</code>, run{" "}
                  <code>python3 scripts/extract-workbook.py</code>, then <code>npm run data</code>.
                  Same for the Foundry export. Flags set in the portal are stored in{" "}
                  <code>data/overrides.json</code> and committed, so every change is versioned.
                </p>
              </div>
            </Panel>
          </div>
          <div className="mt-8 max-w-2xl text-sm leading-relaxed text-mute">
            <Eyebrow accent className="mb-2">
              One caveat worth repeating
            </Eyebrow>
            Prices are what was published on the day we looked, and nothing on the list carries an
            added date — so staleness cannot be judged from the data. Re-check anything before you
            spend money on it.
          </div>
        </Section>
      </Container>
    </>
  );
}
