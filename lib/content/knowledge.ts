import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { confirmedPlain, getListedSlugs, getFaqs, getPage, getPillarServices, hasPlaceholder, PILLARS, type Page } from "@/lib/content";
import { getHome } from "@/lib/content/home";
import { absoluteUrl, localePath } from "@/lib/seo";
import { SITE, whatsappHref } from "@/lib/site";

/** Confirmed FAQs only: getFaqs already drops unanswered items; questions are checked too. */
const faqsOf = (page: Page) => getFaqs(page.body).filter((f) => !hasPlaceholder(f.q));

function entry(locale: Locale, page: Page) {
  return {
    slug: page.slug,
    url: absoluteUrl(localePath(locale, page.slug)),
    name: page.h1,
    description: page.fm.metaDescription,
    summary: confirmedPlain(page.lead),
    // Only set while the translation is missing and the English text is served instead.
    ...(page.contentLocale !== locale ? { language: page.contentLocale } : {}),
    faqs: faqsOf(page),
  };
}

/**
 * /api/knowledge (plan section 6): the content layer as JSON for answer engines and the AI assistant.
 * Built from the same drafts as the pages; draft notes and unconfirmed placeholders never appear.
 */
export async function knowledge(locale: Locale) {
  const common = await getTranslations({ locale, namespace: "common" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  const home = getHome(locale);
  const pages = getListedSlugs().map((slug) => getPage(locale, slug)!);
  const industries = pages.filter((p) => p.section === "industries");
  // Pillars, sub-services and industries carry their own FAQs; the services index is not an entry.
  const listed = new Set(pages.filter((p) => (p.section === "services" && p.slug !== "/services") || p.section === "industries").map((p) => p.slug));

  const data = {
    locale,
    url: absoluteUrl(localePath(locale, "/")),
    company: {
      name: common("companyName"),
      description: meta("description"),
      ...(SITE.legalName ? { legalName: SITE.legalName } : {}),
      address: common("address"),
      telephone: SITE.phoneDisplay,
      whatsapp: whatsappHref(),
      ...(SITE.email ? { email: SITE.email } : {}),
      areaServed: "Qatar",
      languages: ["en", "ar"],
      facts: (home?.facts ?? []).filter((f) => !hasPlaceholder(f.value)).map((f) => ({ label: f.label, value: f.value })),
    },
    services: PILLARS.map((pillar) => getPage(locale, `/services/${pillar}`))
      .filter((p): p is Page => Boolean(p))
      .map((p) => ({ ...entry(locale, p), services: getPillarServices(locale, p.slug.split("/")[2]).map((s) => entry(locale, s)) })),
    industries: industries.map((p) => entry(locale, p)),
    // FAQs from every other page (guides, AMC plans, about, contact…), with the page they answer on.
    faqs: pages
      .filter((p) => !listed.has(p.slug))
      .flatMap((p) => faqsOf(p).map((f) => ({ ...f, url: absoluteUrl(localePath(locale, p.slug)) }))),
  };
  // The Arabic drafts wrap phone numbers and e-mail addresses in bidi isolates for display; JSON consumers get them bare.
  return JSON.parse(JSON.stringify(data).replace(/[⁦-⁩]/g, "")) as typeof data;
}

/** Public, read-only data: cacheable for an hour and readable from any origin. */
export const KNOWLEDGE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};
