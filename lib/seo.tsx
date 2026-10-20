import type { Metadata } from "next";

import { routing, type Locale } from "@/i18n/routing";
import { hasPlaceholder, headingId, type Frontmatter, type Page } from "@/lib/content";
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

const ORG = { "@id": `${SITE.url}/#organization` };
const WEBSITE = { "@id": `${SITE.url}/#website` };

/** The company as a local business (ProfessionalService is LocalBusiness's subtype for contractors and consultancies). */
export function organizationLd(locale: Locale, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    ...ORG,
    name,
    alternateName: locale === "ar" ? "Fuerte Technologies & Contracting Services" : "فورت تكنولوجيس اند كونتراكتينغ سرفيسس",
    description,
    url: absoluteUrl(localePath(locale, "/")),
    image: absoluteUrl(ogImagePath(locale, "/")),
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

/** The site itself. No SearchAction: the site has no search. */
export function websiteLd(locale: Locale, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    ...WEBSITE,
    name,
    url: absoluteUrl(localePath(locale, "/")),
    inLanguage: locale,
    publisher: ORG,
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
    provider: ORG,
    areaServed: { "@type": "Country", name: "Qatar" },
  };
}

/** A front-matter value Fuerte has confirmed: present and not a "[PLACEHOLDER: …]". */
function confirmed(value: string | Date | undefined) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value && !hasPlaceholder(value) ? value : undefined;
}

function authorLd(author: Frontmatter["author"]) {
  const a = typeof author === "string" ? { name: author } : author;
  if (!a || !confirmed(a.name)) return undefined;
  return { "@type": "Person", name: a.name, ...(confirmed(a.jobTitle) ? { jobTitle: a.jobTitle } : {}), ...(confirmed(a.url) ? { url: a.url } : {}), worksFor: ORG };
}

/** Byline and dates come from front matter only, and only once confirmed. */
export function articleLd(locale: Locale, slug: string, fm: Frontmatter) {
  const author = authorLd(fm.author);
  const published = confirmed(fm.datePublished);
  const modified = confirmed(fm.dateModified) ?? published;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.metaDescription,
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(localePath(locale, slug)),
    image: absoluteUrl(ogImagePath(locale, slug)),
    publisher: ORG,
    ...(author ? { author } : {}),
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
  };
}

/** HowTo from a guide's "Step n:" sections (getSteps). Each step links to its heading. */
export function howToLd(locale: Locale, slug: string, name: string, description: string, steps: { name: string; text: string; heading: string }[]) {
  const url = absoluteUrl(localePath(locale, slug));
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    inLanguage: locale,
    url,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text, url: `${url}#${headingId(s.heading)}` })),
  };
}

/** Services on offer: one Offer per page; a group becomes a nested catalog (the services index lists pillars). */
type CatalogEntry = { page: Page; children?: Page[] };
export function offerCatalogLd(locale: Locale, slug: string, name: string, entries: CatalogEntry[]) {
  const offer = (page: Page) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: page.h1, description: page.fm.metaDescription, url: absoluteUrl(localePath(locale, page.slug)) },
    offeredBy: ORG,
    areaServed: { "@type": "Country", name: "Qatar" },
  });
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name,
    url: absoluteUrl(localePath(locale, slug)),
    itemListElement: entries.map(({ page, children }) =>
      children?.length
        ? { "@type": "OfferCatalog", name: page.h1, url: absoluteUrl(localePath(locale, page.slug)), itemListElement: [offer(page), ...children.map(offer)] }
        : offer(page),
    ),
  };
}

/** Class on a page's opening direct answer, read aloud by voice assistants (speakable). */
export const SPEAKABLE_CLASS = "speakable-answer";

export function speakableLd(locale: Locale, slug: string, name: string) {
  const url = absoluteUrl(localePath(locale, slug));
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    inLanguage: locale,
    isPartOf: WEBSITE,
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", `.${SPEAKABLE_CLASS}`] },
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
