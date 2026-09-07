/**
 * Pulls a real icon for every tool and resource so cards show the product's own
 * mark instead of a monogram.
 *
 *   node scripts/fetch-icons.mjs
 *        ->  public/icons/<slug>.<png|svg|ico|jpg>
 *
 * Icons are committed, not fetched at runtime: no third-party favicon service in
 * the page, nothing to break when someone's site goes down, and no requests
 * leaking who is browsing the toolbox. Re-run it after adding entries; anything
 * already downloaded is skipped unless you pass --force.
 *
 * Whatever it cannot find keeps the monogram, which is a perfectly good fallback.
 */

import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
const FORCE = process.argv.includes("--force");

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const tools = read("src/data/generated/tools.json");
const resources = read("src/data/generated/resources.json");

const EXT = { "image/png": "png", "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 250_000;
const TIMEOUT = 12_000;

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sites serve nothing useful to an unknown agent.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        Accept: "text/html,image/*,*/*",
      },
    });
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Icon URLs declared in the page head, best first. */
/**
 * An href read straight out of the HTML still carries entities. That matters twice: a
 * query string written `?a=1&amp;b=2` fetches the wrong URL, and an inline
 * `data:image/svg+xml,&lt;svg …` downloads the escaped text rather than an SVG — which is
 * how public/icons/cobe.svg ended up as a file no browser could parse.
 */
const unescapeHtml = (value) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

async function declaredIcons(siteUrl) {
  const response = await get(siteUrl);
  if (!response) return [];
  const html = (await response.text()).slice(0, 200_000);

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const scored = [];

  for (const tag of links) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    if (!/icon/.test(rel)) continue;
    const raw = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!raw) continue;
    const href = unescapeHtml(raw);
    const sizes = /sizes=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    const px = Number.parseInt(sizes, 10) || (rel.includes("apple") ? 180 : 0);
    // Prefer apple-touch-icon and large declared sizes; they are the crisp ones.
    scored.push({ url: new URL(href, response.url).toString(), score: (rel.includes("apple") ? 500 : 0) + px });
  }

  return scored.sort((a, b) => b.score - a.score).map((item) => item.url);
}

async function download(candidates, slug) {
  for (const url of candidates) {
    const response = await get(url);
    if (!response) continue;

    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = EXT[type];
    if (!ext) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_BYTES) continue;
    // A 1x1 or near-empty file is a placeholder, not an icon.
    if (buffer.length < 100) continue;
    // And an SVG that is not actually markup is no use to a browser, however it got here.
    if (ext === "svg" && !buffer.subarray(0, 400).toString("utf8").includes("<svg")) continue;

    writeFileSync(join(OUT, `${slug}.${ext}`), buffer);
    return `${slug}.${ext}`;
  }
  return null;
}

const items = [
  ...tools.map((tool) => ({ slug: tool.slug, name: tool.name, url: tool.website })),
  ...resources.map((resource) => ({ slug: resource.slug, name: resource.name, url: resource.link })),
].filter((item) => item.url);

mkdirSync(OUT, { recursive: true });
const existing = new Set(
  readdirSync(OUT).map((file) => file.replace(/\.(png|svg|ico|jpg|webp)$/, "")),
);

let found = 0;
let skipped = 0;
const missing = [];

for (const item of items) {
  if (!FORCE && existing.has(item.slug)) {
    skipped += 1;
    continue;
  }
  if (FORCE) {
    for (const file of readdirSync(OUT)) {
      if (file.startsWith(`${item.slug}.`)) unlinkSync(join(OUT, file));
    }
  }

  let origin;
  try {
    origin = new URL(item.url).origin;
  } catch {
    missing.push(item.name);
    continue;
  }

  const candidates = [
    ...(await declaredIcons(item.url)),
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    `${origin}/favicon.svg`,
    `${origin}/favicon.png`,
    `${origin}/favicon.ico`,
  ];

  const file = await download(candidates, item.slug);
  if (file) {
    found += 1;
    console.log(`  ✓ ${item.name} → ${file}`);
  } else {
    missing.push(item.name);
  }
}

console.log(
  `icons: ${found} fetched, ${skipped} already present, ${missing.length} without one` +
    (missing.length ? ` (${missing.join(", ")})` : ""),
);
console.log("Run `npm run data` so the build picks up the new files.");
