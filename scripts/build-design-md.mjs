/**
 * Indexes the DESIGN.md library in public/design-md.
 *
 * The specs themselves are 20MB across 1,011 files, so none of it goes into the
 * generated JSON — every page that imports @/lib/data would carry it. This writes
 * metadata only (~100KB); each detail page reads its own spec off disk at build time.
 *
 * Source: github.com/Meliwat/awesome-ios-design-md, MIT, vendored at public/design-md
 * with its licence alongside. Run by `npm run data`.
 */

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "design-md");
const OUT = join(ROOT, "src", "data", "generated", "design-md.json");

const FLAVOURS = [
  { file: "DESIGN.md", key: "neutral", label: "Framework-neutral", for: "Any agent, any framework" },
  { file: "DESIGN-swiftui.md", key: "swiftui", label: "SwiftUI", for: "Native iOS" },
  { file: "DESIGN-expo.md", key: "expo", label: "Expo", for: "React Native" },
  { file: "DESIGN-android.md", key: "android", label: "Jetpack Compose", for: "Android" },
];

const CATEGORY_LABEL = {
  dating: "Dating",
  finance: "Finance",
  fitness: "Fitness",
  food: "Food & drink",
  messaging: "Messaging",
  misc: "Other",
  music: "Music",
  productivity: "Productivity",
  social: "Social",
  travel: "Travel",
  video: "Video",
};

const titleCase = (slug) =>
  slug
    .split("-")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");

if (!existsSync(SRC)) {
  console.error("no public/design-md — nothing to index");
  process.exit(0);
}

const apps = [];
const categories = new Map();

for (const category of readdirSync(SRC).sort()) {
  const categoryPath = join(SRC, category);
  if (!statSync(categoryPath).isDirectory()) continue;

  for (const slug of readdirSync(categoryPath).sort()) {
    const appPath = join(categoryPath, slug);
    if (!statSync(appPath).isDirectory()) continue;

    // Only the key and the byte size are stored: labels, paths and links are all
    // derivable, and repeating them 800 times tripled the index for nothing.
    const flavours = FLAVOURS.filter((f) => existsSync(join(appPath, f.file))).map((f) => ({
      k: f.key,
      b: statSync(join(appPath, f.file)).size,
    }));
    if (!flavours.length) continue;

    // The app README carries the name and a one-line character sketch. Falling back to
    // the folder name rather than skipping: a missing README should not hide a spec.
    const readmePath = join(appPath, "README.md");
    const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
    const name = (/^#\s+(.+?)(?:\s+[—–-]\s+.*)?$/m.exec(readme)?.[1] ?? titleCase(slug)).trim();
    const summary = (readme.split("\n").find((line, i) => i > 1 && line.trim() && !line.startsWith("#")) ?? "").trim();

    // First hex in the summary is the brand colour the sketch leads with; failing that,
    // the first hex anywhere in the neutral spec.
    const hasNeutral = flavours.some((f) => f.k === "neutral");
    const specHead = hasNeutral ? readFileSync(join(appPath, "DESIGN.md"), "utf8").slice(0, 4000) : "";
    const accent = (/#([0-9a-fA-F]{6})\b/.exec(summary) ?? /#([0-9a-fA-F]{6})\b/.exec(specHead))?.[0] ?? null;

    apps.push({
      slug,
      name,
      category,
      summary,
      accent,
      flavours,
      bytes: flavours.reduce((total, f) => total + f.b, 0),
    });
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }
}

apps.sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  // Kept next to the data so the app does not hardcode a second copy.
  flavours: FLAVOURS.map((f) => ({ key: f.key, file: f.file, label: f.label, for: f.for })),
  apps,
  categories: [...categories.entries()]
    .map(([slug, count]) => ({ slug, label: CATEGORY_LABEL[slug] ?? titleCase(slug), count }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  counts: {
    apps: apps.length,
    specs: apps.reduce((total, app) => total + app.flavours.length, 0),
    bytes: apps.reduce((total, app) => total + app.bytes, 0),
  },
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `design-md: ${payload.counts.apps} apps · ${payload.counts.specs} specs · ${(payload.counts.bytes / 1048576).toFixed(1)}MB on disk · ${apps.filter((a) => !a.accent).length} without an accent colour`,
);

/**
 * The apps join the ⌘K index. This appends rather than owning the file because
 * build-data.mjs writes it moments earlier in `npm run data` — if that has not run,
 * there is nothing to append to and the step is skipped rather than guessed at.
 */
const INDEX_FILES = [
  join(ROOT, "src", "data", "generated", "search-index.json"),
  join(ROOT, "public", "search-index.json"),
];

const searchEntries = apps.map((app) => ({
  kind: "design",
  slug: app.slug,
  name: app.name,
  blurb: app.summary.replace(/`/g, "").slice(0, 150),
  meta: CATEGORY_LABEL[app.category] ?? app.category,
  badge: "DESIGN.md",
  pick: false,
}));

for (const file of INDEX_FILES) {
  if (!existsSync(file)) continue;
  const current = JSON.parse(readFileSync(file, "utf8"));
  const withoutDesign = current.filter((entry) => entry.kind !== "design");
  const next = [...withoutDesign, ...searchEntries];
  writeFileSync(file, `${JSON.stringify(next, null, file.includes("public") ? 0 : 2)}\n`);
}
console.log(`design-md: ${searchEntries.length} apps added to the search index`);
