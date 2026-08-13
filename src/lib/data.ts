import metaJson from "@/data/generated/meta.json";
import resourcesJson from "@/data/generated/resources.json";
import shortlistJson from "@/data/generated/shortlist.json";
import startersJson from "@/data/generated/starters.json";
import toolsJson from "@/data/generated/tools.json";
import type {
  Meta,
  Resource,
  ShortlistSection,
  Starter,
  StarterType,
  Tool,
} from "./types";

export const meta = metaJson as Meta;
export const tools = toolsJson as Tool[];
export const resources = resourcesJson as Resource[];
export const starters = startersJson as Starter[];
export const shortlist = shortlistJson as ShortlistSection[];

export const counts = meta.counts;
export const groups = meta.groups;

/** Empty until someone posts an addition — the UI hides the section when it is. */
export const recentlyAdded = meta.recentlyAdded ?? [];

/** Anything added in the last 30 days wears a NEW mark. */
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
export const isNew = (addedAt?: string) =>
  Boolean(addedAt) && Date.now() - Date.parse(addedAt as string) < THIRTY_DAYS;

const bySlug = <T extends { slug: string }>(items: T[]) =>
  new Map(items.map((item) => [item.slug, item]));

const toolIndex = bySlug(tools);
const starterIndex = bySlug(starters);
const resourceIndex = bySlug(resources);
const groupIndex = new Map(groups.map((group) => [group.slug, group]));

export const getTool = (slug: string) => toolIndex.get(slug);
export const getStarter = (slug: string) => starterIndex.get(slug);
export const getResource = (slug: string) => resourceIndex.get(slug);
export const getGroup = (slug: string) => groupIndex.get(slug);

/** A pick is anything flagged Recommended in the portal, or rated High in the workbook. */
export const isPick = (item: { recommended: boolean; usefulness: string }) =>
  item.recommended || item.usefulness === "High";

export const picks = {
  tools: tools.filter(isPick),
  resources: resources.filter(isPick),
};

export const recommended = {
  tools: tools.filter((tool) => tool.recommended),
  resources: resources.filter((resource) => resource.recommended),
  starters: starters.filter((starter) => starter.recommended),
};

const USEFULNESS_ORDER = ["High", "Medium", "Low", "None", "Unknown", "Not assessed"];

/** Every tool, best verdict first — recommended ones lead. */
export const rankedTools = [...tools].sort(
  (a, b) =>
    Number(b.recommended) - Number(a.recommended) ||
    USEFULNESS_ORDER.indexOf(a.usefulness) - USEFULNESS_ORDER.indexOf(b.usefulness) ||
    a.name.localeCompare(b.name),
);

export const startersByType = (type: StarterType) =>
  starters.filter((starter) => starter.type === type);

export const featuredStarters = starters.filter(
  (starter) => starter.recommended || starter.featured,
);

export const starterCollections = startersByType("COLLECTION");

export const toolkits = [...startersByType("KIT"), ...startersByType("PLUGIN")];

export const toolsInGroup = (groupSlug: string) =>
  tools.filter((tool) => tool.group === groupSlug);

export const resourcesInGroup = (groupSlug: string) =>
  resources.filter((resource) => resource.group === groupSlug);

/** Same category first, then same area — used on detail pages. */
export function relatedTools(tool: Tool, limit = 6) {
  const sameCategory = tools.filter(
    (other) => other.slug !== tool.slug && other.category === tool.category,
  );
  const sameGroup = tools.filter(
    (other) =>
      other.slug !== tool.slug && other.category !== tool.category && other.group === tool.group,
  );
  return [...sameCategory, ...sameGroup]
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))
    .slice(0, limit);
}

export function relatedStarters(starter: Starter, limit = 6) {
  const shared = (other: Starter) =>
    other.tags.filter((tag) => starter.tags.includes(tag)).length;
  return starters
    .filter((other) => other.slug !== starter.slug)
    .map((other) => ({ other, score: shared(other) + (other.type === starter.type ? 0.5 : 0) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.other.name.localeCompare(b.other.name))
    .slice(0, limit)
    .map((entry) => entry.other);
}

/** Tags worth showing as filters: the model and topic families, not the catch-alls. */
export const starterTags = meta.tags.filter(
  (tag) => tag.count >= 4 && tag.tag !== "prompt-library",
);
