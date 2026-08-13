import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarterCard } from "@/components/cards";
import { CopyButton } from "@/components/copy-button";
import { BackLink, Container, Panel, Section } from "@/components/page-shell";
import { ApprovedBadge, Badge, Eyebrow, RecommendedBadge, SectionHeading } from "@/components/ui";
import { getStarter, relatedStarters, starters } from "@/lib/data";
import { Markdown } from "@/lib/markdown";

export function generateStaticParams() {
  return starters.map((starter) => ({ slug: starter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const starter = getStarter(slug);
  if (!starter) return { title: "Starter not found" };
  return { title: starter.name, description: starter.summary.slice(0, 180) };
}

export default async function StarterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const starter = getStarter(slug);
  if (!starter) notFound();

  const related = relatedStarters(starter);
  const promptLabel = starter.type === "PROMPT" ? "Copy prompt" : "Copy the instructions";

  return (
    <>
      <div className="border-b border-hair">
        <Container className="py-10">
          <BackLink href="/starters">Starter library</BackLink>

          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <Badge tone={starter.type === "PROMPT" ? "neutral" : "accent"}>
              {starter.typeLabel}
            </Badge>
            {starter.recommended ? <RecommendedBadge /> : null}
            {starter.approved ? <ApprovedBadge /> : null}
            {starter.featured ? <Badge tone="accent">Featured in Foundry</Badge> : null}
            <Badge>{starter.promptWords.toLocaleString("en-GB")} words</Badge>
          </div>

          <h1 className="display mt-5 max-w-4xl text-3xl sm:text-[2.75rem]">
            {starter.name}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-soft">{starter.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyButton text={starter.promptText} label={promptLabel} />
            <a
              href="#prompt"
              className="rounded-full border px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              Read it
            </a>
          </div>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-3">About</Eyebrow>
              <Markdown
                text={starter.description}
                className="prose-tight max-w-2xl text-[0.95rem] leading-relaxed"
              />
            </div>

            {starter.whatYouGet.length ? (
              <Panel tone="accent" title="What you get">
                <ul className="space-y-2.5">
                  {starter.whatYouGet.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-soft">
                      <span className="shrink-0 text-accent">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {starter.adminNote ? (
              <Panel title="Studio note">
                <p className="text-sm leading-relaxed text-soft">{starter.adminNote}</p>
              </Panel>
            ) : null}

            <div id="prompt" className="scroll-mt-24">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Eyebrow>The full text</Eyebrow>
                  <p className="mt-1 text-sm text-mute">Paste it whole.</p>
                </div>
                <CopyButton text={starter.promptText} label="Copy" />
              </div>
              <pre className="surface max-h-[34rem] overflow-auto p-5 font-mono text-[0.78rem] leading-relaxed whitespace-pre-wrap break-words text-soft">
                {starter.promptText}
              </pre>
            </div>

            {starter.install.length ? (
              <div>
                <Eyebrow className="mb-3">How to use</Eyebrow>
                <ol className="surface px-5">
                  {starter.install.map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-4 border-b border-hair py-4 text-sm leading-relaxed text-soft last:border-0"
                    >
                      <span className="label mt-0.5 text-mute">{String(index + 1).padStart(2, "0")}</span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            {starter.techStack.length ? (
              <Panel title="Tech stack">
                <div className="flex flex-wrap gap-1.5">
                  {starter.techStack.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </Panel>
            ) : null}

            {starter.tags.length ? (
              <Panel title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {starter.tags.map((tag) => (
                    <Link key={tag} href={`/starters?tag=${tag}`}>
                      <Badge className="transition-opacity hover:opacity-80">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </Panel>
            ) : null}

            {starter.keywords.length ? (
              <Panel title="Keywords">
                <p className="text-sm leading-relaxed text-mute">{starter.keywords.join(", ")}</p>
              </Panel>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <Section className="pb-0">
            <SectionHeading
              eyebrow="Works alongside"
              title="Related starters"
              action={{ href: "/starters", label: "Full library" }}
            />
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
              {related.map((item) => (
                <StarterCard key={item.slug} starter={item} />
              ))}
            </div>
          </Section>
        ) : null}
      </Container>
    </>
  );
}
