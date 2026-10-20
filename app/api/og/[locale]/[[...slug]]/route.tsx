import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";
import { getAllSlugs, getPage } from "@/lib/content";
import { getHome } from "@/lib/content/home";
import { ogImage } from "@/lib/og";

// Served at /og/{locale}.png and /og/{locale}/{slug}.png through the rewrite in next.config.ts.
// (Next cannot place an opengraph-image file under the [...slug] catch-all, so every page's card comes from here.)
export const dynamic = "force-static";
export const dynamicParams = false;

const INDEXES = ["/industries", "/insights"];
const SECTIONS = ["services", "industries", "insights"] as const;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => [...getAllSlugs(), ...INDEXES].map((s) => ({ locale, slug: s.split("/").filter(Boolean) })));
}

/** Eyebrow names where the page sits: its pillar for a service, otherwise its section, otherwise the home eyebrow. */
async function eyebrowFor(locale: Locale, slug: string) {
  const nav = await getTranslations({ locale, namespace: "nav" });
  const pillar = getPage(locale, slug)?.fm.pillar;
  const section = slug.split("/")[1];
  if (pillar) return getPage(locale, `/services/${pillar}`)?.h1 ?? nav("services");
  if ((SECTIONS as readonly string[]).includes(section)) return nav(section as (typeof SECTIONS)[number]);
  if (section === "legal") return (await getTranslations({ locale, namespace: "footer" }))("legal");
  return getHome(locale)?.hero.eyebrow ?? "";
}

async function titleFor(locale: Locale, slug: string) {
  // Index pages have no Markdown source: use their meta title without the "| Fuerte" suffix.
  if (INDEXES.includes(slug)) return (await getTranslations({ locale, namespace: `indexPages.${slug.slice(1)}` }))("metaTitle").replace(/\s*\|.*$/, "");
  return getPage(locale, slug)?.h1;
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug?: string[] }> }) {
  const { locale, slug: parts } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  const slug = `/${(parts ?? []).join("/")}`;
  const brand = (await getTranslations({ locale, namespace: "common" }))("companyName");
  if (slug === "/") {
    const home = getHome(locale);
    if (!home) return new Response("Not found", { status: 404 });
    return ogImage({ locale, eyebrow: home.hero.eyebrow, title: home.hero.title, brand, surface: "dark" });
  }
  const title = await titleFor(locale, slug);
  if (!title) return new Response("Not found", { status: 404 });
  return ogImage({ locale, eyebrow: await eyebrowFor(locale, slug), title, brand });
}
