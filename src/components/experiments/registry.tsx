"use client";

import type { ReactNode } from "react";
import { HeadsExperiment } from "./heads-experiment";

export type Experiment = {
  slug: string;
  name: string;
  /** One line, on the accordion row. */
  blurb: string;
  /** What it is and how it works, shown once it is open. */
  note: string;
  credits: { label: string; href?: string }[];
  render: () => ReactNode;
};

/**
 * The room's contents. Add an entry and it appears in the accordion — that is the whole
 * registration step, and the reason each experiment is a plain component rather than a
 * route.
 */
export const EXPERIMENTS: Experiment[] = [
  {
    slug: "heads",
    name: "All my friends are made of JavaScript",
    blurb: "A contact sheet of generated faces that watch the cursor",
    note:
      "Every head is recomputed from one integer, so a sheet of nine costs nine numbers and none of them is stored. Who the head is (skull, features, ink) is kept apart from what it is doing (turn, blink, gaze, mouth) and from how both get drawn — which is why the drawing code works nothing out for itself. Line art on canvas, no libraries.",
    credits: [
      {
        label: "after Nikolaj Sokolowski's version",
        href: "https://allmyfriendsaremadeofjavascript.nikolaj-sokolowski.de/docs/",
      },
      { label: "concept from a post by @mannay" },
      { label: "built here from scratch" },
    ],
    render: () => <HeadsExperiment />,
  },
];
