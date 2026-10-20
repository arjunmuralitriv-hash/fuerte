import type { Metadata } from "next";

import { routing, type Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/** Path for a canonical slug in a locale: "/" → "/en", "/services" → "/en/services". */
export const localePath = (locale: string, slug: string) => `/${locale}${slug === "/" ? "" : slug}`;
export const absoluteUrl = (path: string) => new URL(path, SITE.url).toString();
/** Open Graph card for a page (app/api/og): /og/en.png, /og/ar/services/cctv.png. */
export const ogImagePath = (locale: string, slug: string) => `/og${localePath(locale, slug)}.png`;

/** Per-page metadata: unique title and description, self-referencing canonical, hreflang pair, Open Graph. */
export function pageMetadata({ locale, slug, title, description }: { locale: Locale; slug: string; title: string; description: string }): Metadata {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localePath(l, slug)]));
  const images = [{ url: ogImagePath(locale, slug), width: 1200, height: 630, alt: title, type: "image/png" }];
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: localePath(locale, slug),
      languages: { ...languages, "x-default": localePath(routing.defaultLocale, slug) },
      // Markdown twin for answer engines (plan section 6, GEO).
      types: { "text/markdown": `${localePath(locale, slug)}.md` },
    },
    openGraph: {
      type: "website",
      url: localePath(locale, slug),
      title,
      description,
      siteName: "Fuerte Technologies & Contracting Services",
      locale: locale === "ar" ? "ar_QA" : "en_QA",
      alternateLocale: locale === "ar" ? "en_QA" : "ar_QA",
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export function organizationLd(locale: Locale, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/#organization`,
    name,
    alternateName: locale === "ar" ? "Fuerte Technologies & Contracting Services" : "فورت تكنولوجيس اند كونتراكتينغ سرفيسس",
    description,
    url: absoluteUrl(localePath(locale, "/")),
    telephone: SITE.phoneDisplay.replace(/\s/g, ""),
    ...(SITE.email ? { email: SITE.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: "2nd Floor, Al Kazim Building, Umm Ghuwailina",
      postOfficeBoxNumber: "9044",
      addressLocality: "Doha",
      addressCountry: "QA",
    },
    geo: { "@type": "GeoCoordinates", ...SITE.geo },
    areaServed: { "@type": "Country", name: "Qatar" },
    knowsLanguage: ["en", "ar"],
  };
}

export function breadcrumbLd(locale: Locale, crumbs: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(localePath(locale, c.href)) } : {}),
    })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function serviceLd(locale: Locale, slug: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(localePath(locale, slug)),
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: { "@type": "Country", name: "Qatar" },
  };
}

export function articleLd(locale: Locale, slug: string, headline: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(localePath(locale, slug)),
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
