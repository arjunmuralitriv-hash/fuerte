import { ArrowDown, ArrowRight, Check, FileCheck2, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Markdown, Placeholder } from "@/components/content/markdown";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSectionPages, hasPlaceholder } from "@/lib/content";
import { getHome, showClaim } from "@/lib/content/home";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const home = getHome(locale);
  return home ? pageMetadata({ locale, slug: "/", title: home.fm.metaTitle, description: home.fm.metaDescription }) : {};
}

/** Renders a draft value, turning "[PLACEHOLDER: …]" into the visible to-confirm mark. */
function Value({ text }: { text: string }) {
  return hasPlaceholder(text) ? (
    <span className="block text-small font-normal">
      <Placeholder>{text.replace(/^\[|\]$/g, "")}</Placeholder>
    </span>
  ) : (
    <>{text}</>
  );
}

const lead = "max-w-prose [&_a]:text-foreground [&_p]:text-body-lg [&_p]:text-muted-foreground";

export default async function HomePage({ params }: Params) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);
  const home = getHome(locale);
  if (!home) notFound();

  const t = await getTranslations();
  const ctx = { slug: "/", serviceName: t("cta.whatsappGeneric") };
  const { hero, beats, stats, extras, facts } = home;
  const [who, why, procurement, attack] = extras;
  const industries = getSectionPages(locale, "industries");
  const whyPoints = (why?.body ?? "")
    .split("\n")
    .map((l) => l.match(/^- \*\*(.+?)\*\*\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m));
  const whyLink = (why?.body ?? "").split("\n").find((l) => l.startsWith("["));

  return (
    <main id="main" lang={home.contentLocale} dir={home.contentLocale === "ar" ? "rtl" : "ltr"}>
      {/* Beat 0. The H1 is the LCP element; the 3D scene mounts behind these sections after first paint. */}
      <section data-beat="0" aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 -z-10 hidden w-1/2 bg-blueprint [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)] md:block rtl:[clip-path:polygon(0_0,70%_0,100%_100%,0_100%)]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        </div>
        <div className="container-page flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-16 md:py-24">
          <p className="eyebrow flex items-center gap-3 text-muted-foreground">
            <span aria-hidden className="h-px w-8 bg-primary" />
            {hero.eyebrow}
          </p>
          <h1 id="hero-title" className="mt-4 max-w-4xl text-display">
            {hero.title}
          </h1>
          <Markdown source={hero.body} ctx={ctx} className={cn(lead, "mt-2")} />
          {hero.scrollCue && (
            <a href="#beat-1" className="mt-16 inline-flex min-h-11 items-center gap-2 self-start text-small font-medium text-muted-foreground hover:text-foreground">
              <ArrowDown aria-hidden className="size-4 text-primary motion-safe:animate-bounce" />
              {hero.scrollCue}
            </a>
          )}
        </div>
      </section>

      {/* Beats 1–6: text sits in the start column; the end column is the 3D stage (a blueprint poster until it loads). */}
      {beats.map((beat, i) => {
        const n = i + 1;
        const isProof = n === 5;
        const isCta = n === 6;
        return (
          <section
            key={n}
            id={`beat-${n}`}
            data-beat={n}
            aria-labelledby={`beat-${n}-title`}
            className={cn("scroll-mt-16 border-b", isCta && "bg-card")}
          >
            <div className="container-page grid items-center gap-10 section-y lg:min-h-[80dvh] lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <p className="eyebrow font-mono text-primary">{beat.eyebrow}</p>
                <h2 id={`beat-${n}-title`} className="mt-3 text-h2">
                  {beat.title}
                </h2>
                <Markdown source={beat.body} ctx={ctx} className={lead} />
              </div>
              {isProof && stats.some((s) => showClaim(s.value)) ? (
                <dl className="grid grid-cols-2 gap-4">
                  {stats.filter((s) => showClaim(s.value)).map((s) => (
                    <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end gap-2 rounded-2xl border bg-card p-5 elevation-1 md:p-6">
                      <dt className="text-small text-muted-foreground">{s.label}</dt>
                      <dd className="text-h2 font-semibold tabular-nums">
                        <Value text={s.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div aria-hidden className="relative hidden aspect-4/3 overflow-hidden rounded-3xl border bg-blueprint lg:block">
                  <span className="absolute end-6 bottom-4 font-mono text-display font-medium text-primary/15 tabular-nums">
                    {String(n).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {who && (
        <section aria-labelledby="who-title" className="container-page section-y">
          <h2 id="who-title" className="text-h2">{who.title}</h2>
          <p className="mt-4 max-w-prose text-body-lg text-muted-foreground">{who.body.split("\n")[0]}</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {industries.map((page) => (
              <li key={page.slug}>
                <Link
                  href={page.slug}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-5 text-small font-medium transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {page.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {why && (
        <section aria-labelledby="why-title" className="border-y bg-card">
          <div className="container-page section-y">
            <h2 id="why-title" className="max-w-2xl text-h2">{why.title}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {whyPoints.map(([, title, text]) => (
                <li key={title} className="rounded-2xl border bg-background p-6">
                  <Check aria-hidden className="size-6 text-primary" />
                  <p className="mt-4 text-h4">{title}</p>
                  <p className="mt-2 text-small text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
            {whyLink && <Markdown source={whyLink} ctx={ctx} className="mt-6" />}
          </div>
        </section>
      )}

      <div className="container-page grid gap-4 section-y md:grid-cols-2">
        {procurement && (
          <div className="flex flex-col rounded-2xl border bg-card p-6 elevation-1 md:p-8">
            <FileCheck2 aria-hidden className="size-6 text-primary" />
            <h2 className="mt-4 text-h3">{procurement.title}</h2>
            <Markdown source={procurement.body} ctx={ctx} className="text-muted-foreground [&_a]:text-foreground" />
          </div>
        )}
        {attack && (
          <div className="flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
            <ShieldAlert aria-hidden className="size-6 text-primary" />
            <h2 className="mt-4 text-h3">{attack.title}</h2>
            <Markdown source={attack.body} ctx={ctx} className="text-muted-foreground [&_a]:text-foreground" />
          </div>
        )}
      </div>

      {facts.length > 0 && (
        <section aria-labelledby="facts-title" className="container-page pb-16 md:pb-24">
          <div className="rounded-2xl border p-6 md:p-8">
            <h2 id="facts-title" className="eyebrow text-muted-foreground">{t("home.atAGlance")}</h2>
            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {facts.filter((f) => showClaim(f.value)).map((f) => (
                <div key={f.label}>
                  <dt className="text-small text-muted-foreground">{f.label}</dt>
                  <dd className="mt-1 text-body">
                    <Value text={f.value} />
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/about" className="mt-8 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary">
              {t("nav.about")}
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
