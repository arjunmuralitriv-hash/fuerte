import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// Answer engines are welcome (GEO, plan section 6): they are named so the intent is explicit.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"];
const DISALLOW = ["/en/dev/", "/ar/dev/", "/api/"];
// The knowledge export is meant for crawlers and answer engines (the longer, more specific rule wins).
const ALLOW = ["/", "/api/knowledge"];

export default function robots(): MetadataRoute.Robots {
  // Preview deployments stay out of every index.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
