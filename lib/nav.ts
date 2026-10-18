import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { getAllSlugs, getPage, getSectionPages, PILLARS } from "@/lib/content";

export type NavLink = { href: string; label: string; description?: string };
export type NavPillar = NavLink & { children: NavLink[] };
export type Nav = { pillars: NavPillar[]; industries: NavLink[]; links: NavLink[] };

/** Site navigation, built from the content layer so menu labels always match page titles in each locale. */
export async function getNav(locale: Locale): Promise<Nav> {
  const t = await getTranslations({ locale, namespace: "nav" });
  const p = await getTranslations({ locale, namespace: "pillars" });
  const slugs = getAllSlugs();

  const pillars = PILLARS.map((key) => {
    const href = `/services/${key}`;
    const children = slugs
      .filter((s) => s !== href && getPage(locale, s)?.fm.pillar === key)
      .map((s) => ({ href: s, label: getPage(locale, s)!.h1 }));
    return { href, label: p(key), description: getPage(locale, href)?.fm.metaDescription, children };
  });

  const industries = getSectionPages(locale, "industries").map((page) => ({ href: page.slug, label: page.h1 }));

  const links = [
    { href: "/about", label: t("about") },
    { href: "/amc-plans", label: t("amcPlans") },
    { href: "/insights", label: t("insights") },
  ];

  return { pillars, industries, links };
}
