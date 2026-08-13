/**
 * Pipe 1 — Foundry starters.
 *
 * The only part of this pipeline that publishes without a human in the loop, and it is
 * safe for one reason: these are our own starters. They were written here, they are
 * already used in client work, and nobody needs to assess whether a prompt we wrote is
 * worth listing. Everything arriving from outside goes through discover → assess →
 * approve instead.
 *
 * Reads the Foundry export, diffs it against what the site already carries, and appends
 * genuinely new starters to data/additions.json.
 *
 *   node scripts/foundry-sync.mjs             # apply
 *   node scripts/foundry-sync.mjs --dry-run   # report only
 *
 * Refreshing the export itself needs a Foundry session (the MCP server), so the agent
 * step writes data/source/foundry-starters.json and this takes it from there.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const EXPORT_PATH = "data/source/foundry-starters.json";
if (!existsSync(EXPORT_PATH)) {
  console.error(`no export at ${EXPORT_PATH} — refresh it from Foundry first`);
  process.exit(1);
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const exported = JSON.parse(readFileSync(EXPORT_PATH, "utf8"));
const starters = Array.isArray(exported) ? exported : (exported.starters ?? exported.entries ?? []);

const existing = JSON.parse(readFileSync("src/data/generated/starters.json", "utf8"));
const additions = JSON.parse(readFileSync("data/additions.json", "utf8"));

const known = new Set([
  ...existing.map((starter) => starter.slug),
  ...additions.entries
    .filter((entry) => entry.kind === "starter")
    .map((entry) => entry.slug ?? slugify(entry.name)),
]);

const TYPES = new Set(["PROMPT", "SKILL", "KIT", "COLLECTION", "PLUGIN"]);
const fresh = [];
const skipped = [];

for (const starter of starters) {
  const name = starter.name ?? starter.title;
  if (!name) continue;
  const slug = starter.slug ?? slugify(name);
  if (known.has(slug)) continue;

  const type = String(starter.type ?? "PROMPT").toUpperCase();
  const promptText = starter.promptText ?? starter.prompt ?? starter.content ?? "";
  // The prompt text is the product. A starter without it would render as an empty page,
  // so it is reported rather than published half-formed.
  if (!TYPES.has(type) || !promptText.trim()) {
    skipped.push({ name, why: !TYPES.has(type) ? `unknown type ${type}` : "no prompt text" });
    continue;
  }

  fresh.push({
    kind: "starter",
    name,
    slug,
    type,
    summary: starter.summary ?? starter.description?.slice(0, 160) ?? name,
    description: starter.description ?? "",
    promptText,
    whatYouGet: starter.whatYouGet ?? [],
    install: starter.install ?? [],
    techStack: starter.techStack ?? [],
    tags: starter.tags ?? [],
    keywords: starter.keywords ?? [],
    addedAt: new Date().toISOString(),
    addedBy: "Foundry sync",
  });
  known.add(slug);
}

console.log(`export holds ${starters.length} starters, site has ${existing.length}`);
for (const item of skipped) console.log(`  skipped ${item.name} — ${item.why}`);

if (!fresh.length) {
  console.log("nothing new to add");
  process.exit(0);
}

console.log(`\n${fresh.length} new:`);
for (const starter of fresh) console.log(`  + ${starter.type.padEnd(10)} ${starter.name}`);

if (dryRun) {
  console.log("\n--dry-run, nothing written");
  process.exit(0);
}

additions.entries.push(...fresh);
writeFileSync("data/additions.json", `${JSON.stringify(additions, null, 2)}\n`);
console.log(`\nwritten to data/additions.json — run \`npm run data\` to validate`);
