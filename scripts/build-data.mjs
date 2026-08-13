/**
 * Turns the two raw sources in data/source into the typed JSON the app imports.
 *
 *   data/source/workbook-sheets.json   (from scripts/extract-workbook.py)
 *   data/source/foundry-starters.json  (Foundry Starters export)
 *        ->  src/data/generated/*.json
 *
 * Run with `npm run data`. It also runs as the first half of `npm run build`,
 * so a deploy can never ship stale data.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "data", "generated");

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const sheets = read("data/source/workbook-sheets.json");
const starterExport = read("data/source/foundry-starters.json");

/* ------------------------------------------------------------------ helpers */

const PARA = /\s*\|\|\s*/; // the workbook's in-cell paragraph separator

const clean = (v) =>
  (v ?? "")
    .toString()
    .replace(/ /g, " ")
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

/* --------------------------------------------------------------- categories */

// The workbook mixes two naming conventions: the directory's tidy single-word
// categories and Dan's compound ones ("Design engineering / motion"). Both get
// folded into one browsable set of groups.
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
    ],
  },
  {
    slug: "design-and-creative",
    name: "Design & Creative",
    blurb: "Design tools, image generation and editing, avatars and 3D.",
    categories: [
      "Design",
      "Image",
      "Image Editing",
      "Avatars",
      "3D & Game",
      "AI asset generation",
      "Design inspiration / reference management",
    ],
  },
  {
    slug: "coding-and-dev",
    name: "Coding & Dev",
    blurb: "Coding agents, model infrastructure, no-code and mobile.",
    categories: [
      "Coding",
      "AI coding",
      "AI coding / code review",
      "AI coding / agency ops",
      "AI coding / developer news",
      "Models & Infra",
      "No-code",
      "Infra & graphics",
      "Mobile & app dev",
      "Mobile & app dev / Apple APIs",
    ],
  },
  {
    slug: "writing-and-content",
    name: "Writing & Content",
    blurb: "Drafting, editing, presentations and long-form content.",
    categories: ["Writing", "Presentations"],
  },
  {
    slug: "video-and-audio",
    name: "Video & Audio",
    blurb: "Generation, editing, voice, transcription and streaming.",
    categories: ["Video", "Audio & Voice", "Transcription", "Video & streaming"],
  },
  {
    slug: "marketing-and-sales",
    name: "Marketing & Sales",
    blurb: "Campaigns, social, outreach, email and e-commerce.",
    categories: ["Marketing", "Social Media", "Sales & Outreach", "Email", "E-commerce"],
  },
  {
    slug: "productivity-and-ops",
    name: "Productivity & Ops",
    blurb: "Assistants, agents, automation, meetings and notes.",
    categories: [
      "Productivity",
      "Productivity / daily notes",
      "Automation",
      "Meetings & Notes",
      "Chat & Assistants",
      "Chatbots & Agents",
      "Personal AI assistant",
      "Mac software / remote control",
      "Mac software / launcher utility",
      "Mac software / tool discovery",
      "AI hardware side project",
    ],
  },
  {
    slug: "research-and-data",
    name: "Research & Data",
    blurb: "Search, research, analytics and learning.",
    categories: ["Research", "Search & Research", "Data & Analytics", "Education"],
  },
  {
    slug: "business-and-people",
    name: "Business & People",
    blurb: "Finance, legal, recruiting, support, health and property.",
    categories: [
      "Finance & Legal",
      "HR & Recruiting",
      "Customer Support",
      "Healthcare",
      "Real Estate",
    ],
  },
  {
    slug: "discovery-and-reference",
    name: "Discovery & Reference",
    blurb: "Directories, docs, funding and other people's curation.",
    categories: [
      "Tool discovery",
      "Mac software & hardware curation",
      "Funding & credits",
      "Newsletter lead magnet",
      "Unknown",
    ],
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

  // Keyword fallback so a new category from a re-export still lands somewhere.
  const c = category.toLowerCase();
  const rules = [
    [/design engineering|design system|generative ui|motion|portfolio/, "design-engineering"],
    [/design|image|avatar|3d|asset/, "design-and-creative"],
    [/coding|dev|infra|model|no-?code|mobile/, "coding-and-dev"],
    [/writing|content|presentation/, "writing-and-content"],
    [/video|audio|voice|transcri|stream/, "video-and-audio"],
    [/marketing|social|sales|email|commerce/, "marketing-and-sales"],
    [/productiv|automation|meeting|note|assistant|agent|mac software|hardware/, "productivity-and-ops"],
    [/research|data|analytic|education|search/, "research-and-data"],
    [/finance|legal|hr|recruit|support|health|estate/, "business-and-people"],
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

const toolSlugs = new Set();
const tools = [];

for (const [tab, pricing] of PRICING_TABS) {
  for (const row of table(tab)) {
    const name = row["Tool"];
    if (!name) continue;

    const category = row["Category"] || "Unknown";
    const source = row["Source"] === "Dan's links" ? "gitwork" : "directory";
    const linkRaw = row["Link check"];
    const link = LINK_STATUS[linkRaw] ?? { status: "unknown", label: linkRaw || "Unchecked" };
    const website = row["Website"];

    tools.push({
      slug: uniqueSlug(slugify(name), toolSlugs),
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
      source,
      assessed: source === "gitwork",
    });
  }
}

/* ---------------------------------------------------------------- resources */

// Three rows on the Resources tab are flagged "NOT A TOOL - file elsewhere":
// a private billing page, a private Notion page and a photography business that
// belongs in the CRM. They stay out of the published site.
const EXCLUDED_CATEGORY = "NOT A TOOL - file elsewhere";

const resourceSlugs = new Set();
const resources = table("Resources")
  .filter((row) => row["Item"] && row["Category"] !== EXCLUDED_CATEGORY)
  .map((row) => {
    const category = row["Category"] || "Unknown";
    const link = row["Link"];
    return {
      slug: uniqueSlug(slugify(row["Item"]), resourceSlugs),
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
  return {
    slug: uniqueSlug(item.slug || slugify(item.name), starterSlugs),
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
// private links that are excluded above, so it is dropped here too.
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

/* -------------------------------------------------- editorial: read me etc */

function keyedRows(tabName, { headingCells = 1 } = {}) {
  return sheets[tabName]
    .map((row) => row.map(clean).filter(Boolean))
    .filter((row) => row.length > headingCells);
}

const readme = keyedRows("Read me").map(([term, detail]) => ({ term, detail }));

// The Data quality tab holds a measures table, then a table of the duplicate
// pairs that were collapsed. They are split apart here.
const dataQualityRows = keyedRows("Data quality").filter((row) => row.length === 3);
const dupeHeader = dataQualityRows.findIndex(([first]) => first === "Kept");
const dataQuality = dataQualityRows
  .slice(0, dupeHeader === -1 ? undefined : dupeHeader)
  .filter(([measure]) => measure !== "Measure")
  .map(([measure, count, note]) => ({ measure, count: count.replace(/\.0$/, ""), note }));
const duplicatePairs =
  dupeHeader === -1
    ? []
    : dataQualityRows.slice(dupeHeader + 1).map(([kept, removed, website]) => ({
        kept,
        removed,
        website,
      }));

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
}));

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

const searchIndex = [
  ...tools.map((t) => ({
    kind: "tool",
    slug: t.slug,
    name: t.name,
    blurb: shorten(t.what),
    meta: t.category,
    badge: t.pricing,
    pick: t.assessed && t.usefulness === "High",
  })),
  ...starters.map((s) => ({
    kind: "starter",
    slug: s.slug,
    name: s.name,
    blurb: shorten(s.summary),
    meta: s.typeLabel,
    badge: s.typeLabel,
    pick: s.featured,
  })),
  ...resources.map((r) => ({
    kind: "resource",
    slug: r.slug,
    name: r.name,
    blurb: shorten(r.takeaway),
    meta: r.resourceType,
    badge: "Resource",
    pick: r.usefulness === "High",
  })),
];

/* -------------------------------------------------------------------- write */

const counts = {
  tools: tools.length,
  free: tools.filter((t) => t.pricing === "Free").length,
  freemium: tools.filter((t) => t.pricing === "Freemium").length,
  paid: tools.filter((t) => t.pricing === "Paid").length,
  assessed: tools.filter((t) => t.assessed).length + resources.length,
  picks: tools.filter((t) => t.assessed && t.usefulness === "High").length,
  starters: starters.length,
  prompts: starters.filter((s) => s.type === "PROMPT").length,
  skills: starters.filter((s) => s.type === "SKILL").length,
  kits: starters.filter((s) => s.type === "KIT").length,
  starterCollections: starters.filter((s) => s.type === "COLLECTION").length,
  plugins: starters.filter((s) => s.type === "PLUGIN").length,
  resources: resources.length,
  categories: categories.length,
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
    readme,
    dataQuality,
    duplicatePairs,
    types: TYPE_META,
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
    `${counts.categories} categories · ${shortlist.length} shortlist sections`,
);
