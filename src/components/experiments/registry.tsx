"use client";

import type { ReactNode } from "react";
import { Constellation } from "./constellation";
import { HeadsExperiment } from "./heads-experiment";
import type { RoomData } from "./room-data";

export type Experiment = {
  slug: string;
  name: string;
  /** One line, on the accordion row. */
  blurb: string;
  /** What it is and how it works, shown once it is open. */
  note: string;
  credits: { label: string; href?: string }[];
  render: (data: RoomData) => ReactNode;
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
      "Every head is recomputed from one integer, so a sheetful costs one number a head and not one of them is stored anywhere. Who the head is (skull, features, ink) is kept apart from what it is doing (turn, blink, gaze, mouth) and from how both get drawn — which is why the drawing code works nothing out for itself. Line art on canvas, no libraries.",
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
  {
    slug: "constellation",
    name: "The toolbox as a night sky",
    blurb: "All 239 tools as drifting stars, wired up where they share a category",
    note:
      "Every tool on the site is a star, pulled towards its area and pushed off its neighbours by a small force simulation, so the six areas settle into clusters without anyone placing them. A line is drawn between two tools only when they share a category and have drifted close enough to reach — which is why the picture is a constellation rather than a hairball. Recommended tools carry their names; hover any other star to read it, click to open it.",
    credits: [{ label: "our own data, 239 tools and 52 categories" }],
    render: (data) => <Constellation tools={data.tools} groups={data.groups} />,
  },
];
