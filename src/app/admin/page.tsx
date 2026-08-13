import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminEditor } from "@/components/admin-editor";
import { AdminLogin } from "@/components/admin-login";
import { Container, PageHeader, Panel } from "@/components/page-shell";
import { ArrowList } from "@/components/ui";
import { COOKIE, adminNames, authConfigured, githubConfigured, readToken } from "@/lib/admin";
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
        eyebrow="Dan & Harry only"
        title="Admin portal"
        lead="Mark anything Recommended or Gitwork approved, and add a studio note. Changes are committed to the repository, so every call is versioned and attributed."
      />

      <Container className="py-10">
        {!configured ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <Panel tone="flag" title="Not configured yet">
              <p className="text-sm leading-relaxed text-soft">
                The portal needs two environment variables in Vercel before it will let anyone in.
                Add them under Project → Settings → Environment Variables, then redeploy.
              </p>
            </Panel>
            <Panel title="What to set">
              <ArrowList
                items={[
                  "ADMIN_PASSWORD — the shared password you and Harry will use. Anything long and random.",
                  "GITHUB_TOKEN — a fine-grained personal access token with Contents: Read and write on this repository only. This is what lets the portal commit your flags.",
                  "ADMIN_USERS — optional, defaults to \"Dan,Harry\". Comma-separated names for the sign-in picker, used to attribute each commit.",
                  "ADMIN_SECRET — optional. A separate random string for signing the session cookie; falls back to ADMIN_PASSWORD.",
                ]}
              />
            </Panel>
          </div>
        ) : !session ? (
          <AdminLogin names={adminNames()} />
        ) : (
          <AdminEditor
            items={items}
            session={session.name}
            canSave={canSave}
            configNote={
              canSave
                ? undefined
                : "GITHUB_TOKEN is not set on this deployment, so changes cannot be published yet. Add a fine-grained token with Contents: Read and write, then redeploy."
            }
          />
        )}
      </Container>
    </>
  );
}
