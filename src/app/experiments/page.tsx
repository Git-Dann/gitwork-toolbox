import type { Metadata } from "next";
import { ExperimentRoom } from "@/components/experiments/experiment-room";

export const metadata: Metadata = {
  title: "Experiments",
  // Findable by clicking the footer year from 2026 to 2100, and by nothing else.
  robots: { index: false, follow: false },
};

export default function ExperimentsPage() {
  return <ExperimentRoom />;
}
