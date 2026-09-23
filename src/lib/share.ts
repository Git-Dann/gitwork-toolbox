/**
 * Where the site lives, for the absolute URLs a link preview needs — a card referenced by
 * a relative path is a card Slack cannot fetch. Vercel supplies the production host at
 * build time; the env var is there so a different deploy can say so without a code change.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://gitwork-toolbox.vercel.app");

type Kind = "tools" | "starters" | "resources";

/** The share card for one entry, or the site's own if no entry is named. */
export function shareCard(kind?: Kind, slug?: string) {
  const query = kind && slug ? `?kind=${kind}&slug=${encodeURIComponent(slug)}` : "";
  return {
    url: `/api/og${query}`,
    width: 1200,
    height: 630,
    alt: "Gitwork Toolbox",
  };
}

/** Open Graph and Twitter both, because Slack reads one and everything else the other. */
export function shareMeta({
  title,
  description,
  kind,
  slug,
}: {
  title: string;
  description: string;
  kind?: Kind;
  slug?: string;
}) {
  const image = shareCard(kind, slug);
  const path = kind && slug ? `/${kind}/${slug}` : "/";
  return {
    openGraph: {
      title,
      description,
      siteName: "Gitwork Toolbox",
      url: path,
      type: "website" as const,
      locale: "en_GB",
      images: [image],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [image],
    },
  };
}
