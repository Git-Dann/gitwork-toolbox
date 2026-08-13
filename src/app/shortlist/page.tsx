import type { Metadata } from "next";
import { Container, PageHeader, Section } from "@/components/page-shell";
import { Eyebrow } from "@/components/ui";
import { shortlist } from "@/lib/data";
import type { ShortlistSection } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shortlist & actions",
  description:
    "The decision view: what to buy, what to read, what to build, who to follow, and what we have deliberately parked.",
};

export default function ShortlistPage() {
  return (
    <>
      <PageHeader
        eyebrow="41 links assessed"
        title="Shortlist"
        lead="Sorted by what to do, not by category."
      >
        <nav className="mt-7 flex flex-wrap gap-2">
          {shortlist.map((section) => (
            <a
              key={section.slug}
              href={`#${section.slug}`}
              className="label rounded-full border px-3 py-1.5 text-soft transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
              style={{ borderColor: "var(--border)" }}
            >
              {section.number}. {section.title}
            </a>
          ))}
        </nav>
      </PageHeader>

      <Container>
        {shortlist.map((section) => (
          <SectionBlock key={section.slug} section={section} />
        ))}
      </Container>
    </>
  );
}

function SectionBlock({ section }: { section: ShortlistSection }) {
  // The workbook packs two labelled fields into one column on the build-it
  // section ("What it is || Worth doing?"), so column headers split the same way
  // the cells do.
  const [firstColumn, ...restColumns] = section.columns;
  const labels = restColumns.map((column) => column.split(/\s*\|\|\s*/).map((part) => part.trim()));

  return (
    <Section id={section.slug} className="scroll-mt-24 border-b border-hair last:border-0">
      <div className="mb-6 max-w-2xl">
        <Eyebrow accent>
          {section.number} of {shortlist.length}
        </Eyebrow>
        <h2 className="display mt-3 text-3xl">
          {section.title}
          <span className="text-accent">.</span>
        </h2>
        {section.lead ? <p className="mt-3.5 text-[0.95rem] leading-relaxed text-soft">{section.lead}</p> : null}
      </div>

      <div className="space-y-3">
        {section.rows.map((row) => {
          const [nameCell, ...cells] = row;
          const name = nameCell.join(" ");
          return (
            <article key={name} className="surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-medium">{name}</h3>
                {/* "Item" says nothing; "What to build" does. */}
                {["Item", "Link"].includes(firstColumn) ? null : (
                  <span className="label text-mute">{firstColumn}</span>
                )}
              </div>

              <dl className="mt-4 space-y-4">
                {cells.map((cell, index) => {
                  const columnLabels = labels[index] ?? [];
                  const paragraphs = cell.length ? cell : ["—"];
                  const paired = columnLabels.length === paragraphs.length;

                  return (
                    <div key={index} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-5">
                      <dt className="label pt-0.5 text-mute">
                        {paired ? columnLabels[0] : columnLabels.join(" / ")}
                      </dt>
                      <dd className="space-y-2 text-sm leading-relaxed text-soft">
                        {paragraphs.map((paragraph, pIndex) => (
                          <div key={pIndex}>
                            {paired && pIndex > 0 ? (
                              <p className="label mb-1 text-mute">{columnLabels[pIndex]}</p>
                            ) : null}
                            <p>{paragraph}</p>
                          </div>
                        ))}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
