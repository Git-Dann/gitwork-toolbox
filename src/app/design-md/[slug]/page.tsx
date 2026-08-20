import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FetchCopyButton } from "@/components/fetch-copy-button";
import { Container, PageHeader, Panel, Section } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import {
  designApps,
  designCategoryLabel,
  designFlavour,
  designSpecPath,
  getDesignApp,
} from "@/lib/data";
import { Markdown } from "@/lib/markdown";

export function generateStaticParams() {
  return designApps.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const app = getDesignApp((await params).slug);
  if (!app) return { title: "Not found" };
  return {
    title: `${app.name} — DESIGN.md`,
    description: app.summary.replace(/`/g, "").slice(0, 200),
  };
}

/**
 * The spec is read off disk here rather than imported through the data layer. That keeps
 * 15.9MB of markdown out of every other page's bundle — this page carries only its own.
 */
export default async function DesignAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const app = getDesignApp((await params).slug);
  if (!app) notFound();

  const neutralPath = designSpecPath(app, "neutral");
  // The spec opens with its own H1 ("Design System Inspiration of Bumble (iOS)"), which
  // would sit directly under the page title saying the same thing. Dropped.
  const spec = readFileSync(join(process.cwd(), "public", neutralPath), "utf8").replace(
    /^#\s+.*\n+/,
    "",
  );
  const others = app.flavours.filter((flavour) => flavour.k !== "neutral");

  return (
    <>
      <PageHeader
        eyebrow={designCategoryLabel(app.category)}
        title={app.name}
        lead={app.summary.replace(/`/g, "")}
        meta={
          <>
            {app.accent ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-4 rounded border"
                  style={{ background: app.accent, borderColor: "var(--border)" }}
                />
                <span className="font-mono text-[11px] text-mute">{app.accent}</span>
              </span>
            ) : null}
            <Badge tone="accent">{app.flavours.length} flavours</Badge>
            <Badge>{Math.round(app.bytes / 1024)}KB</Badge>
          </>
        }
      />

      <Container className="py-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FetchCopyButton
                href={neutralPath}
                label="Copy framework-neutral spec"
                hint={`${Math.round((app.flavours.find((f) => f.k === "neutral")?.b ?? 0) / 1024)}KB`}
              />
              <a
                href={neutralPath}
                target="_blank"
                rel="noopener noreferrer"
                className="label rounded-full border px-3.5 py-2 text-soft transition-colors hover:text-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
              >
                Raw ↗
              </a>
            </div>

            <Section className="pt-6">
              <Markdown text={spec} className="prose-tight max-w-3xl text-[0.92rem] leading-relaxed" />
            </Section>
          </div>

          <aside className="min-w-0 space-y-3">
            <Panel title="Other flavours">
              <div className="space-y-3">
                {others.map((flavour) => {
                  const meta = designFlavour(flavour.k);
                  return (
                    <div key={flavour.k}>
                      <p className="text-sm font-medium">{meta?.label ?? flavour.k}</p>
                      <p className="label mb-2 mt-0.5 text-mute">{meta?.for}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <FetchCopyButton
                          href={designSpecPath(app, flavour.k)}
                          label="Copy"
                          hint={`${Math.round(flavour.b / 1024)}KB`}
                        />
                        <a
                          href={designSpecPath(app, flavour.k)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="label rounded-full border px-3 py-2 text-soft transition-colors hover:text-[var(--accent)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          Raw ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="How to use it">
              <p className="text-sm leading-relaxed text-soft">
                Drop the file next to your <code className="font-mono text-[0.8rem]">CLAUDE.md</code>,
                then tell the agent which screen to build and that the spec governs the styling.
                It reads the palette, type ramp, spacing grid, motion curves and haptics from it.
              </p>
            </Panel>

            <Panel title="Where this came from">
              <p className="text-sm leading-relaxed text-soft">
                <a
                  href={`https://github.com/Meliwat/awesome-ios-design-md/tree/main/design-md/${app.category}/${app.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  awesome-ios-design-md
                </a>{" "}
                by Muhammed Eliwat, MIT-licensed and vendored here so the specs do not vanish if
                the repo does. Live screen previews at{" "}
                <a
                  href={`https://www.spectr.to/gallery/${app.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  spectr.to
                </a>
                . {app.name} and its brand assets belong to its owners — structure and behaviour
                are what to take.
              </p>
            </Panel>

            <Link
              href={`/design-md?category=${app.category}`}
              className="label block px-1 text-accent hover:underline"
            >
              More {designCategoryLabel(app.category).toLowerCase()} apps →
            </Link>
          </aside>
        </div>
      </Container>
    </>
  );
}
