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

/**
 * The open feeds — Show HN, Reddit, Product Hunt — are mostly not for us. These score a
 * title and URL so a launch has to look like a tool a design-and-build studio would touch
 * before it earns a place in the reading queue.
 */
const RELEVANT = [
  "design", "figma", "ui ", " ui", "component", "tailwind", "react", "svelte", "vue",
  "next.js", "css", "svg", "icon", "font", "typeface", "typography", "palette", "colour",
  "color", "animation", "motion", "prototyp", "mockup", "screenshot", "diagram", "canvas",
  "agent", "mcp", "claude", "llm", "prompt", "coding", "developer", "devtool", "cli",
  "terminal", "diff", "code review", "self-host", "open source", "open-source", "api",
  "design system", "design tokens", "accessib", "wireframe", "landing page", "dashboard",
];

const IRRELEVANT = [
  "crypto", "web3", "nft", "token price", "trading bot", "casino", "betting", "onlyfans",
  "nsfw", "girlfriend", "dating app", "weight loss", "supplement", "dropship", "affiliate",
  "seo backlink", "instagram follower", "tiktok follower", "resume builder", "cover letter",
  "essay writer", "homework", "e-book", "course launch", "newsletter growth",
];

/** A label for the queue: the title if it reads like a name, otherwise the host. */
function shortName(title, url) {
  const head = title.split(/[—–|:]/)[0].trim();
  if (head && head.length <= 40 && head.split(/\s+/).length <= 5) return head;
  return hostOf(url) ?? head.slice(0, 60);
}

function relevance(text) {
  const t = ` ${text.toLowerCase()} `;
  if (IRRELEVANT.some((word) => t.includes(word))) return -20;
  const hits = RELEVANT.filter((word) => t.includes(word)).length;
  // Two independent signals before it is worth a fetch; one keyword is a coincidence.
  return hits >= 2 ? 3 : hits === 1 ? 1 : -20;
}

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

  /**
   * Recently-pushed, well-starred repos in the topics we actually work in. Unauthenticated
   * on purpose — this is the public search endpoint, read the same way as any other public
   * page, and it rate-limits rather than failing hard.
   */
  async github() {
    const topics = [
      "design-system", "design-tokens", "figma-plugin", "tailwindcss", "react-component",
      "ai-agent", "mcp-server", "coding-agent", "design-engineering", "svg",
    ];
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const out = [];
    for (const topic of topics) {
      const query = `topic:${topic}+stars:>300+pushed:>${since}`;
      const response = await get(
        `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=8`,
        14000,
      );
      if (response.status !== 200) {
        console.log(`  github: ${topic} → ${response.status}, skipped`);
        continue;
      }
      try {
        for (const repo of JSON.parse(response.text).items ?? []) {
          if (repo.archived) continue;
          out.push({
            url: repo.homepage?.startsWith("http") ? repo.homepage : repo.html_url,
            name: repo.name,
            source: "github",
            sourceCategory: `GitHub / ${topic}`,
            claim: repo.description ?? null,
            // Stars order the reading queue; they never decide what gets published.
            signal: 2 + Math.min(2, Math.floor(repo.stargazers_count / 5000)),
          });
        }
      } catch {
        /* a malformed page is skipped rather than crashing the sweep */
      }
    }
    return out;
  },

  /** Show HN — where a lot of genuinely good developer tools land first. */
  async ["show-hn"]() {
    const response = await get(
      "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=100",
      14000,
    );
    if (response.status !== 200) return [];
    const out = [];
    try {
      for (const hit of JSON.parse(response.text).hits ?? []) {
        const url = hit.url;
        if (!url || !hostOf(url)) continue;
        const score = relevance(`${hit.title ?? ""} ${url}`);
        if (score < 1) continue;
        out.push({
          url,
          // A Show HN title is often a sentence ("I built an open source video editor…").
          // The host makes a better label; the sentence is kept as the claim.
          name: shortName((hit.title ?? "").replace(/^Show HN:\s*/i, ""), url),
          source: "show-hn",
          sourceCategory: "Show HN",
          claim: hit.title ?? null,
          signal: score + (hit.points >= 100 ? 1 : 0),
        });
      }
    } catch {
      /* ignore a bad payload */
    }
    return out;
  },

  /**
   * The subreddits where side projects and design tools get posted. Blocked by this
   * session's egress policy, so it is untested from here and returns nothing rather than
   * failing the sweep — it is expected to work in the GitHub Actions run, which has no
   * such policy.
   */
  async reddit() {
    const subs = ["SideProject", "webdev", "FigmaDesign", "InternetIsBeautiful"];
    const out = [];
    for (const sub of subs) {
      const response = await get(
        `https://www.reddit.com/r/${sub}/top.json?t=week&limit=50`,
        14000,
      );
      if (response.status !== 200) {
        console.log(`  reddit: r/${sub} → ${response.status}, skipped`);
        continue;
      }
      try {
        for (const child of JSON.parse(response.text).data?.children ?? []) {
          const post = child.data ?? {};
          const url = post.url_overridden_by_dest ?? post.url;
          if (!url || !hostOf(url) || /reddit\.com|redd\.it|imgur/.test(url)) continue;
          const score = relevance(`${post.title ?? ""} ${post.selftext ?? ""} ${url}`);
          if (score < 1) continue;
          out.push({
            url,
            name: shortName(post.title ?? "", url),
            source: "reddit",
            sourceCategory: `r/${sub}`,
            claim: post.title ?? null,
            signal: score + (post.ups >= 300 ? 1 : 0),
          });
        }
      } catch {
        /* ignore a bad payload */
      }
    }
    return out;
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
