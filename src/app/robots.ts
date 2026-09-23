import type { MetadataRoute } from "next";

// An internal studio reference: it carries candid verdicts on other people's
// products, so it stays out of search engines until someone decides otherwise.
export default function robots(): MetadataRoute.Robots {
  return {
    // Everything stays out of search, but the share card is explicitly let through:
    // it is the one thing a crawler is meant to fetch, and a blocked card is the
    // grey placeholder that started this.
    rules: [{ userAgent: "*", allow: "/api/og", disallow: "/" }],
  };
}
