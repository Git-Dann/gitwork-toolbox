/**
 * Pipe 2 — discovery.
 *
 * Sweeps the places that already rank tools, drops anything we have listed, proposed or
 * previously rejected, and writes what is left to data/queue.json ordered by signal.
 *
 * Ranking decides what gets read first. It never decides what gets published — most
 * directories sell placement, so "featured" often means "paid to be here", and star
 * counts measure attention rather than whether a thing survives client work.
 *
 *   node scripts/discover.mjs                 # every source
 *   node scripts/discover.mjs --source=workbook
 *   node scripts/discover.mjs --limit=200
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { get, hostOf, keyOf } from "./lib/probe.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;

/* ------------------------------------------------------------------ what we know */

const tools = readJson("src/data/generated/tools.json", []);
const resources = readJson("src/data/generated/resources.json", []);
const additions = readJson("data/additions.json", { entries: [] });
const proposals = readJson("data/proposals.json", { entries: [] });
const seen = readJson("data/seen.json", { rejected: [], hosts: [] });

const known = new Set();
const remember = (url) => {
  const key = keyOf(url);
  if (key) known.add(key);
};
for (const tool of tools) remember(tool.website);
for (const resource of resources) remember(resource.link);
for (const entry of additions.entries) remember(entry.website ?? entry.link ?? "");
for (const entry of proposals.entries) remember(entry.url);
for (const key of seen.hosts ?? []) known.add(key);
for (const item of seen.rejected ?? []) remember(item.url ?? item);

/* --------------------------------------------------------------------- relevance */

/**
 * The workbook's directory categories are a general-purpose AI taxonomy. Most of it is
 * for somebody else's business — a studio that designs and builds client software has no
 * use for recruiting funnels or outbound sales sequencers.
 */
const CATEGORY_WEIGHT = {
  Design: 5,
  Coding: 5,
  "Models & Infra": 4,
  "Chatbots & Agents": 4,
  Image: 3,
  "Image Editing": 3,
  "No-code": 3,
  Video: 2,
  Productivity: 2,
  Research: 2,
  "Data & Analytics": 2,
  "Meetings & Notes": 2,
  "Audio & Voice": 1,
  Writing: 1,
  Marketing: 0,
  "Social Media": 0,
  "Sales & Outreach": -3,
  "HR & Recruiting": -3,
  "Finance & Legal": -3,
  "Customer Support": -2,
  Education: -2,
  "E-commerce": -2,
};

const LINK_PENALTY = {
  OK: 0,
  "Blocked bot check (likely OK)": -1,
  "Payment required (402)": -4,
  "Check (500)": -4,
  "Not resolving": -20,
  "Dead (404)": -20,
  "Dead (410)": -20,
};

/* ----------------------------------------------------------------------- sources */

