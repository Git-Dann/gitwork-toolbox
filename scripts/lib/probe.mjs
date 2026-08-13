/**
 * Shared fetching and fact-extraction for the discovery pipeline.
 *
 * Everything here gathers *evidence* — what a page actually served — and nothing here
 * writes a listing. That split is deliberate: the site's whole claim is that a person or
 * an agent read the thing before it went up, so a script may prove a link resolves and
 * quote a price off a pricing page, but it may not decide the entry is worth publishing.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

export async function get(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    const text = response.headers.get("content-type")?.includes("image/")
      ? ""
      : await response.text();
    return { status: response.status, url: response.url, text };
  } catch (error) {
    return {
      status: error.name === "AbortError" ? "timeout" : `error:${error.code ?? error.message}`,
      url,
      text: "",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const metaTag = (html, name) => {
  const tag = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i").exec(html);
  return tag ? (/content=["']([^"']*)["']/i.exec(tag[0])?.[1] ?? "") : "";
};

const PRICE = /(?:\$|£|€)\s?\d[\d.,]*(?:\s?\/\s?(?:mo|month|yr|year|seat|user))?/gi;

/** Money figures with enough surrounding text to tell a plan from a funding round. */
export function priceFigures(text, limit = 10) {
  const seen = new Map();
  let match;
  PRICE.lastIndex = 0;
  while ((match = PRICE.exec(text)) && seen.size < limit) {
    if (seen.has(match[0])) continue;
    seen.set(match[0], text.slice(Math.max(0, match.index - 90), match.index + 90));
  }
  return [...seen.entries()].map(([figure, context]) => ({ figure, context }));
}

/**
 * A directory row claiming "Free" means nothing — the label has to come off the vendor's
 * own pricing page, so this looks there first and records which page it read.
 */
export async function readProduct(url) {
  const home = await get(url);
  const evidence = {
    url,
    finalUrl: home.url,
    status: home.status,
    reachable: home.status === 200,
    title: "",
    description: "",
    priceSource: null,
    figures: [],
    mentionsFree: false,
    licence: null,
    body: "",
  };
  if (home.status === 403 || home.status === 429) evidence.blocked = true;
  if (!home.text) return evidence;

  evidence.title = (/<title[^>]*>([^<]*)<\/title>/i.exec(home.text)?.[1] ?? "").trim().slice(0, 200);
  evidence.description = (metaTag(home.text, "description") || metaTag(home.text, "og:description")).slice(0, 400);
  const body = strip(home.text);
  evidence.body = body.slice(0, 700);

  let priceText = body;
  try {
    const origin = new URL(home.url || url).origin;
    for (const path of ["/pricing", "/plans", "/pricing/"]) {
      const page = await get(origin + path, 9000);
      if (page.status === 200 && page.text.length > 800) {
        priceText = strip(page.text);
        evidence.priceSource = path;
        break;
      }
    }
  } catch {
    /* an unparseable URL is already recorded as unreachable */
  }
  if (!evidence.priceSource) evidence.priceSource = "homepage";

  evidence.figures = priceFigures(priceText);
  evidence.mentionsFree = /\bfree\b/i.test(priceText);
  const licence = /\b(MIT|Apache[- ]2(?:\.0)?|AGPL|GPL|MPL[- ]2\.0|BSD|SIL Open Font)\b/.exec(body + priceText);
  evidence.licence = licence ? licence[1] : null;
  evidence.openSource = /\bopen[- ]source\b/i.test(body + priceText) || Boolean(evidence.licence);
  return evidence;
}

/** Repo health, for anything that lives on GitHub. Unauthenticated, so it rate-limits. */
export async function readRepo(owner, repo) {
  const response = await get(`https://api.github.com/repos/${owner}/${repo}`, 12000);
  if (response.status !== 200) return { status: response.status };
  try {
    const json = JSON.parse(response.text);
    return {
      status: 200,
      fullName: json.full_name,
      stars: json.stargazers_count,
      licence: json.license?.spdx_id ?? null,
      pushedAt: json.pushed_at,
      archived: json.archived,
      description: json.description,
    };
  } catch {
    return { status: "unparseable" };
  }
}

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

/**
 * Hosts that carry many unrelated products. Deduping these by hostname would collapse
 * every GitHub repo into one candidate and throw away the rest, so they key on the path
 * as well — the first version of this quietly discarded 410 candidates that way.
 */
const MULTI_PRODUCT_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "toolfolio.com",
  "x.com",
  "twitter.com",
  "medium.com",
  "substack.com",
  "notion.so",
  "producthunt.com",
  "vercel.com",
  "npmjs.com",
]);

/** The identity a candidate is deduped on. */
export const keyOf = (url) => {
  const host = hostOf(url);
  if (!host) return null;
  if (!MULTI_PRODUCT_HOSTS.has(host)) return host;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "").toLowerCase();
    return path ? `${host}${path}` : host;
  } catch {
    return host;
  }
};

/** Bounded concurrency — these run against other people's servers. */
export async function pooled(items, worker, limit = 8) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
