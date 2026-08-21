/**
 * What the room is allowed to know about the toolbox. The experiments run in the browser
 * and three of them read our own data, so the server page trims it to this and passes it
 * in — importing the generated JSON into a client component would ship all 239 full
 * records to do the work of a name and a category.
 */
export type RoomTool = {
  name: string;
  slug: string;
  category: string;
  group: string;
  recommended: boolean;
};

/** A sentence from a tool's own write-up, for anything that needs real copy to type. */
export type RoomLine = { text: string; source: string };

export type RoomData = {
  tools: RoomTool[];
  groups: { slug: string; name: string }[];
  lines: RoomLine[];
};