const sources = {
  /** The 700 AI Toolkit rows that shipped in the workbook, none of them ever assessed. */
  workbook() {
    const workbook = readJson("data/source/workbook-sheets.json", null);
    if (!workbook) return [];
    const sheets = Array.isArray(workbook)
      ? workbook
      : Object.entries(workbook).map(([name, rows]) => ({ name, rows }));
    const out = [];
    for (const sheetName of ["Free tools", "Freemium tools", "Paid tools"]) {
      const sheet = sheets.find((item) => (item.name ?? item.sheet) === sheetName);
      const rows = sheet?.rows ?? sheet?.data ?? [];
      if (!rows.length) continue;
      const index = Object.fromEntries(rows[0].map((header, i) => [header, i]));
      for (const row of rows.slice(1)) {
        if (!row.some((cell) => String(cell).trim())) continue;
        const cell = (key) => String(row[index[key]] ?? "").trim();
        if (cell("Source") !== "700 AI Toolkit") continue;
        const website = cell("Website");
        if (!hostOf(website)) continue;
        out.push({
          url: website,
          name: cell("Tool"),
          source: "workbook",
          sourceCategory: cell("Category"),
          claimedTier: sheetName.replace(" tools", ""),
          claim: cell("What it does"),
          linkCheck: cell("Link check"),
          signal:
            (CATEGORY_WEIGHT[cell("Category")] ?? 0) + (LINK_PENALTY[cell("Link check")] ?? 0),
        });
      }
    }
    return out;
  },

  /** Install counts from the skills CLI — the closest thing to a usage signal for prompts. */
  async ["skills-sh"]() {
    const response = await get("https://www.skills.sh/");
    if (response.status !== 200) return [];
    const out = [];
    for (const match of response.text.matchAll(/href="\/([\w.-]+)\/([\w.-]+)"/g)) {
      const [, owner, repo] = match;
      if (owner === "docs" || owner === "packs" || owner === "topics") continue;
      out.push({
        url: `https://github.com/${owner}/${repo}`,
        name: `${owner}/${repo}`,
        source: "skills-sh",
        sourceCategory: "Agent skills",
        kindHint: "starter",
        signal: 4,
      });
    }
    return out;
  },

  /** Toolfolio's newest listings, minus its paid placements. */
  async toolfolio() {
    const response = await get("https://toolfolio.com/newest-additions", 25000);
    if (response.status !== 200) return [];
    const slugs = [...new Set([...response.text.matchAll(/\/tools\/([a-z0-9-]+)/g)].map((m) => m[1]))]
      // -large-/-small- pairs are boosted listings, not separate products
      .filter((slug) => !/-(large|small)-?[a-z0-9]*$/.test(slug));
    return slugs.map((slug) => ({
      url: `https://toolfolio.com/tools/${slug}`,
      name: slug.replace(/-/g, " "),
      source: "toolfolio",
      sourceCategory: "Directory listing",
      needsResolve: true,
      signal: 1,
    }));
  },

  /** A directory built by one design engineer, so the hit rate is high. */
  async designengineer() {
    const response = await get("https://designengineer.tools/");
    if (response.status !== 200) return [];
    const out = new Map();
    for (const match of response.text.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const host = hostOf(match[1]);
      if (!host || /designengineer\.tools|twitter|x\.com|linkedin|instagram/.test(host)) continue;
      if (!out.has(host)) {
        out.set(host, {
          url: match[1],
          name: host,
          source: "designengineer",
          sourceCategory: "Design engineering",
          signal: 3,
        });
      }
    }
    return [...out.values()];
  },
};

/* -------------------------------------------------------------------------- run */

const wanted = args.source ? [args.source] : Object.keys(sources);
const collected = [];
for (const name of wanted) {
  const source = sources[name];
  if (!source) {
    console.error(`unknown source: ${name} (have ${Object.keys(sources).join(", ")})`);
    process.exit(1);
  }
  const found = await source();
  console.log(`${name}: ${found.length} candidates`);
  collected.push(...found);
}

const queue = [];
const dropped = { alreadyKnown: 0, duplicate: 0, dead: 0 };
const inQueue = new Set();
for (const candidate of collected) {
  const key = keyOf(candidate.url);
  if (!key) continue;
  if (known.has(key)) {
    dropped.alreadyKnown += 1;
    continue;
  }
  if (inQueue.has(key)) {
    dropped.duplicate += 1;
    continue;
  }
  if (candidate.signal <= -10) {
    dropped.dead += 1;
    continue;
  }
  inQueue.add(key);
  queue.push(candidate);
}

queue.sort((a, b) => b.signal - a.signal || a.name.localeCompare(b.name));
const limited = args.limit ? queue.slice(0, Number(args.limit)) : queue;

writeFileSync(
  "data/queue.json",
  `${JSON.stringify(
    {
      $comment:
        "Written by scripts/discover.mjs. Candidates only — nothing here has been read. scripts/assess.mjs turns these into proposals.",
      generatedAt: new Date().toISOString(),
      counts: { collected: collected.length, queued: limited.length, dropped },
      entries: limited,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\nqueued ${limited.length} (dropped ${dropped.alreadyKnown} already listed, ${dropped.duplicate} duplicate hosts, ${dropped.dead} dead links)`,
);
console.log("→ data/queue.json");
