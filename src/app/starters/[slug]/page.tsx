import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarterCard } from "@/components/cards";
import { CopyButton } from "@/components/copy-button";
import { BackLink, Container, Panel, Section } from "@/components/page-shell";
import { Badge, Eyebrow, SectionHeading } from "@/components/ui";
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
      <div className="border-b border-line/10 bg-white/40">
        <Container className="py-8 sm:py-12">
          <BackLink href="/starters">Starter library</BackLink>

          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <Badge tone={starter.type === "PROMPT" ? "neutral" : "signal"}>
              {starter.typeLabel}
            </Badge>
            {starter.featured ? <Badge tone="solid">Featured</Badge> : null}
            <Badge>{starter.promptWords.toLocaleString("en-GB")} words</Badge>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-3xl leading-tight sm:text-4xl">
            {starter.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/80">{starter.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyButton text={starter.promptText} label={promptLabel} />
            <a
              href="#prompt"
              className="hairline rounded-full border bg-white px-4 py-2.5 text-sm transition-colors hover:border-signal/50 hover:text-signal"
            >
              Read it first
            </a>
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-3">What it is</Eyebrow>
              <Markdown
                text={starter.description}
                className="prose-tight max-w-2xl text-[0.95rem] leading-relaxed text-ink/85"
              />
            </div>

            {starter.whatYouGet.length ? (
              <Panel tone="signal" title="What you get">
                <ul className="space-y-2.5">
                  {starter.whatYouGet.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink/85">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <div id="prompt" className="scroll-mt-24">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Eyebrow>The full text</Eyebrow>
                  <p className="mt-1 text-sm text-mute">
                    Paste it whole — it is written to work as a single instruction block.
                  </p>
                </div>
                <CopyButton text={starter.promptText} label="Copy" />
              </div>
              <pre className="card max-h-[34rem] overflow-auto p-5 font-mono text-[0.78rem] leading-relaxed whitespace-pre-wrap break-words text-ink/85">
                {starter.promptText}
              </pre>
            </div>

            {starter.install.length ? (
              <div>
                <Eyebrow className="mb-3">How to use it</Eyebrow>
                <ol className="card divide-y divide-line/8 px-5">
                  {starter.install.map((step, index) => (
                    <li key={step} className="flex gap-4 py-4 text-sm leading-relaxed">
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
                      <Badge className="transition-colors hover:border-signal/40 hover:text-signal">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </Panel>
            ) : null}

            {starter.keywords.length ? (
              <Panel title="Also known as">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
