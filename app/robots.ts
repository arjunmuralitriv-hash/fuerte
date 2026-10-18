import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// Answer engines are welcome (GEO, plan section 6): they are named so the intent is explicit.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"];
const DISALLOW = ["/en/dev/", "/ar/dev/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  // Preview deployments stay out of every index.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
