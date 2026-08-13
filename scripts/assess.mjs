/**
 * Pipe 3 — assessment.
 *
 * Reads every queued candidate's own site: does it resolve, what does it say it is, what
 * does its pricing page actually charge, is there a licence. The evidence lands in
 * data/proposals.json, which renders only inside /admin.
 *
 * What this deliberately does not do is write the listing. A fetched title and a price
 * regex are not an assessment — the entry still needs someone (or an agent running the
 * toolbox-add skill) to say what it is for and what would bite us. Approving a proposal
 * in /admin is that yes.
 *
 *   node scripts/assess.mjs                # assess the whole queue
 *   node scripts/assess.mjs --limit=50
 *   node scripts/assess.mjs --concurrency=10
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readProduct, readRepo, hostOf, keyOf, get, pooled } from "./lib/probe.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;

const queue = readJson("data/queue.json", { entries: [] });
const proposals = readJson("data/proposals.json", {
  $comment:
    "Assessed candidates awaiting a human yes. Rendered only in /admin — nothing here is on the public site. Written by scripts/assess.mjs, approved or rejected in the portal.",
  entries: [],
});

const alreadyProposed = new Set(proposals.entries.map((entry) => keyOf(entry.url)));
const pending = queue.entries.filter((entry) => !alreadyProposed.has(keyOf(entry.url)));
const batch = args.limit ? pending.slice(0, Number(args.limit)) : pending;

if (!batch.length) {
  console.log("nothing to assess — run scripts/discover.mjs first");
  process.exit(0);
}

console.log(`assessing ${batch.length} candidates…`);

/** Toolfolio lists a product behind its own page, so resolve to the real site first. */
async function resolveUrl(candidate) {
  if (!candidate.needsResolve) return candidate.url;
  const page = await get(candidate.url, 20000);
  if (page.status !== 200) return candidate.url;
  const hosts = [...page.text.matchAll(/https?:\\?\/\\?\/[a-zA-Z0-9.-]+\.[a-z]{2,}[^"'\\ ]*/g)]
    .map((match) => match[0].replace(/\\/g, ""))
    .filter((url) => {
      const host = hostOf(url);
      return (
        host &&
        !/toolfolio|vercel|googleapis|gstatic|discord|instagram|linkedin|threads|x\.com|twitter|youtube|schema\.org|w3\.org|sentry|posthog|google|cloudflare|supabase|cdn|amazonaws|ytimg|ggpht/.test(
          host,
        )
      );
    });
  return hosts[0] ?? candidate.url;
}

let done = 0;
const assessed = await pooled(
  batch,
  async (candidate) => {
    const url = await resolveUrl(candidate);
    const evidence = await readProduct(url);

    // GitHub-hosted things get repo health too — stars alone say nothing, but an archived
    // repo or one untouched for two years is a fact worth carrying into the decision.
    let repo = null;
    const repoMatch = /github\.com\/([\w.-]+)\/([\w.-]+)/.exec(url);
    if (repoMatch) repo = await readRepo(repoMatch[1], repoMatch[2].replace(/\.git$/, ""));

    done += 1;
    if (done % 25 === 0) console.log(`  … ${done}/${batch.length}`);

    return {
      url,
      host: hostOf(url),
      name: candidate.name,
      discoveredVia: candidate.source,
      sourceCategory: candidate.sourceCategory ?? null,
      kindHint: candidate.kindHint ?? "tool",
      signal: candidate.signal ?? 0,
      // What the directory claimed, kept separate from what the site actually served —
      // the two disagree often enough that merging them would launder a guess as a fact.
      claim: candidate.claim ?? null,
      claimedTier: candidate.claimedTier ?? null,
      evidence,
      repo,
      status: "pending",
      assessedAt: new Date().toISOString(),
    };
  },
  Number(args.concurrency ?? 8),
);

proposals.entries.push(...assessed);
writeFileSync("data/proposals.json", `${JSON.stringify(proposals, null, 2)}\n`);

const reachable = assessed.filter((entry) => entry.evidence.reachable).length;
const blocked = assessed.filter((entry) => entry.evidence.blocked).length;
const dead = assessed.length - reachable - blocked;
console.log(
  `\n${assessed.length} assessed — ${reachable} reachable, ${blocked} blocked by bot check, ${dead} unreachable`,
);
console.log(`→ data/proposals.json (${proposals.entries.length} pending in total)`);
console.log("Review them at /admin.");
