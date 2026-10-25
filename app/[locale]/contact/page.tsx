import { Clock, Mail, MapPin, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { Markdown, Placeholder } from "@/components/content/markdown";
import { RfqForm } from "@/components/forms/rfq-form";
import { Loader } from "@/components/ui/loader";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPage } from "@/lib/content";
import { breadcrumbLd, JsonLd, pageMetadata } from "@/lib/seo";
import { SITE, whatsappHref } from "@/lib/site";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const page = getPage(locale, "/contact");
  return page ? pageMetadata({ locale, slug: "/contact", title: page.fm.metaTitle, description: page.fm.metaDescription }) : {};
}

export default async function ContactPage({ params }: Params) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);
  const page = getPage(locale, "/contact");
  if (!page) notFound();

  const t = await getTranslations("rfq");
  const tc = await getTranslations();
  const crumbs = [{ label: tc("content.home"), href: "/" }, { label: page.h1 }];
  // Each row is only a dt/dd pair (valid <dl>); the icon sits in the dt, hung in the start gutter.
  const row = "relative py-4 ps-8";
  const icon = "absolute start-0 top-4 size-5 text-primary-ink";

  return (
    <main id="main">
      <JsonLd data={breadcrumbLd(locale, crumbs)} />
      <div className="container-page grid gap-12 pt-10 pb-16 md:pt-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:pb-24">
        <div className="min-w-0 max-w-3xl">
          <Breadcrumbs items={crumbs} />
          <div lang={page.contentLocale}>
            <h1 className="mt-6 text-h1">{page.h1}</h1>
            {page.lead && <Markdown source={page.lead} ctx={{ slug: "/contact", serviceName: page.h1 }} className="max-w-prose text-muted-foreground [&_p]:text-body-lg" />}
          </div>
          <div className="mt-10">
            <Suspense
              fallback={
                <div className="grid min-h-160 place-items-center">
                  <Loader size={32} />
                </div>
              }
            >
              <RfqForm />
            </Suspense>
          </div>
        </div>

        <aside aria-labelledby="contact-side" className="lg:pt-24">
          <div className="rounded-2xl border bg-card p-6 elevation-1 lg:sticky lg:top-24">
            <h2 id="contact-side" className="text-h4">{t("sideTitle")}</h2>
            <dl className="mt-2 divide-y text-small">
              <div className={row}>
                <dt className="text-muted-foreground">
                  <Phone aria-hidden className={icon} />
                  {t("phoneLabel")}
                </dt>
                <dd className="mt-1 font-medium">
                  <a href={SITE.phoneHref} dir="ltr" className="inline-flex min-h-11 items-center tabular-nums hover:text-primary-ink sm:min-h-0">{SITE.phoneDisplay}</a>
                </dd>
              </div>
              <div className={row}>
                <dt className="text-muted-foreground">
                  <MessageCircle aria-hidden className={icon} />
                  {t("whatsappLabel")}
                </dt>
                <dd className="mt-1 font-medium">
                  <a
                    href={whatsappHref(tc("cta.whatsappPrefill", { service: tc("cta.whatsappGeneric") }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center hover:text-primary-ink sm:min-h-0"
                  >
                    {tc("cta.whatsapp")}
                  </a>
                </dd>
              </div>
              <div className={row}>
                <dt className="text-muted-foreground">
                  <Mail aria-hidden className={icon} />
                  {t("emailLabel")}
                </dt>
                <dd className="mt-1 font-medium">
                  {SITE.email ? <a href={`mailto:${SITE.email}`} className="hover:text-primary-ink">{SITE.email}</a> : <Placeholder>EMAIL</Placeholder>}
                </dd>
              </div>
              <div className={row}>
                <dt className="text-muted-foreground">
                  <MapPin aria-hidden className={icon} />
                  {t("office")}
                </dt>
                <dd className="mt-1">
                  <address className="not-italic">{tc("common.address")}</address>
                </dd>
              </div>
              {/* Production hides the placeholder, so the row goes with it until the hours are confirmed. */}
              {(SITE.hours || process.env.VERCEL_ENV !== "production") && (
                <div className={row}>
                  <dt className="text-muted-foreground">
                    <Clock aria-hidden className={icon} />
                    {t("hours")}
                  </dt>
                  <dd className="mt-1">
                    {SITE.hours ?? <Placeholder>CONFIRM office hours</Placeholder>}
                  </dd>
                </div>
              )}
            </dl>
            <Link
              href="/emergency-cyber-response"
              className="mt-4 flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-small font-semibold text-primary-ink hover:bg-primary/10"
            >
              <ShieldAlert aria-hidden className="size-4 shrink-0" />
              {t("emergency")}
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
