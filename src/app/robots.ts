import type { MetadataRoute } from "next";

// An internal studio reference: it carries candid verdicts on other people's
// products, so it stays out of search engines until someone decides otherwise.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
