export type Pricing = "Free" | "Freemium" | "Paid";
export type LinkStatus = "ok" | "reviewed" | "warn" | "dead" | "unknown";
export type Usefulness = "High" | "Medium" | "Low" | "None" | "Unknown" | "Not assessed";
export type StarterType = "PROMPT" | "SKILL" | "KIT" | "COLLECTION" | "PLUGIN";

/** Flags set by Dan or Harry in the admin portal. */
export type AdminFlags = {
  recommended: boolean;
  approved: boolean;
  adminNote: string;
};

/** Set only on entries added after the original import. */
export type Added = {
  addedAt?: string;
  addedBy?: string;
};

export type RecentEntry = {
  kind: "tool" | "starter" | "resource";
  slug: string;
  name: string;
  descriptor: string;
  icon?: string | null;
  addedAt: string;
  addedBy: string;
  recommended: boolean;
  approved: boolean;
};

export type Tool = AdminFlags &
  Added & {
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
  icon: string | null;
};

export type Resource = AdminFlags &
  Added & {
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
  icon: string | null;
};

export type Starter = AdminFlags &
  Added & {
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
  types: Record<StarterType, { slug: string; singular: string; plural: string }>;
  overrides: { updatedAt: string | null; updatedBy: string | null };
  recentlyAdded: RecentEntry[];
};

/** The trimmed shape the client-side browsers and cards work with. */
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
  | "recommended"
  | "approved"
  | "addedAt"
  | "icon"
>;

export type StarterListItem = Pick<
  Starter,
  | "slug"
  | "name"
  | "summary"
  | "type"
  | "typeLabel"
  | "tags"
  | "featured"
  | "recommended"
  | "approved"
  | "addedAt"
>;

/** One row in the admin portal's editing table. */
export type AdminItem = {
  kind: "tools" | "resources" | "starters";
  slug: string;
  name: string;
  meta: string;
  recommended: boolean;
  approved: boolean;
  note: string;
};
