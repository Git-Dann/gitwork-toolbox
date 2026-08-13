import metaJson from "@/data/generated/meta.json";
import resourcesJson from "@/data/generated/resources.json";
import shortlistJson from "@/data/generated/shortlist.json";
import startersJson from "@/data/generated/starters.json";
import toolsJson from "@/data/generated/tools.json";
import type {
  Group,
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

/** Tools and resources Gitwork assessed and rated High — the honest front page. */
export const picks = {
  tools: tools.filter((tool) => tool.assessed && tool.usefulness === "High"),
  resources: resources.filter((resource) => resource.usefulness === "High"),
};

/** Everything Gitwork actually looked at, best rating first. */
const USEFULNESS_ORDER = ["High", "Medium", "Low", "None", "Unknown", "Not assessed"];

export const assessedTools = tools
  .filter((tool) => tool.assessed)
  .sort(
    (a, b) =>
      USEFULNESS_ORDER.indexOf(a.usefulness) - USEFULNESS_ORDER.indexOf(b.usefulness) ||
      a.name.localeCompare(b.name),
  );

export const startersByType = (type: StarterType) =>
  starters.filter((starter) => starter.type === type);

export const featuredStarters = starters.filter((starter) => starter.featured);

export const starterCollections = startersByType("COLLECTION");

export const toolkits = [...startersByType("KIT"), ...startersByType("PLUGIN")];

export const toolsInGroup = (groupSlug: string) =>
  tools.filter((tool) => tool.group === groupSlug);

export const resourcesInGroup = (groupSlug: string) =>
  resources.filter((resource) => resource.group === groupSlug);

/** Same category first, then same group, capped — used on detail pages. */
export function relatedTools(tool: Tool, limit = 6) {
  const sameCategory = tools.filter(
    (other) => other.slug !== tool.slug && other.category === tool.category,
  );
  const sameGroup = tools.filter(
    (other) =>
      other.slug !== tool.slug && other.category !== tool.category && other.group === tool.group,
  );
  const ranked = [...sameCategory, ...sameGroup].sort(
    (a, b) => Number(b.assessed) - Number(a.assessed),
  );
  return ranked.slice(0, limit);
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

/** Tags worth showing as filters: the model/topic families, not the catch-alls. */
export const starterTags = meta.tags.filter((tag) => tag.count >= 4 && tag.tag !== "prompt-library");

export const groupsWithCounts: Group[] = groups.filter((group) => group.count > 0);

export const sources = {
  directory: {
    name: "700 AI Toolkit",
    url: "https://toolkit.dailyprompting.com/",
    count: tools.filter((tool) => tool.source === "directory").length,
  },
  gitwork: {
    name: "Gitwork assessed",
    count: tools.filter((tool) => tool.assessed).length + resources.length,
  },
};
