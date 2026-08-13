import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminEditor } from "@/components/admin-editor";
import { AdminLogin } from "@/components/admin-login";
import { Container, PageHeader, Panel } from "@/components/page-shell";
import { COOKIE, authConfigured, githubConfigured, readToken } from "@/lib/admin";
import { resources, starters, tools } from "@/lib/data";
import type { AdminItem } from "@/lib/types";

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
          <AdminEditor
            items={items}
            canSave={canSave}
            configNote={
              canSave
                ? undefined
                : "GITHUB_TOKEN is not set on this deployment, so changes cannot be published yet."
            }
          />
        )}
      </Container>
    </>
  );
}
