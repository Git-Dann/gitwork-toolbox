import type { Metadata } from "next";
import { OutboundLink } from "@/components/cards";
import { Container, PageHeader, Panel, Section } from "@/components/page-shell";
import { Eyebrow, SectionHeading, Stat } from "@/components/ui";
import { counts, meta } from "@/lib/data";

export const metadata: Metadata = {
  title: "How this is built",
  description:
    "Where the data comes from, what was deduplicated, what could not be verified, and how much of it to trust.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Provenance"
        title="How this is built"
        lead="Two sources with very different reliability, kept apart on purpose. This page is the audit trail: what came from where, what was collapsed, and what nobody has checked."
      />

      <Container>
        <Section>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={counts.tools} label="Tools" />
            <Stat value={counts.assessed} label="Assessed by us" />
            <Stat value={counts.starters} label="Foundry starters" />
            <Stat value={counts.resources} label="Resources" />
          </div>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading
            eyebrow="Sources"
            title="Where each row came from"
            blurb="Filter by source anywhere on the tools page. Nothing is merged across the two."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel tone="signal" title="Gitwork assessed">
              <p className="text-sm leading-relaxed text-ink/85">
                41 links fetched and read individually, each with a real verdict in the “Useful to
                Gitwork” and “Build ourselves?” fields. Assessed 5 and 13 August 2026. These are the
                rows worth acting on.
              </p>
            </Panel>
            <Panel title="700 AI Toolkit">
              <p className="text-sm leading-relaxed text-ink/85">
                684 tools extracted from{" "}
                <OutboundLink
                  href="https://toolkit.dailyprompting.com/"
                  className="text-signal hover:underline"
                >
                  toolkit.dailyprompting.com
                </OutboundLink>{" "}
                on 5 August 2026, carrying the directory's own one-line description and pricing
                label. Marked “Not assessed” because nobody has evaluated them — including the
                directory, in most cases.
              </p>
            </Panel>
          </div>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading
            eyebrow="The workbook"
            title="How it is organised"
            blurb="Straight from the source spreadsheet's read-me, so this page and the workbook cannot drift apart."
          />
          <dl className="card divide-y divide-line/8 px-5">
            {meta.readme.map((entry, index) => (
              <div key={`${entry.term}-${index}`} className="grid gap-1 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium">{entry.term}</dt>
                <dd className="text-sm leading-relaxed text-ink/75">{entry.detail}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading
            eyebrow="Data quality"
            title="What was cleaned, and what could not be verified"
          />
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line/10">
                  <th className="label px-5 py-3 text-left text-mute">Measure</th>
                  <th className="label px-5 py-3 text-right text-mute">Count</th>
                  <th className="label px-5 py-3 text-left text-mute">Note</th>
                </tr>
              </thead>
              <tbody>
                {meta.dataQuality.map((row) => (
                  <tr key={row.measure} className="border-b border-line/8 last:border-0">
                    <td className="px-5 py-3 align-top font-medium">{row.measure}</td>
                    <td className="px-5 py-3 text-right align-top font-mono text-[0.8rem]">
                      {row.count}
                    </td>
                    <td className="px-5 py-3 align-top leading-relaxed text-ink/75">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading
            eyebrow={`${meta.duplicatePairs.length} pairs`}
            title="Duplicates collapsed out of the directory"
            blurb="Almost all of them the same product entered twice with “AI” appended to the name."
          />
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-line/10">
                  <th className="label px-5 py-3 text-left text-mute">Kept</th>
                  <th className="label px-5 py-3 text-left text-mute">Removed</th>
                  <th className="label px-5 py-3 text-left text-mute">Site</th>
                </tr>
              </thead>
              <tbody>
                {meta.duplicatePairs.map((pair) => (
                  <tr key={pair.removed} className="border-b border-line/8 last:border-0">
                    <td className="px-5 py-2.5 font-medium">{pair.kept}</td>
                    <td className="px-5 py-2.5 text-mute line-through">{pair.removed}</td>
                    <td className="px-5 py-2.5">
                      <OutboundLink
                        href={pair.website}
                        className="text-xs text-signal hover:underline"
                      >
                        {pair.website.replace(/^https?:\/\//, "")}
                      </OutboundLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section className="border-t border-line/10">
          <SectionHeading eyebrow="This site" title="How it is put together" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Build">
              <p className="text-sm leading-relaxed text-ink/85">
                Next.js on Vercel, statically generated. The workbook is committed as an .xlsx and
                extracted with a stdlib Python script; the Foundry starters are committed as their
                raw export. A build step turns both into typed JSON, so re-exporting a source and
                rebuilding is the whole update process. No database, no logins, no accounts.
              </p>
            </Panel>
            <Panel title="Scope">
              <p className="text-sm leading-relaxed text-ink/85">
                Three rows on the Resources tab were left out of the site: a private billing page, a
                private Notion page, and a live client site that belongs in the CRM. The pages carry
                a noindex tag, since the verdicts here are written for internal use.
              </p>
            </Panel>
          </div>
          <div className="mt-6 max-w-2xl text-sm leading-relaxed text-mute">
            <Eyebrow className="mb-2">Updating it</Eyebrow>
            Re-export the sheet as .xlsx over{" "}
            <code className="font-mono text-[0.8rem]">data/source/ai-tools-and-links.xlsx</code>, run{" "}
            <code className="font-mono text-[0.8rem]">python3 scripts/extract-workbook.py</code>, then{" "}
            <code className="font-mono text-[0.8rem]">npm run data</code>. Same for the Foundry
            starters export. Everything on the site — counts, categories, collections, this page —
            regenerates from those two files.
          </div>
        </Section>
      </Container>
    </>
  );
}
