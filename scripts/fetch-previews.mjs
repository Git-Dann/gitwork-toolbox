/**
 * Pulls a preview image for every tool and resource so cards can show something
 * other than text.
 *
 *   node scripts/fetch-previews.mjs [--force]
 *        ->  public/previews/<slug>.<png|jpg|webp>
 *
 * The source is the site's own `og:image` (then `twitter:image`) — the picture the
 * vendor designed to represent themselves in a link preview. That beats a
 * screenshot: it is art-directed, it is the right shape already, and it does not
 * go stale the moment they redesign a hero section.
 *
 * Like the icons, previews are committed rather than hotlinked. Hotlinking would
 * put 35 third-party requests on every page, leak who is browsing, and break the
 * grid whenever someone moves a file.
 *
 * Anything without a usable preview falls back to the plain card, so partial
 * coverage is fine.
 */

import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "previews");
const FORCE = process.argv.includes("--force");

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const tools = read("src/data/generated/tools.json");
const resources = read("src/data/generated/resources.json");

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
// Under this and it is a logo or a placeholder, not a preview worth a card slot.
const MIN_BYTES = 8_000;
// Over this and it is someone's uncompressed hero shot; not worth the repo weight.
const MAX_BYTES = 2_000_000;
const TIMEOUT = 15_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,image/*,*/*" },
    });
    return response.ok ? response : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function metaContent(html, property) {
  const tag = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, "i").exec(html);
  return tag ? /content=["']([^"']+)["']/i.exec(tag[0])?.[1] ?? null : null;
}

async function previewUrls(siteUrl) {
  const response = await get(siteUrl);
  if (!response) return [];
  const html = (await response.text()).slice(0, 300_000);

  const candidates = [
    metaContent(html, "og:image:secure_url"),
    metaContent(html, "og:image"),
    metaContent(html, "twitter:image"),
    metaContent(html, "twitter:image:src"),
  ].filter(Boolean);

  return [...new Set(candidates)]
    .map((raw) => {
      try {
        return new URL(raw, response.url).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function download(candidates, slug) {
  for (const url of candidates) {
    const response = await get(url);
    if (!response) continue;

    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = EXT[type];
    if (!ext) continue;

    // Measure the real bytes: several sites send no content-length.
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_BYTES || buffer.length > MAX_BYTES) {
      console.log(`    · skipped ${Math.round(buffer.length / 1024)}KB ${type}`);
      continue;
    }

    writeFileSync(join(OUT, `${slug}.${ext}`), buffer);
    return { file: `${slug}.${ext}`, kb: Math.round(buffer.length / 1024) };
  }
  return null;
}

const items = [
  ...tools.map((tool) => ({ slug: tool.slug, name: tool.name, url: tool.website })),
  ...resources.map((resource) => ({ slug: resource.slug, name: resource.name, url: resource.link })),
].filter((item) => item.url);

mkdirSync(OUT, { recursive: true });
const existing = new Set(readdirSync(OUT).map((file) => file.replace(/\.(png|jpg|webp)$/, "")));

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

  const result = await download(await previewUrls(item.url), item.slug);
  if (result) {
    found += 1;
    console.log(`  ✓ ${item.name} → ${result.file} (${result.kb}KB)`);
  } else {
    missing.push(item.name);
  }
}

console.log(
  `previews: ${found} fetched, ${skipped} already present, ${missing.length} without one` +
    (missing.length ? ` (${missing.join(", ")})` : ""),
);
console.log("Run `npm run data` so the build picks up the new files.");
