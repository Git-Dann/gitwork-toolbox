import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin auth and persistence.
 *
 * Two people need to flag things, and the site is statically generated with no
 * database — so flags are stored in data/overrides.json and committed to the
 * repository through the GitHub API. Every change is therefore versioned,
 * attributable, and picked up by the deploy that the commit triggers.
 */

export const COOKIE = "gw_admin";
const SESSION_DAYS = 7;

export type Session = { exp: number };

const secret = () => process.env.ADMIN_PASSWORD ?? "";

export function authConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function githubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN);
}

/** Constant-time password comparison. */
export function passwordMatches(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

export function createToken() {
  const session: Session = { exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): Session | null {
  if (!token || !secret()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export const sessionMaxAge = SESSION_DAYS * 24 * 60 * 60;

/* ----------------------------------------------------------------- storage */

export type OverrideEntry = { recommended?: boolean; approved?: boolean; note?: string };
export type Overrides = {
  updatedAt: string | null;
  updatedBy: string | null;
  tools: Record<string, OverrideEntry>;
  resources: Record<string, OverrideEntry>;
  starters: Record<string, OverrideEntry>;
};

export const OVERRIDES_PATH = "data/overrides.json";

function repoTarget() {
  const explicit = process.env.GITHUB_REPO;
  const owner = explicit?.split("/")[0] ?? process.env.VERCEL_GIT_REPO_OWNER ?? "";
  const repo = explicit?.split("/")[1] ?? process.env.VERCEL_GIT_REPO_SLUG ?? "";
  const branch =
    process.env.GITHUB_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "main";
  return { owner, repo, branch };
}

const api = (path: string) => `https://api.github.com${path}`;

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

/** The overrides file as currently committed, with its blob sha for the update. */
export async function fetchOverrides(): Promise<{ overrides: Overrides; sha: string } | null> {
  const { owner, repo, branch } = repoTarget();
  if (!owner || !repo) return null;

  const response = await fetch(
    api(`/repos/${owner}/${repo}/contents/${OVERRIDES_PATH}?ref=${encodeURIComponent(branch)}`),
    { headers: headers(), cache: "no-store" },
  );
  if (!response.ok) return null;

  const body = (await response.json()) as { content: string; sha: string };
  const decoded = Buffer.from(body.content, "base64").toString("utf8");
  return { overrides: JSON.parse(decoded) as Overrides, sha: body.sha };
}

export type Change = {
  kind: "tools" | "resources" | "starters";
  slug: string;
  recommended: boolean;
  approved: boolean;
  note: string;
};

/** Applies changes and commits the file, which triggers a redeploy. */
export async function commitOverrides(changes: Change[]) {
  const { owner, repo, branch } = repoTarget();
  if (!owner || !repo) throw new Error("No repository configured for the admin portal.");

  const current = await fetchOverrides();
  if (!current) throw new Error(`Could not read ${OVERRIDES_PATH} from ${owner}/${repo}.`);

  const next: Overrides = {
    ...current.overrides,
    tools: { ...current.overrides.tools },
    resources: { ...current.overrides.resources },
    starters: { ...current.overrides.starters },
    updatedAt: new Date().toISOString(),
    updatedBy: "the toolbox admin",
  };

  for (const change of changes) {
    const entry: OverrideEntry = {};
    if (change.recommended) entry.recommended = true;
    if (change.approved) entry.approved = true;
    if (change.note.trim()) entry.note = change.note.trim();

    // An item with nothing set is removed rather than stored as an empty object.
    if (Object.keys(entry).length === 0) delete next[change.kind][change.slug];
    else next[change.kind][change.slug] = entry;
  }

  const flagged =
    Object.keys(next.tools).length +
    Object.keys(next.resources).length +
    Object.keys(next.starters).length;

  const response = await fetch(api(`/repos/${owner}/${repo}/contents/${OVERRIDES_PATH}`), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: `Toolbox: update flags (${changes.length} changed, ${flagged} flagged)`,
      content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString("base64"),
      sha: current.sha,
      branch,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub rejected the commit (${response.status}): ${detail.slice(0, 300)}`);
  }

  const body = (await response.json()) as { commit: { sha: string; html_url: string } };
  return { sha: body.commit.sha.slice(0, 7), url: body.commit.html_url, flagged };
}
