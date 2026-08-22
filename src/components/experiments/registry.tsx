"use client";

import type { ReactNode } from "react";
import { AsciiMirror } from "./ascii-mirror";
import { Constellation } from "./constellation";
import { EasingLab } from "./easing-lab";
import { DoubleUp } from "./double-up";
import { HeadsExperiment } from "./heads-experiment";
import { PosterPress } from "./poster-press";
import { Sand } from "./sand";
import { Theremin } from "./theremin";
import { ShipIt } from "./ship-it";
import { TypingRace } from "./typing-race";
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
  {
    slug: "typing",
    name: "Type the toolbox",
    blurb: "A typing test written out of our own tool descriptions",
    note:
      "The corpus is the site: every line is a real sentence from a real entry, and the entry is only named once you have typed it, so you cannot race through without reading. Live words a minute and first-attempt accuracy — backspacing fixes the line but not the score — and your best is kept in this browser. Tab for another line.",
    credits: [{ label: "corpus: our own write-ups" }],
    render: (data) => <TypingRace lines={data.lines} />,
  },
  {
    slug: "ship-it",
    name: "Ship It",
    blurb: "Breakout, where the bricks are tools off the list",
    note:
      "Every brick is a real tool, tinted by its area, and knocking one out ships it. Three attempts, the ball speeds up with every brick, and where it lands on the paddle steers it. The only interesting line in it is the one that moves the ball in substeps of four pixels rather than one jump a frame — at 700 pixels a second a single step is wider than a brick and it tunnels straight through.",
    credits: [{ label: "bricks: 239 tools" }, { label: "no useful purpose whatsoever" }],
    render: (data) => <ShipIt tools={data.tools} />,
  },
  {
    slug: "ascii-mirror",
    name: "ASCII mirror",
    blurb: "Your own face in the mono font, nothing leaving the browser",
    note:
      "The camera frame is drawn into an offscreen canvas one pixel per character — the browser's own downscaler does the averaging — and each row is painted as a single string, because a monospace row aligns itself and nine thousand fillText calls a frame does not. Rec. 601 luma picks the glyph. It asks before it opens the camera, keeps nothing, uploads nothing, and stops the stream the moment you leave.",
    credits: [{ label: "your camera, your browser, nowhere else" }],
    render: () => <AsciiMirror />,
  },
  {
    slug: "poster-press",
    name: "Poster press",
    blurb: "Any tool on the list, printed as a poster you can keep",
    note:
      "Four Swiss grids, a colour taken from the tool's own area, and every word on the sheet — the sentence, the price, the verdict, the domain — is what the entry actually says. It draws at 1600 by 2400 into an offscreen canvas and scales that down for the screen, so the PNG it hands you is a real poster rather than a screenshot of one. It waits for the display serif to load before drawing, because the first draw in Georgia looks like a different design.",
    credits: [{ label: "type: Playfair Display and JetBrains Mono" }],
    render: (data) => <PosterPress posters={data.posters} />,
  },
  {
    slug: "sand",
    name: "Sand",
    blurb: "Pour the six area colours and watch them pile up",
    note:
      "One rule: a grain moves down, or failing that down-left or down-right. Piles, slopes and hourglass behaviour all fall out of that, and the scan direction alternates each frame so the heaps do not all lean the same way. The grid is a byte per grain painted into an ImageData at one pixel each and blown up with smoothing off — drawing sixty-odd thousand little rectangles a frame is the obvious version, and it cannot hold sixty frames a second.",
    credits: [{ label: "palette: the six areas" }],
    render: () => <Sand />,
  },
  {
    slug: "theremin",
    name: "Theremin",
    blurb: "Press and drag to play; the room finally makes a noise",
    note:
      "One oscillator through a low-pass filter and a gain: across the screen for pitch, up it for brightness. The pitch snaps to a pentatonic scale over three octaves, which is the whole difference between an instrument and a siren — wherever you put the pointer sounds deliberate. The line you see is an analyser reading the actual output rather than a drawn sine, and the audio graph is only built on the first press, because a browser will not start an AudioContext until someone asks it to.",
    credits: [{ label: "Web Audio, no samples" }],
    render: () => <Theremin />,
  },
  {
    slug: "easing",
    name: "Easing lab",
    blurb: "Drag a cubic-bézier and watch four things move to it",
    note:
      "The curve on the left and four properties moving to it on the right, so the number and the feel are on screen together — translate, width, scale and rotate, opacity, all driven by the same playhead. Nothing moves unless you ask it to: the demos hold their finished state, changing the curve plays it once, and dragging a handle loops it so the change can be felt as it is made. Drag either handle above the box or below it for an overshoot; x stays inside because CSS requires it. Solving x for t is done by bisection rather than Newton, which is exact enough for a screen and cannot diverge on an overshooting curve. Copy CSS puts the cubic-bezier() on the clipboard.",
    credits: [{ label: "the only one of these that is actually useful" }],
    render: () => <EasingLab />,
  },
  {
    slug: "double-up",
    name: "Double up",
    blurb: "The merge game, in the six area colours",
    note:
      "Arrows, WASD or a swipe; everything doubles; 2048 gets confetti and you carry on playing. The value ladder walks up through the palette so the board turns from grey to violet to green to amber as it fills, with 2 and 4 left quiet because most of the board is 2s and 4s and colouring those makes it unreadable. The one fiddly rule is the one every version of this gets wrong at least once: a tile may only merge once per move, so 2 2 4 slides to 4 4 rather than collapsing to 8.",
    credits: [{ label: "after Gabriele Cirulli's 2048" }, { label: "no knowledge of anything required" }],
    render: () => <DoubleUp />,
  },
];
