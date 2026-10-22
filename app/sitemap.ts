import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { getListedSlugs } from "@/lib/content";
import { absoluteUrl, localePath } from "@/lib/seo";

const INDEXES = ["/industries", "/insights"];

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = [...getListedSlugs(), ...INDEXES];
  return slugs.flatMap((slug) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, slug)),
      changeFrequency: slug.startsWith("/insights") ? ("monthly" as const) : ("yearly" as const),
      priority: slug === "/" ? 1 : slug.startsWith("/services") || slug === "/contact" ? 0.8 : slug.startsWith("/legal") ? 0.3 : 0.6,
      alternates: {
        languages: { ...Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(localePath(l, slug))])), "x-default": absoluteUrl(localePath(routing.defaultLocale, slug)) },
      },
    })),
  );
}
