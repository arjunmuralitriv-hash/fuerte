import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { getAllSlugs, getPage, getSectionPages, PILLARS } from "@/lib/content";

export type NavLink = { href: string; label: string; description?: string };
export type NavPillar = NavLink & { children: NavLink[] };
/** A column of the Services menu: a header (a pillar, or a plain label) over links with a one-line description. */
export type NavColumn = { label: string; href?: string; links: NavLink[] };
export type Nav = { pillars: NavPillar[]; menu: NavColumn[]; industries: NavLink[]; links: NavLink[] };

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

  // Services menu: the four pillars with sub-services, then one column for the two pillars that have none, with the
  // AMC plans and the emergency response page (descriptions: messages nav.blurbs, keyed by the slug's last segment).
  const blurb = (href: string) => t(`blurbs.${href.split("/").pop()}` as "blurbs.amc");
  // Sub-services use a short menu label (nav.short) where page titles run to two lines.
  const key = (href: string) => href.split("/").pop()!;
  const withBlurb = (l: NavLink) => ({ ...l, label: t.has(`short.${key(l.href)}`) ? t(`short.${key(l.href)}` as "short.cctv") : l.label, description: blurb(l.href) });
  const byKey = Object.fromEntries(pillars.map((pl) => [pl.href.split("/").pop(), pl]));
  const menu: NavColumn[] = [
    ...pillars.filter((pl) => pl.children.length).map((pl) => ({ label: pl.label, href: pl.href, links: pl.children.map(withBlurb) })),
    {
      label: t("supportColumn"),
      links: [byKey["resource-augmentation"], byKey.amc, { href: "/amc-plans", label: t("amcPlans") }, { href: "/emergency-cyber-response", label: t("emergency") }]
        .filter(Boolean)
        .map((l) => withBlurb({ href: l.href, label: l.label })),
    },
  ];

  const industries = getSectionPages(locale, "industries").map((page) => ({ href: page.slug, label: page.h1 }));

  const links = [
    { href: "/about", label: t("about") },
    { href: "/amc-plans", label: t("amcPlans") },
    { href: "/insights", label: t("insights") },
  ];

  return { pillars, menu, industries, links };
}
