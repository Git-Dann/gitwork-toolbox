import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminEditor } from "@/components/admin-editor";
import { AdminLogin } from "@/components/admin-login";
import { ProposalQueue, type QueueItem } from "@/components/proposal-queue";
import { Container, PageHeader, Panel } from "@/components/page-shell";
import { COOKIE, authConfigured, githubConfigured, readToken } from "@/lib/admin";
import { resources, starters, tools } from "@/lib/data";
import type { AdminItem } from "@/lib/types";
import proposalsJson from "@/../data/proposals.json";
import type { ProposalsFile } from "@/lib/proposals";

export const metadata: Metadata = { title: "Admin" };

// Reads a cookie, so it is never prerendered.
export const dynamic = "force-dynamic";

const items: AdminItem[] = [
  ...tools.map((tool) => ({
    kind: "tools" as const,
    slug: tool.slug,
    name: tool.name,
    meta: `${tool.pricing} · ${tool.category}`,
    recommended: tool.recommended,
    approved: tool.approved,
    note: tool.adminNote,
  })),
  ...starters.map((starter) => ({
    kind: "starters" as const,
    slug: starter.slug,
    name: starter.name,
    meta: `${starter.typeLabel} · ${starter.tags.filter((tag) => tag !== "prompt-library").slice(0, 2).join(", ")}`,
    recommended: starter.recommended,
    approved: starter.approved,
    note: starter.adminNote,
  })),
  ...resources.map((resource) => ({
    kind: "resources" as const,
    slug: resource.slug,
    name: resource.name,
    meta: `${resource.resourceType} · ${resource.category}`,
    recommended: resource.recommended,
    approved: resource.approved,
    note: resource.adminNote,
  })),
];

/** Pending only — decided proposals stay in the file as the record of what was ruled out. */
const queue: QueueItem[] = ((proposalsJson as ProposalsFile).entries ?? [])
  .filter((entry) => entry.status === "pending")
  .sort((a, b) => b.signal - a.signal || a.name.localeCompare(b.name))
  .map((entry) => ({
    url: entry.url,
    name: entry.name,
    host: entry.host,
    discoveredVia: entry.discoveredVia,
    sourceCategory: entry.sourceCategory,
    claim: entry.claim,
    claimedTier: entry.claimedTier,
    title: entry.evidence.title,
    description: entry.evidence.description,
    figures: entry.evidence.figures.map((figure) => figure.figure),
    priceSource: entry.evidence.priceSource,
    mentionsFree: entry.evidence.mentionsFree,
    licence: entry.evidence.licence ?? entry.repo?.licence ?? null,
    blocked: Boolean(entry.evidence.blocked),
    stars: entry.repo?.stars,
    pushedAt: entry.repo?.pushedAt,
    archived: entry.repo?.archived,
  }));

export default async function AdminPage() {
  const session = readToken((await cookies()).get(COOKIE)?.value);
  const configured = authConfigured();
  const canSave = githubConfigured();

  return (
    <>
      <PageHeader
        eyebrow="Dan & Harry"
        title="Admin"
        lead="Tick what you rate, then publish. The site picks it up on the next deploy."
      />

      <Container className="py-8">
        {!configured ? (
          <div className="mx-auto max-w-lg space-y-3">
            <Panel tone="flag" title="Set a password first">
              <p className="text-sm leading-relaxed text-soft">
                Add <code className="font-mono text-[0.8rem]">ADMIN_PASSWORD</code> in Vercel →
                Settings → Environment Variables and redeploy. That is the whole sign-in.
              </p>
            </Panel>
            <Panel title="And one for saving">
              <p className="text-sm leading-relaxed text-soft">
                <code className="font-mono text-[0.8rem]">GITHUB_TOKEN</code> — a fine-grained token
                with Contents: Read and write on this repository. Without it you can still browse
                and tick, but publishing will fail.
              </p>
            </Panel>
          </div>
        ) : !session ? (
          <AdminLogin />
        ) : (
          <div className="space-y-10">
            <AdminEditor
              items={items}
              canSave={canSave}
              configNote={
                canSave
                  ? undefined
                  : "GITHUB_TOKEN is not set on this deployment, so changes cannot be published yet."
              }
            />

            <div className="border-t border-hair pt-8">
              <p className="label mb-1 text-mute">Discovery queue</p>
              <p className="mb-4 text-sm leading-relaxed text-soft">
                Found by the watchers and link-checked, but not written up. Add publishes it
                marked “Not assessed” with only the facts we verified; Never stops it being
                offered again.
              </p>
              <ProposalQueue items={queue} canSave={canSave} />
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
