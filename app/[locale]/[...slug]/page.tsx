import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { ContentPage, contentMetadata } from "@/components/content/content-page";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getAllSlugs, getSectionPages } from "@/lib/content";
import { breadcrumbLd, JsonLd, pageMetadata } from "@/lib/seo";

const INDEXES = ["/industries", "/insights"] as const;
// Pages with their own route (they carry a form whose JS should not load elsewhere).
const OWN_ROUTE = ["/", "/contact", "/legal/data-request"];

type Params = { params: Promise<{ locale: string; slug: string[] }> };

// Unknown paths still reach this route, so notFound() renders the branded, localised 404 inside the layout.
export const dynamicParams = true;

export function generateStaticParams() {
  const slugs = [...getAllSlugs().filter((s) => !OWN_ROUTE.includes(s)), ...INDEXES];
  return routing.locales.flatMap((locale) => slugs.map((s) => ({ locale, slug: s.split("/").filter(Boolean) })));
}

async function resolve({ params }: Params) {
  const { locale, slug: parts } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return { locale: locale as Locale, slug: `/${parts.join("/")}` };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { locale, slug } = await resolve(props);
  if ((INDEXES as readonly string[]).includes(slug)) {
    const t = await getTranslations({ locale, namespace: `indexPages.${slug.slice(1)}` });
    return pageMetadata({ locale, slug, title: t("metaTitle"), description: t("metaDescription") });
  }
  return contentMetadata(locale, slug);
}

export default async function ContentRoute(props: Params) {
  const { locale, slug } = await resolve(props);
  setRequestLocale(locale);
  if ((INDEXES as readonly string[]).includes(slug)) return <IndexPage locale={locale} slug={slug} />;
  return <ContentPage locale={locale} slug={slug} />;
}

async function IndexPage({ locale, slug }: { locale: Locale; slug: string }) {
  const section = slug.slice(1) as "industries" | "insights";
  const t = await getTranslations(`indexPages.${section}`);
  const home = (await getTranslations("content"))("home");
  const pages = getSectionPages(locale, section);
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd(locale, [{ label: home, href: "/" }, { label: t("title") }])} />
      <header className="border-b">
        <div className="container-page pt-10 pb-12 md:pt-16 md:pb-20">
          <Breadcrumbs items={[{ label: home, href: "/" }, { label: t("title") }]} />
          <h1 className="mt-6 text-h1">{t("title")}</h1>
          <p className="mt-6 max-w-prose text-body-lg text-muted-foreground">{t("lead")}</p>
        </div>
      </header>
      <ul className="container-page grid gap-4 py-12 sm:grid-cols-2 md:py-16 lg:grid-cols-3">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link href={p.slug} className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40 elevation-1">
              <span lang={p.contentLocale} className="text-h4">{p.h1}</span>
              <span lang={p.contentLocale} className="mt-3 text-small text-muted-foreground">{p.fm.metaDescription}</span>
              <ArrowRight aria-hidden className="mt-6 size-5 text-primary-ink transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
