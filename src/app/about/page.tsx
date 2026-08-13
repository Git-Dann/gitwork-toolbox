import type { Metadata } from "next";
import { Container, PageHeader, Panel, Section } from "@/components/page-shell";
import { ArrowList, SectionHeading } from "@/components/ui";
import { counts, meta } from "@/lib/data";

export const metadata: Metadata = {
  title: "How this is built",
  description: "Where the data comes from and how to update it.",
};

export default function AboutPage() {
  const updated = meta.overrides.updatedAt
    ? new Date(meta.overrides.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })
    : null;

  return (
    <>
      <PageHeader eyebrow="Reference" title="How this is built" />

      <Container>
        <Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Sources">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium">{counts.tools} tools · {counts.resources} resources</dt>
                  <dd className="text-soft">
                    Google Sheet, exported as .xlsx. Each one opened and read, 5 and 13 August 2026.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">{counts.starters} starters</dt>
                  <dd className="text-soft">
                    Foundry export. {counts.prompts} prompts, {counts.skills} skills, {counts.kits}{" "}
                    kits, {counts.plugins} plugins, {counts.starterCollections} collections.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">
                    {counts.recommended} recommended · {counts.approved} approved
                  </dt>
                  <dd className="text-soft">
                    Set by hand in /admin.{updated ? ` Last change ${updated}.` : ""}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Update it">
              <div className="prose-tight text-sm leading-relaxed">
                <p>Add an entry from any Cowork session on the repo:</p>
                <p>
                  <code>add https://example.com to the toolbox</code>
                </p>
                <p>
                  Re-export a source: drop the .xlsx over{" "}
                  <code>data/source/ai-tools-and-links.xlsx</code>, run{" "}
                  <code>python3 scripts/extract-workbook.py</code>, then <code>npm run data</code>.
                </p>
                <p>
                  New icons and previews: <code>node scripts/fetch-icons.mjs</code> and{" "}
                  <code>node scripts/fetch-previews.mjs</code>.
                </p>
              </div>
            </Panel>
          </div>
        </Section>

        <Section className="border-t border-hair">
          <SectionHeading title="Reading the list" />
          <Panel>
            <ArrowList
              items={[
                "Recommended = we would reach for it. Gitwork approved = checked over for client work. Both set by hand, never inferred.",
                "Prices are what was published on the day we looked. Re-check before you spend.",
                "Dead and paywalled links stay listed but are hidden by default, so nobody researches them twice.",
                "The 684-tool imported directory was dropped. Nobody had read those rows, so they were noise.",
                "Not indexed by search engines, and three private links from the source sheet are excluded from the build.",
              ]}
            />
          </Panel>
        </Section>
      </Container>
    </>
  );
}
