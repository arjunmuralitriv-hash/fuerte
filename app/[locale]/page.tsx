import { ArrowDown, ArrowRight, Check, FileCheck2, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Markdown, Placeholder } from "@/components/content/markdown";
import { HomeScene } from "@/components/sections/home-scene";
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
      {/* The 3D scene is fixed behind the beat sections and reads their data-beat positions (components/three/README.md). */}
      <HomeScene />

      {/* Beat 0. The H1 is the LCP element; the canvas appears behind it after first paint. */}
      <section data-beat="0" aria-labelledby="hero-title" className="relative isolate">
        {/* Scrim on the text side keeps the copy readable over the lit tower; the scene keeps the other side. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-background/90 via-background/75 to-background/30 md:via-background/60 md:to-transparent rtl:bg-linear-to-l"
        />
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
              <ArrowDown aria-hidden className="size-4 text-primary-ink motion-safe:animate-bounce" />
              {hero.scrollCue}
            </a>
          )}
        </div>
      </section>

      {/* Beats 1–6: one viewport each, so each layer of the tower is centred while its copy is read. Copy sits on a translucent card for contrast over the scene. */}
      {beats.map((beat, i) => {
        const n = i + 1;
        const proof = n === 5 ? stats.filter((s) => showClaim(s.value)) : [];
        return (
          <section key={n} id={`beat-${n}`} data-beat={n} aria-labelledby={`beat-${n}-title`} className="scroll-mt-16">
            <div className="container-page flex min-h-dvh items-center py-16">
              <div className="w-full max-w-xl rounded-3xl border bg-background/80 p-6 backdrop-blur-md md:p-8 dark:bg-background/70">
                <p className="eyebrow font-mono text-primary-ink">{beat.eyebrow}</p>
                <h2 id={`beat-${n}-title`} className="mt-3 text-h2">
                  {beat.title}
                </h2>
                <Markdown source={beat.body} ctx={ctx} className={lead} />
                {proof.length > 0 && (
                  <dl className="mt-8 grid grid-cols-2 gap-3">
                    {proof.map((s) => (
                      <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end gap-1 rounded-2xl border bg-card p-4">
                        <dt className="text-small text-muted-foreground">{s.label}</dt>
                        <dd className="text-h3 font-semibold tabular-nums">
                          <Value text={s.value} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Everything after the scroll story sits on an opaque surface over the fixed canvas. */}
      <div className="relative border-t bg-background">
        {who && (
          <section aria-labelledby="who-title" className="container-page section-y">
            <h2 id="who-title" className="text-h2">{who.title}</h2>
            <p className="mt-4 max-w-prose text-body-lg text-muted-foreground">{who.body.split("\n")[0]}</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {industries.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={page.slug}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-5 text-small font-medium transition-colors hover:border-primary/50 hover:text-primary-ink"
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
                    <Check aria-hidden className="size-6 text-primary-ink" />
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
              <FileCheck2 aria-hidden className="size-6 text-primary-ink" />
              <h2 className="mt-4 text-h3">{procurement.title}</h2>
              <Markdown source={procurement.body} ctx={ctx} className="text-muted-foreground [&_a]:text-foreground" />
            </div>
          )}
          {attack && (
            <div className="flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
              <ShieldAlert aria-hidden className="size-6 text-primary-ink" />
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
              <Link href="/about" className="mt-8 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary-ink">
                {t("nav.about")}
                <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
