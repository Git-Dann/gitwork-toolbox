export type Pricing = "Free" | "Freemium" | "Paid";
export type LinkStatus = "ok" | "reviewed" | "warn" | "dead" | "unknown";
export type Usefulness = "High" | "Medium" | "Low" | "None" | "Unknown" | "Not assessed";
export type StarterType = "PROMPT" | "SKILL" | "KIT" | "COLLECTION" | "PLUGIN";

export type Tool = {
  slug: string;
  name: string;
  pricing: Pricing;
  category: string;
  group: string;
  what: string;
  priceDetail: string;
  linkStatus: LinkStatus;
  linkLabel: string;
  usefulness: Usefulness;
  buildVerdict: string;
  notes: string[];
  website: string;
  domain: string;
  source: "gitwork" | "directory";
  assessed: boolean;
};

export type Resource = {
  slug: string;
  name: string;
  resourceType: string;
  category: string;
  group: string;
  takeaway: string;
  usefulness: Usefulness;
  whatToDo: string;
  notes: string[];
  cost: string;
  link: string;
  domain: string;
};

export type Starter = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  type: StarterType;
  typeLabel: string;
  tags: string[];
  featured: boolean;
  whatYouGet: string[];
  install: string[];
  techStack: string[];
  keywords: string[];
  promptText: string;
  promptWords: number;
};

export type Group = {
  slug: string;
  name: string;
  blurb: string;
  count: number;
};

export type Category = {
  name: string;
  count: number;
  group: string;
};

export type Tag = {
  tag: string;
  count: number;
  label: string;
};

export type ShortlistSection = {
  number: number;
  title: string;
  slug: string;
  lead: string;
  columns: string[];
  rows: string[][][];
};

export type SearchEntry = {
  kind: "tool" | "starter" | "resource";
  slug: string;
  name: string;
  blurb: string;
  meta: string;
  badge: string;
  pick: boolean;
};

export type Meta = {
  counts: Record<string, number>;
  groups: Group[];
  categories: Category[];
  tags: Tag[];
  readme: { term: string; detail: string }[];
  dataQuality: { measure: string; count: string; note: string }[];
  duplicatePairs: { kept: string; removed: string; website: string }[];
  types: Record<StarterType, { slug: string; singular: string; plural: string }>;
};

/** The trimmed shape the client-side browser and cards work with. */
export type ToolListItem = Pick<
  Tool,
  | "slug"
  | "name"
  | "what"
  | "category"
  | "group"
  | "pricing"
  | "usefulness"
  | "linkStatus"
  | "linkLabel"
  | "domain"
  | "assessed"
>;

export type StarterListItem = Pick<
  Starter,
  "slug" | "name" | "summary" | "type" | "typeLabel" | "tags" | "featured"
>;
