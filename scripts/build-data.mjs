/**
 * Turns the sources in data/ into the typed JSON the app imports.
 *
 *   data/source/workbook-sheets.json   (from scripts/extract-workbook.py)
 *   data/source/foundry-starters.json  (Foundry Starters export)
 *   data/overrides.json                (flags set in the admin portal)
 *        ->  src/data/generated/*.json
 *
 * Run with `npm run data`. It also runs as the first half of `npm run build`,
 * so a deploy can never ship stale data.
 *
 * Only rows Gitwork assessed itself are published. The 684 rows imported from
 * the 700 AI Toolkit directory are dropped here — unread listings with someone
 * else's unverified pricing labels are not worth browsing.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "data", "generated");

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const sheets = read("data/source/workbook-sheets.json");
const starterExport = read("data/source/foundry-starters.json");
const overrides = read("data/overrides.json");

/* ------------------------------------------------------------------ helpers */

const PARA = /\s*\|\|\s*/; // the workbook's in-cell paragraph separator

const clean = (v) =>
  (v ?? "")
    .toString()
    .replace(/ /g, " ")
    .trim();

const paragraphs = (v) =>
  clean(v)
    .split(PARA)
    .map((p) => p.trim())
    .filter(Boolean);

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function uniqueSlug(base, taken) {
  const root = base || "item";
  let slug = root;
  let n = 2;
  while (taken.has(slug)) slug = `${root}-${n++}`;
  taken.add(slug);
  return slug;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Rows of a workbook tab as objects keyed by its header row. */
function table(tabName) {
  const rows = sheets[tabName];
  if (!rows) throw new Error(`missing tab: ${tabName}`);
  const header = rows[0].map(clean);
  return rows.slice(1).map((row) => {
    const record = {};
    header.forEach((key, i) => {
      if (key) record[key] = clean(row[i]);
    });
    return record;
  });
}

/** Admin flags for one item, defaulted. */
function flagsFor(kind, slug) {
  const entry = overrides?.[kind]?.[slug] ?? {};
  return {
    recommended: Boolean(entry.recommended),
    approved: Boolean(entry.approved),
    adminNote: clean(entry.note),
  };
}

/* --------------------------------------------------------------- categories */

// Our own rows use compound categories ("Design engineering / motion"), so they
// fold into a smaller set of areas for browsing.
const GROUPS = [
  {
    slug: "design-engineering",
    name: "Design Engineering",
    blurb: "Design-to-code, motion, component libraries and UI reference.",
    categories: [
      "Design engineering / component libraries",
      "Design engineering / marketing assets",
      "Design engineering / UI reference",
      "Design engineering / motion",
      "Design engineering / motion graphics",
      "Design engineering / design-to-code",
      "Design engineering / curated list",
      "Design systems / AI reference",
      "Design systems / design engineering",
      "Design research / iOS UI patterns",
      "Generative UI / AI interfaces",
      "Motion / AI-generated animation",
      "Portfolio tooling / personal sites",
      "Design inspiration / reference management",
    ],
  },
  {
    slug: "ai-coding",
    name: "AI Coding",
    blurb: "Coding agents, code review, model plumbing and agency practice.",
    categories: [
      "AI coding",
      "AI coding / code review",
      "AI coding / agency ops",
      "AI coding / developer news",
      "Infra & graphics",
    ],
  },
  {
    slug: "mobile-and-apple",
    name: "Mobile & Apple",
    blurb: "App toolchains and platform APIs worth knowing about.",
    categories: ["Mobile & app dev", "Mobile & app dev / Apple APIs"],
  },
  {
    slug: "creative-and-assets",
    name: "Creative & Assets",
    blurb: "Asset generation, imagery and creative output.",
    categories: ["AI asset generation", "Video & streaming"],
  },
  {
    slug: "workflow-and-mac",
    name: "Workflow & Mac",
    blurb: "Daily notes, launchers, remote control and desk hardware.",
    categories: [
      "Productivity / daily notes",
      "Personal AI assistant",
      "Mac software / remote control",
      "Mac software / launcher utility",
      "Mac software / tool discovery",
      "Mac software & hardware curation",
      "AI hardware side project",
    ],
  },
  {
    slug: "discovery-and-reference",
    name: "Discovery & Reference",
    blurb: "Other people's directories, docs, funding and curation.",
    categories: ["Tool discovery", "Funding & credits", "Newsletter lead magnet", "Unknown"],
  },
];

const GROUP_BY_CATEGORY = new Map();
for (const group of GROUPS) {
  for (const category of group.categories) GROUP_BY_CATEGORY.set(category, group.slug);
}

const unmapped = new Set();

function groupFor(category) {
  const exact = GROUP_BY_CATEGORY.get(category);
  if (exact) return exact;

  const c = category.toLowerCase();
  const rules = [
    [/design|motion|generative ui|portfolio|ui reference/, "design-engineering"],
    [/coding|code|infra|model|agent/, "ai-coding"],
    [/mobile|ios|android|apple/, "mobile-and-apple"],
    [/asset|image|video|audio|stream/, "creative-and-assets"],
    [/productiv|note|mac software|hardware|assistant|launcher/, "workflow-and-mac"],
    [/director|discovery|curation|funding|reference|docs|unknown/, "discovery-and-reference"],
  ];
  for (const [pattern, slug] of rules) if (pattern.test(c)) return slug;

  unmapped.add(category);
  return "discovery-and-reference";
}

/* -------------------------------------------------------------------- tools */

const LINK_STATUS = {
  OK: { status: "ok", label: "Live" },
  "Reviewed in detail": { status: "reviewed", label: "Reviewed in detail" },
  "Blocked bot check (likely OK)": { status: "warn", label: "Bot-blocked (likely live)" },
  "Not resolving": { status: "dead", label: "Not resolving" },
  "Dead (404)": { status: "dead", label: "Dead (404)" },
  "Dead (410)": { status: "dead", label: "Dead (410)" },
  "Payment required (402)": { status: "warn", label: "Paywalled (402)" },
  "Check (500)": { status: "warn", label: "Server error (500)" },
};

const PRICING_TABS = [
  ["Free tools", "Free"],
  ["Freemium tools", "Freemium"],
  ["Paid tools", "Paid"],
];

// Rows imported from the directory are dropped; only our own assessments ship.
const KEEP_SOURCE = "Dan's links";

const toolSlugs = new Set();
const tools = [];

for (const [tab, pricing] of PRICING_TABS) {
  for (const row of table(tab)) {
    const name = row["Tool"];
    if (!name || row["Source"] !== KEEP_SOURCE) continue;

    const category = row["Category"] || "Unknown";
    const linkRaw = row["Link check"];
    const link = LINK_STATUS[linkRaw] ?? { status: "unknown", label: linkRaw || "Unchecked" };
    const website = row["Website"];
    const slug = uniqueSlug(slugify(name), toolSlugs);

    tools.push({
      slug,
      name,
      pricing,
      category,
      group: groupFor(category),
      what: row["What it does"],
      priceDetail: row["Price detail"],
      linkStatus: link.status,
      linkLabel: link.label,
      usefulness: row["Useful to Gitwork"] || "Not assessed",
      buildVerdict: row["Build ourselves?"] || "Not assessed",
      notes: paragraphs(row["Notes / watch out for"]),
      website,
      domain: domainOf(website),
      ...flagsFor("tools", slug),
    });
  }
}

/* ---------------------------------------------------------------- resources */

// Three rows are flagged "NOT A TOOL - file elsewhere": a private billing page, a
// private Notion page and a photography business that belongs in the CRM. They
// stay out of the published site.
const EXCLUDED_CATEGORY = "NOT A TOOL - file elsewhere";

const resourceSlugs = new Set();
const resources = table("Resources")
  .filter((row) => row["Item"] && row["Category"] !== EXCLUDED_CATEGORY)
  .map((row) => {
    const category = row["Category"] || "Unknown";
    const link = row["Link"];
    const slug = uniqueSlug(slugify(row["Item"]), resourceSlugs);
    return {
      slug,
      name: row["Item"],
      resourceType: row["Resource type"] || "Reference",
      category,
      group: groupFor(category),
      takeaway: row["What it is / the takeaway"],
      usefulness: row["Useful to Gitwork"] || "Not assessed",
      whatToDo: row["What to do with it"],
      notes: paragraphs(row["Notes / watch out for"]),
      cost: row["Cost"] || "—",
      link,
      domain: domainOf(link),
      ...flagsFor("resources", slug),
    };
  });

/* ----------------------------------------------------------------- starters */

const TYPE_META = {
  PROMPT: { slug: "prompts", singular: "Prompt", plural: "Prompts" },
  SKILL: { slug: "skills", singular: "Skill", plural: "Skills" },
  KIT: { slug: "kits", singular: "Kit", plural: "Kits" },
  COLLECTION: { slug: "collections", singular: "Collection", plural: "Collections" },
  PLUGIN: { slug: "plugins", singular: "Plugin", plural: "Plugins" },
};

const starterSlugs = new Set();
const starters = starterExport.map((item) => {
  const content = item.content ?? {};
  const promptText = clean(content.promptText);
  const slug = uniqueSlug(item.slug || slugify(item.name), starterSlugs);
  return {
    slug,
    name: item.name,
    summary: item.summary ?? "",
    description: item.description ?? "",
    type: item.type,
    typeLabel: TYPE_META[item.type]?.singular ?? item.type,
    tags: item.tags ?? [],
    featured: Boolean(item.featured),
    whatYouGet: content.whatYouGet ?? [],
    install: content.install ?? [],
    techStack: content.techStack ?? [],
    keywords: content.keywords ?? [],
    promptText,
    promptWords: promptText ? promptText.split(/\s+/).length : 0,
    ...flagsFor("starters", slug),
  };
});

const tagCounts = new Map();
for (const starter of starters) {
  for (const tag of starter.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
}
const tags = [...tagCounts.entries()]
  .map(([tag, count]) => ({
    tag,
    count,
    label: tag.replace(/-and-/g, " & ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }))
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

/* ---------------------------------------------------- editorial: shortlist */

// The "Shortlist & actions" tab is the decision view: numbered sections, each
// with a lead line, a header row and rows of the same width. Section 6 lists the
// private links excluded above, so it is dropped here too.
function parseShortlist() {
  const rows = sheets["Shortlist & actions"].map((row) => row.map(clean).slice(1));
  const sections = [];
  let current = null;

  for (const row of rows) {
    const [first, ...rest] = row;
    const filled = row.filter(Boolean);
    if (!filled.length) continue;

    const heading = first.match(/^(\d+)\.\s*(.+)$/);
    if (heading && filled.length === 1) {
      current = {
        number: Number(heading[1]),
        title: heading[2],
        slug: slugify(heading[2]),
        lead: "",
        columns: [],
        rows: [],
      };
      sections.push(current);
      continue;
    }
    if (!current) continue;

    if (filled.length === 1) {
      if (!current.lead) current.lead = first;
      continue;
    }
    if (!current.columns.length) {
      current.columns = [first, ...rest].filter(Boolean);
      continue;
    }
    current.rows.push([first, ...rest].map((cell) => paragraphs(cell)));
  }

  return sections.filter((section) => section.number <= 5);
}

const shortlist = parseShortlist();

/* -------------------------------------------------------------- collections */

const groupCounts = new Map();
for (const tool of tools) groupCounts.set(tool.group, (groupCounts.get(tool.group) ?? 0) + 1);
for (const resource of resources) {
  groupCounts.set(resource.group, (groupCounts.get(resource.group) ?? 0) + 1);
}

const groups = GROUPS.map(({ slug, name, blurb }) => ({
  slug,
  name,
  blurb,
  count: groupCounts.get(slug) ?? 0,
})).filter((group) => group.count > 0);

const categoryCounts = new Map();
for (const tool of tools) {
  categoryCounts.set(tool.category, (categoryCounts.get(tool.category) ?? 0) + 1);
}
const categories = [...categoryCounts.entries()]
  .map(([name, count]) => ({ name, count, group: groupFor(name) }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

/* ------------------------------------------------------------ search index */

const shorten = (value, max = 130) => {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const isPick = (item) => item.recommended || item.usefulness === "High";

const searchIndex = [
  ...tools.map((t) => ({
    kind: "tool",
    slug: t.slug,
    name: t.name,
    blurb: shorten(t.what),
    meta: t.category,
    badge: t.pricing,
    pick: isPick(t),
  })),
  ...starters.map((s) => ({
    kind: "starter",
    slug: s.slug,
    name: s.name,
    blurb: shorten(s.summary),
    meta: s.typeLabel,
    badge: s.typeLabel,
    pick: s.recommended || s.featured,
  })),
  ...resources.map((r) => ({
    kind: "resource",
    slug: r.slug,
    name: r.name,
    blurb: shorten(r.takeaway),
    meta: r.resourceType,
    badge: "Resource",
    pick: isPick(r),
  })),
];

/* -------------------------------------------------------------------- write */

const counts = {
  tools: tools.length,
  free: tools.filter((t) => t.pricing === "Free").length,
  freemium: tools.filter((t) => t.pricing === "Freemium").length,
  paid: tools.filter((t) => t.pricing === "Paid").length,
  picks: tools.filter(isPick).length + resources.filter(isPick).length,
  recommended:
    tools.filter((t) => t.recommended).length +
    resources.filter((r) => r.recommended).length +
    starters.filter((s) => s.recommended).length,
  approved:
    tools.filter((t) => t.approved).length +
    resources.filter((r) => r.approved).length +
    starters.filter((s) => s.approved).length,
  starters: starters.length,
  prompts: starters.filter((s) => s.type === "PROMPT").length,
  skills: starters.filter((s) => s.type === "SKILL").length,
  kits: starters.filter((s) => s.type === "KIT").length,
  starterCollections: starters.filter((s) => s.type === "COLLECTION").length,
  plugins: starters.filter((s) => s.type === "PLUGIN").length,
  resources: resources.length,
  categories: categories.length,
  entries: tools.length + resources.length + starters.length,
};

mkdirSync(OUT_DIR, { recursive: true });

const files = {
  "tools.json": tools,
  "resources.json": resources,
  "starters.json": starters,
  "search-index.json": searchIndex,
  "meta.json": {
    counts,
    groups,
    categories,
    tags,
    types: TYPE_META,
    overrides: { updatedAt: overrides.updatedAt ?? null, updatedBy: overrides.updatedBy ?? null },
  },
  "shortlist.json": shortlist,
};

for (const [name, payload] of Object.entries(files)) {
  writeFileSync(join(OUT_DIR, name), `${JSON.stringify(payload)}\n`);
}

// The command palette fetches its index on first open rather than shipping it
// in every page's payload, so it also lands in public/.
mkdirSync(join(ROOT, "public"), { recursive: true });
writeFileSync(join(ROOT, "public", "search-index.json"), `${JSON.stringify(searchIndex)}\n`);

if (unmapped.size) {
  console.warn(`⚠ categories with no explicit group: ${[...unmapped].join(", ")}`);
}
console.log(
  `data: ${counts.tools} tools · ${counts.resources} resources · ${counts.starters} starters · ` +
    `${counts.recommended} recommended · ${counts.approved} approved`,
);
