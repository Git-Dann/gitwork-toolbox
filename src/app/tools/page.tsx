import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader } from "@/components/page-shell";
import { ToolBrowser } from "@/components/tool-browser";
import { Badge } from "@/components/ui";
import { counts, meta, tools } from "@/lib/data";
import type { ToolListItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "All tools",
  description: `Browse ${counts.tools} AI tools by area, category, pricing and whether Gitwork has assessed them.`,
};

// The browser filters in the client, so it gets a trimmed record rather than the
// full row — descriptions are cut to a card's worth of text.
const listItems: ToolListItem[] = tools.map((tool) => ({
  slug: tool.slug,
  name: tool.name,
  what: tool.what.length > 180 ? `${tool.what.slice(0, 179).trimEnd()}…` : tool.what,
  category: tool.category,
  group: tool.group,
  pricing: tool.pricing,
  usefulness: tool.usefulness,
  linkStatus: tool.linkStatus,
  linkLabel: tool.linkLabel,
  domain: tool.domain,
  assessed: tool.assessed,
}));

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        eyebrow={`${counts.tools} tools · ${counts.categories} categories`}
        title="The tools list"
        lead="Two sources in one place: the links Gitwork fetched and assessed individually, and a 684-tool directory we imported wholesale. The filters tell you which is which."
        meta={
          <>
            <Badge tone="green">{counts.free} free</Badge>
            <Badge tone="signal">{counts.freemium} freemium</Badge>
            <Badge>{counts.paid} paid</Badge>
            <Badge tone="solid">{counts.picks} picks</Badge>
          </>
        }
      />
      <Container className="py-8 sm:py-12">
        <Suspense
          fallback={<p className="label py-12 text-center text-mute">Loading the list…</p>}
        >
          <ToolBrowser tools={listItems} groups={meta.groups} categories={meta.categories} />
        </Suspense>
      </Container>
    </>
  );
}
