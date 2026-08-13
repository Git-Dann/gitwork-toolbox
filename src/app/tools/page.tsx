import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/page-shell";
import { ToolBrowser } from "@/components/tool-browser";
import { Badge } from "@/components/ui";
import { counts, meta, resources, tools } from "@/lib/data";
import type { ToolListItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "All tools",
  description: `The ${counts.tools} tools Gitwork fetched, read and assessed, with the verdict on each.`,
};

// The browser filters in the client, so it gets a trimmed record rather than the
// full row.
const listItems: ToolListItem[] = tools.map((tool) => ({
  slug: tool.slug,
  name: tool.name,
  what: tool.what.length > 200 ? `${tool.what.slice(0, 199).trimEnd()}…` : tool.what,
  category: tool.category,
  group: tool.group,
  pricing: tool.pricing,
  usefulness: tool.usefulness,
  linkStatus: tool.linkStatus,
  linkLabel: tool.linkLabel,
  domain: tool.domain,
  recommended: tool.recommended,
  approved: tool.approved,
  addedAt: tool.addedAt,
}));

const resourceItems = resources.map((resource) => ({
  slug: resource.slug,
  name: resource.name,
  resourceType: resource.resourceType,
  group: resource.group,
  recommended: resource.recommended,
  approved: resource.approved,
}));

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        eyebrow={`${counts.tools} tools · ${meta.groups.length} areas`}
        title="The tools list"
        lead="Every link we fetched and read individually, with a real verdict: what it does, what it costs, whether to use it or build it, and what to watch out for."
        meta={
          <>
            <Badge tone="green">{counts.free} free</Badge>
            <Badge tone="accent">{counts.freemium} freemium</Badge>
            <Badge>{counts.paid} paid</Badge>
            {counts.recommended ? <Badge tone="solid">{counts.recommended} recommended</Badge> : null}
          </>
        }
      />
      <Container className="py-10">
        <Suspense fallback={<p className="label py-12 text-center text-mute">Loading the list…</p>}>
          <ToolBrowser tools={listItems} resources={resourceItems} groups={meta.groups} />
        </Suspense>
      </Container>
    </>
  );
}
