import type { Metadata } from "next";
import { ExperimentRoom } from "@/components/experiments/experiment-room";
import type { RoomData } from "@/components/experiments/room-data";
import { groups, tools } from "@/lib/data";

export const metadata: Metadata = {
  title: "Experiments",
  // Findable by clicking the footer year from 2026 to 2100, and by nothing else.
  robots: { index: false, follow: false },
};

/**
 * Three of the experiments read the toolbox itself, so the trimming happens here rather
 * than in the browser: names, categories and a sentence each, not the full records.
 */
const data: RoomData = {
  tools: tools.map((tool) => ({
    name: tool.name,
    slug: tool.slug,
    category: tool.category,
    group: tool.group,
    recommended: tool.recommended,
  })),
  groups: groups.map((group) => ({ slug: group.slug, name: group.name })),
  // One sentence per tool, from its own write-up: long enough to be a real typing test,
  // short enough to finish, and no backticks or quotes to fight with.
  lines: tools
    .flatMap((tool) =>
      tool.what
        .split(/(?<=[.?!])\s+/)
        .map((sentence) => ({ text: sentence.trim(), source: tool.name })),
    )
    .filter(
      (line) =>
        line.text.length >= 60 &&
        line.text.length <= 150 &&
        !/[`"“”_]/.test(line.text) &&
        /^[A-Z]/.test(line.text),
    )
    .slice(0, 160),
};

export default function ExperimentsPage() {
  return <ExperimentRoom data={data} />;
}
