import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Breadcrumbs, type Crumb } from "@/components/content/breadcrumbs";
import { Markdown, Placeholder } from "@/components/content/markdown";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getFaqs, getPage, getPillarServices, getSteps, getToc, hasPlaceholder, PILLARS, type Page } from "@/lib/content";
import { articleLd, breadcrumbLd, faqLd, howToLd, JsonLd, offerCatalogLd, pageMetadata, serviceLd, SPEAKABLE_CLASS, speakableLd } from "@/lib/seo";
import { serviceKey, SITE, whatsappHref } from "@/lib/site";

const FORM_KINDS: Record<string, string> = { "/legal/data-request": "data-request", "/vendor-pack": "vendor-pack", "/careers": "careers" };

export function contentMetadata(locale: Locale, slug: string): Metadata {
  const page = getPage(locale, slug);
  if (!page) return {};
  const meta = pageMetadata({ locale, slug, title: page.fm.metaTitle, description: page.fm.metaDescription });
  return page.fm.unlisted ? { ...meta, robots: { index: false, follow: true } } : meta;
}

async function crumbsFor(locale: Locale, page: Page): Promise<Crumb[]> {
  const t = await getTranslations({ locale, namespace: "content" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const crumbs: Crumb[] = [{ label: t("home"), href: "/" }];
  const parts = page.slug.split("/").filter(Boolean);
  if (page.section === "services" && parts.length > 1) {
    crumbs.push({ label: getPage(locale, "/services")?.h1 ?? nav("services"), href: "/services" });
    if (page.fm.pillar) {
      const pillar = getPage(locale, `/services/${page.fm.pillar}`);
      if (pillar) crumbs.push({ label: pillar.h1, href: pillar.slug });
    }
  }
  if (page.section === "industries") crumbs.push({ label: nav("industries"), href: "/industries" });
  if (page.section === "insights") crumbs.push({ label: nav("insights"), href: "/insights" });
  if (page.section === "legal") crumbs.push({ label: (await getTranslations({ locale, namespace: "footer" }))("legal") });
  crumbs.push({ label: page.h1 });
  return crumbs;
}

/** Structured data for a content page (plan section 6). */
function pageLd(locale: Locale, page: Page, crumbs: Crumb[], faqs: { q: string; a: string }[], speakable: boolean) {
  const { slug } = page;
  const ld: object[] = [breadcrumbLd(locale, crumbs)];
  if (faqs.length) ld.push(faqLd(faqs));
  if (page.section === "services") {
    ld.push(serviceLd(locale, slug, page.h1, page.fm.metaDescription));
    if (speakable) ld.push(speakableLd(locale, slug, page.h1));
    const pillar = PILLARS.find((p) => slug === `/services/${p}`);
    if (slug === "/services") {
      const entries = PILLARS.map((p) => getPage(locale, `/services/${p}`)).filter((p): p is Page => Boolean(p));
      ld.push(offerCatalogLd(locale, slug, page.h1, entries.map((p) => ({ page: p, children: getPillarServices(locale, p.slug.split("/")[2]) }))));
    } else if (pillar) {
      const children = getPillarServices(locale, pillar);
      if (children.length) ld.push(offerCatalogLd(locale, slug, page.h1, children.map((p) => ({ page: p }))));
    }
  }
  if (page.section === "insights") {
    ld.push(articleLd(locale, slug, page.fm));
    const steps = getSteps(page.body);
    if (steps.length >= 2) ld.push(howToLd(locale, slug, page.h1, page.fm.metaDescription, steps));
  }
  return ld;
}

/** Standard layout for every Markdown content page. `form` fills the page's "## Form" spec, if it has one. */
export async function ContentPage({ locale, slug, form }: { locale: Locale; slug: string; form?: React.ReactNode }) {
  const page = getPage(locale, slug);
  if (!page) notFound();
  const t = await getTranslations("content");
  const cta = await getTranslations("cta");
  const crumbs = await crumbsFor(locale, page);
  const faqs = getFaqs(page.body);
  const toc = getToc(page.body);
  const sales = page.section === "services" || page.section === "industries" || page.section === "page";
  const fallback = page.contentLocale !== locale;
  const key = serviceKey(slug);
  // A service page's opening paragraph is its direct answer: marked speakable once it holds no placeholder.
  const speakable = page.section === "services" && Boolean(page.lead) && !hasPlaceholder(page.lead);
  const ld = pageLd(locale, page, crumbs, faqs, speakable);

  return (
    <main id="main">
      <JsonLd data={ld} />
      <header className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 hidden w-1/3 bg-primary/5 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)] md:block rtl:[clip-path:polygon(0_0,65%_0,100%_100%,0_100%)]"
        />
        <div className="relative container-page pt-10 pb-12 md:pt-16 md:pb-20">
          <Breadcrumbs items={crumbs} />
          {fallback && <p className="mt-6 text-small text-muted-foreground">{t("notTranslated")}</p>}
          <div lang={page.contentLocale} dir={page.contentLocale === "ar" ? "rtl" : "ltr"}>
            <h1 className="mt-6 max-w-4xl text-h1">{page.h1}</h1>
            {page.lead && <Markdown source={page.lead} ctx={{ slug, serviceName: page.h1 }} className={`max-w-prose text-muted-foreground [&_p]:text-body-lg${speakable ? ` ${SPEAKABLE_CLASS}` : ""}`} />}
          </div>
          {sales && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={{ pathname: "/contact", query: { type: "survey", service: key } }} className={buttonVariants({ size: "xl" })}>
                {cta("survey")}
                <ArrowRight aria-hidden data-icon="inline-end" className="rtl:-scale-x-100" />
              </Link>
              <Link
                href={{ pathname: "/contact", query: { type: "quote", service: key } }}
                className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}
              >
                {cta("quote")}
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="container-page grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <article lang={page.contentLocale} dir={page.contentLocale === "ar" ? "rtl" : "ltr"} className="min-w-0 max-w-prose">
          {hasPlaceholder(page.lead + page.body) && process.env.VERCEL_ENV !== "production" && (
            <p className="mb-10 text-small text-muted-foreground">
              <Placeholder>CONFIRM</Placeholder> {t("draftNotice")}
            </p>
          )}
          <Markdown source={page.body} ctx={{ slug, serviceName: page.h1, formKind: FORM_KINDS[slug], form }} />
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-6">
            {toc.length >= 3 && (
              <nav aria-label={t("onThisPage")} className="rounded-2xl border bg-card p-5">
                <p className="eyebrow text-muted-foreground">{t("onThisPage")}</p>
                <ul className="mt-3 space-y-1">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="block rounded-md py-1.5 text-small text-muted-foreground hover:text-foreground">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="rounded-2xl border bg-card p-5 elevation-1">
              <p className="text-h4">{t("askTitle")}</p>
              <p className="mt-2 text-small text-muted-foreground">{t("askBody")}</p>
              <Link
                href={{ pathname: "/contact", query: { type: "survey", service: key } }}
                className={buttonVariants({ size: "xl", className: "mt-5 w-full" })}
              >
                {cta("survey")}
              </Link>
              <a
                href={whatsappHref(cta("whatsappPrefill", { service: page.h1 }))}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex min-h-11 items-center gap-2 text-small font-medium"
              >
                <MessageCircle aria-hidden className="size-5 text-primary-ink" />
                {cta("whatsapp")}
              </a>
              <a href={SITE.phoneHref} className="flex min-h-11 items-center gap-2 text-small font-medium">
                <Phone aria-hidden className="size-5 text-primary-ink" />
                <span dir="ltr" className="tabular-nums">{SITE.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
