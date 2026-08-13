import { Buffer } from "node:buffer";

/**
 * The approval gate for pipe 3.
 *
 * A proposal is a candidate the discovery scripts found and the assess script read: it
 * resolves, here is what its own site says it is, here is what its pricing page charges.
 * That is evidence, not an assessment — so approving one publishes a listing marked
 * "Not assessed", carrying only the facts we verified, and says so in its notes. A full
 * write-up comes later from the toolbox-add skill. Rejecting it records the domain so
 * discovery stops offering it back.
 */

export type ProposalEvidence = {
  url: string;
  finalUrl?: string;
  status: number | string;
  reachable: boolean;
  blocked?: boolean;
  title: string;
  description: string;
  priceSource: string | null;
  figures: { figure: string; context: string }[];
  mentionsFree: boolean;
  licence: string | null;
  openSource?: boolean;
  body: string;
};

export type Proposal = {
  url: string;
  host: string | null;
  name: string;
  discoveredVia: string;
  sourceCategory: string | null;
  kindHint: string;
  signal: number;
  claim: string | null;
  claimedTier: string | null;
  evidence: ProposalEvidence;
  repo: { stars?: number; licence?: string | null; pushedAt?: string; archived?: boolean } | null;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  assessedAt: string;
  decidedAt?: string;
};

export type ProposalsFile = { $comment?: string; entries: Proposal[] };

export const PROPOSALS_PATH = "data/proposals.json";
export const ADDITIONS_PATH = "data/additions.json";

function repoTarget() {
  const explicit = process.env.GITHUB_REPO;
  const owner = explicit?.split("/")[0] ?? process.env.VERCEL_GIT_REPO_OWNER ?? "";
  const repo = explicit?.split("/")[1] ?? process.env.VERCEL_GIT_REPO_SLUG ?? "";
  const branch = process.env.GITHUB_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "main";
  return { owner, repo, branch };
}

const api = (path: string) => `https://api.github.com${path}`;
const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

async function readFile<T>(path: string): Promise<{ json: T; sha: string } | null> {
  const { owner, repo, branch } = repoTarget();
  if (!owner || !repo) return null;
  const response = await fetch(
    api(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`),
    { headers: headers(), cache: "no-store" },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { content: string; sha: string };
  return {
    json: JSON.parse(Buffer.from(body.content, "base64").toString("utf8")) as T,
    sha: body.sha,
  };
}

async function writeFile(path: string, contents: unknown, sha: string, message: string) {
  const { owner, repo, branch } = repoTarget();
  const response = await fetch(api(`/repos/${owner}/${repo}/contents/${path}`), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message,
      content: Buffer.from(`${JSON.stringify(contents, null, 2)}\n`).toString("base64"),
      sha,
      branch,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub rejected the commit (${response.status}): ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as { commit: { sha: string; html_url: string } };
}

export const fetchProposals = () => readFile<ProposalsFile>(PROPOSALS_PATH);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Pricing from what the vendor's own page served, never from what a directory claimed.
 * With no figures and no free mention there is nothing to stand behind, so it stays
 * Freemium only when the page actually said "free" — otherwise Paid is the safer default
 * for a tool nobody here has opened.
 */
function pricingFrom(evidence: ProposalEvidence): "Free" | "Freemium" | "Paid" {
  const hasFigures = evidence.figures.length > 0;
  if (evidence.openSource && !hasFigures) return "Free";
  if (evidence.mentionsFree && hasFigures) return "Freemium";
  if (evidence.mentionsFree && !hasFigures) return "Free";
  return "Paid";
}

export function entryFromProposal(proposal: Proposal) {
  const { evidence } = proposal;
  const figures = evidence.figures.map((item) => item.figure).slice(0, 6).join(", ");
  return {
    kind: "tool" as const,
    name: proposal.name,
    slug: slugify(proposal.name),
    website: evidence.finalUrl || proposal.url,
    what: evidence.description || evidence.title || proposal.claim || proposal.name,
    category: proposal.sourceCategory
      ? `Discovery / ${proposal.sourceCategory.toLowerCase()}`
      : "Discovery / unsorted",
    pricing: pricingFrom(evidence),
    priceDetail: figures
      ? `Figures read from ${evidence.priceSource}: ${figures}. Not checked against what each tier includes.`
      : `No pricing figures were published on ${evidence.priceSource}.`,
    usefulness: "Not assessed" as const,
    buildVerdict: "N/A" as const,
    linkCheck: "Reviewed in detail" as const,
    notes: [
      "Approved from the discovery queue on link-checked evidence, not a full read. The description is the vendor's own; the pricing is whatever their pricing page served on the day.",
      `Found via ${proposal.discoveredVia}${proposal.claim ? `, which described it as "${proposal.claim}"` : ""}.`,
      "Needs a proper write-up before anyone relies on it for client work — run the toolbox-add skill against it.",
    ],
    addedAt: new Date().toISOString(),
    addedBy: "Discovery queue",
  };
}

export type Decision = { url: string; decision: "approve" | "reject" };

/** Applies decisions to both files. Approvals publish; rejections stop it coming back. */
export async function commitDecisions(decisions: Decision[]) {
  const proposalsFile = await fetchProposals();
  if (!proposalsFile) throw new Error(`Could not read ${PROPOSALS_PATH}.`);

  const byUrl = new Map(proposalsFile.json.entries.map((entry) => [entry.url, entry]));
  const approvedEntries = [];
  let approved = 0;
  let rejected = 0;

  for (const decision of decisions) {
    const proposal = byUrl.get(decision.url);
    if (!proposal || proposal.status !== "pending") continue;
    proposal.status = decision.decision === "approve" ? "approved" : "rejected";
    proposal.decidedAt = new Date().toISOString();
    if (decision.decision === "approve") {
      approvedEntries.push(entryFromProposal(proposal));
      approved += 1;
    } else {
      proposal.reason = "rejected in the portal";
      rejected += 1;
    }
  }

  if (!approved && !rejected) return { approved: 0, rejected: 0, url: null };

  // Additions first: if the second write fails, a published entry with a still-pending
  // proposal is recoverable, where a decided proposal with no entry silently loses it.
  let commitUrl: string | null = null;
  if (approvedEntries.length) {
    const additions = await readFile<{ entries: unknown[] }>(ADDITIONS_PATH);
    if (!additions) throw new Error(`Could not read ${ADDITIONS_PATH}.`);
    additions.json.entries.push(...approvedEntries);
    const result = await writeFile(
      ADDITIONS_PATH,
      additions.json,
      additions.sha,
      `Toolbox: publish ${approvedEntries.length} approved from the discovery queue`,
    );
    commitUrl = result.commit.html_url;
  }

  const result = await writeFile(
    PROPOSALS_PATH,
    proposalsFile.json,
    proposalsFile.sha,
    `Toolbox: ${approved} approved, ${rejected} rejected in the portal`,
  );

  return { approved, rejected, url: commitUrl ?? result.commit.html_url };
}
