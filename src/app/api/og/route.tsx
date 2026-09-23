import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { counts, getGroup, getResource, getStarter, getTool } from "@/lib/data";

export const runtime = "nodejs";
/**
 * Rendered on request rather than at build time. There are five hundred-odd entries and
 * baking a card for every one of them would add minutes to every deploy to serve images
 * that, in practice, only get fetched the handful of times somebody pastes a link.
 */
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

const VOID = "#0C0C18";
const PAPER = "#F2EDE4";
const MUTE = "#7C7A8C";
const SOFT = "#B6B4C4";

/** The six areas keep the colours the sand tray gave them, so the site reads as one thing. */
const AREA: Record<string, string> = {
  "ai-coding": "#8F7DFF",
  "design-engineering": "#3ECF8E",
  "creative-and-assets": "#E8B04B",
  "workflow-and-mac": "#8F7DFF",
  "mobile-and-apple": "#FF6B6B",
  "discovery-and-reference": "#F2EDE4",
};

const fontFile = (name: string) =>
  readFile(path.join(process.cwd(), "src/fonts", name));

/** Satori's gradient parser will not take an eight-digit hex, so alpha has to be rgba. */
const glow = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Satori lays out what it is given; it will not shorten a sentence that does not fit. */
const trim = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 12))}…`;
};

type Card = {
  eyebrow: string;
  tint: string;
  title: string;
  line: string;
  facts: string[];
};

function cardFor(kind: string | null, slug: string | null): Card {
  const tool = kind === "tools" && slug ? getTool(slug) : null;
  if (tool) {
    const group = getGroup(tool.group);
    return {
      eyebrow: group?.name ?? "Tool",
      tint: AREA[tool.group] ?? PAPER,
      title: tool.name,
      line: trim(tool.what, 190),
      facts: [tool.category, tool.pricing, tool.buildVerdict].filter(Boolean) as string[],
    };
  }

  const resource = kind === "resources" && slug ? getResource(slug) : null;
  if (resource) {
    const group = getGroup(resource.group);
    return {
      eyebrow: group?.name ?? "Resource",
      tint: AREA[resource.group] ?? PAPER,
      title: resource.name,
      line: trim(resource.takeaway, 190),
      facts: [resource.resourceType, resource.category, resource.cost].filter(Boolean) as string[],
    };
  }

  const starter = kind === "starters" && slug ? getStarter(slug) : null;
  if (starter) {
    return {
      eyebrow: `Foundry ${starter.typeLabel.toLowerCase()}`,
      tint: "#8F7DFF",
      title: starter.name,
      line: trim(starter.summary, 190),
      facts: [
        starter.typeLabel,
        ...starter.tags.filter((tag) => tag !== "prompt-library").slice(0, 2),
      ],
    };
  }

  return {
    eyebrow: "The studio's working reference",
    tint: "#8F7DFF",
    title: "Gitwork Toolbox",
    line: "Tools, prompts and kits for the studio — every one opened and read before it went on the list.",
    facts: [
      `${counts.tools} tools`,
      `${counts.starters} starters`,
      `${counts.resources} resources`,
    ],
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Looked up by slug rather than taken from the query string: a card that renders
  // whatever text a URL asks it to is a way to put our name on someone else's words.
  const card = cardFor(params.get("kind"), params.get("slug"));

  const [display, mono, body, bodyBold] = await Promise.all([
    fontFile("playfair-700.ttf"),
    fontFile("jetbrains-mono-500.ttf"),
    fontFile("inter-400.ttf"),
    fontFile("inter-600.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: VOID,
          padding: "68px 72px",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* The area colour, top edge, full width: the one thing you read before the words. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: card.tint,
          }}
        />
        {/* A gradient, not a disc. A flat circle at low opacity has a hard edge and
            reads as a shape someone forgot to finish. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE.width,
            height: SIZE.height,
            display: "flex",
            backgroundImage: `radial-gradient(circle at 84% 2%, ${glow(card.tint, 0.26)} 0%, ${glow(card.tint, 0.09)} 32%, ${glow(card.tint, 0)} 60%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 46,
              height: 46,
              borderRadius: 12,
              background: PAPER,
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Playfair",
              fontSize: 27,
              color: VOID,
              position: "relative",
            }}
          >
            G
            <div
              style={{
                position: "absolute",
                right: -3,
                bottom: -3,
                width: 15,
                height: 15,
                borderRadius: 15,
                background: "#6B52FF",
                border: `3px solid ${VOID}`,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "JetBrains",
              fontSize: 19,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: card.tint,
            }}
          >
            {card.eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1000 }}>
          <div
            style={{
              fontFamily: "Playfair",
              fontSize: card.title.length > 30 ? 74 : 94,
              lineHeight: 1.04,
              color: PAPER,
              letterSpacing: -1.5,
            }}
          >
            {card.title}
          </div>
          <div style={{ fontSize: 31, lineHeight: 1.42, color: SOFT }}>{card.line}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
          <div style={{ display: "flex", gap: 12, flexShrink: 1, overflow: "hidden" }}>
            {card.facts.slice(0, 3).map((fact) => (
              <div
                key={fact}
                style={{
                  fontFamily: "JetBrains",
                  fontSize: 19,
                  color: SOFT,
                  border: "1px solid rgba(242,237,228,0.18)",
                  borderRadius: 999,
                  padding: "9px 20px",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {trim(fact, 30)}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "JetBrains",
              fontSize: 19,
              letterSpacing: 2,
              color: MUTE,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            GITWORK TOOLBOX
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // The same handful of links get unfurled repeatedly; there is no reason to
        // re-render a card that cannot have changed since the last deploy.
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
      fonts: [
        { name: "Playfair", data: display, weight: 700, style: "normal" },
        { name: "JetBrains", data: mono, weight: 500, style: "normal" },
        { name: "Inter", data: body, weight: 400, style: "normal" },
        { name: "Inter", data: bodyBold, weight: 600, style: "normal" },
      ],
    },
  );
}
