import { ArrowDown, FileCheck2, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Markdown, Placeholder } from "@/components/content/markdown";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { FilmDebug } from "@/components/sections/film-debug";
import { FilmLoader } from "@/components/sections/film-loader";
import { Reveal } from "@/components/sections/reveal";
import { ScrollFilm } from "@/components/sections/scroll-film";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSectionPages, hasPlaceholder } from "@/lib/content";
import { getHome, showClaim } from "@/lib/content/home";
import { homeFilm } from "@/lib/film";
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

// One size smaller on phones so the copy stays in the bottom of the screen, clear of the scene.
const lead = "max-w-prose [&_:not(.not-prose)>a]:text-foreground [&_p]:text-body [&_p]:text-muted-foreground md:[&_p]:text-body-lg";

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
      <FilmLoader />
      {/* The pre-rendered film is fixed behind the beat sections and scrubs to their data-beat positions (lib/film.ts). */}
      <ScrollFilm manifest={homeFilm()} />
      {/* Shows only with ?filmdebug: a visitor's screenshot of it says why the film failed on their device. */}
      <FilmDebug />
      <SmoothScroll />

      {/* Beat 0. The headline paints at once (it is the LCP element); the rest of the hero fades in from first paint, never later (a late fade-in would become the LCP). */}
      <section data-beat="0" aria-labelledby="hero-title" className="relative isolate">
        {/* Scrim behind the copy only: bottom-up on phones (copy sits low), from the text side on wider screens. It runs on
            past the hero and fades out there, so it never ends in a hard edge over the film. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-32 -z-10 mask-b-from-75% bg-linear-to-t from-background from-20% via-background/60 via-45% to-transparent to-70% md:bg-linear-to-r md:from-background/95 md:from-0% md:via-background/80 md:via-55% md:to-transparent md:to-100% md:rtl:bg-linear-to-l"
        />
        <div className="container-page flex min-h-[calc(100dvh-4rem)] flex-col justify-end pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] md:justify-center md:py-24">
          <h1 id="hero-title" className="max-w-4xl text-display">
            {hero.title}
          </h1>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
            {/* Phones: the sticky CTA bar already offers survey, quote and WhatsApp, so the hero drops its own buttons to leave the scene room. */}
            <Markdown source={hero.body} ctx={ctx} className={cn(lead, "mt-2 max-md:[&_.not-prose]:hidden")} />
            {hero.scrollCue && (
              <a href="#beat-1" className="mt-8 inline-flex min-h-11 items-center gap-2 text-small font-medium text-muted-foreground hover:text-foreground md:mt-16">
                <ArrowDown aria-hidden className="size-4 text-primary-ink" />
                {hero.scrollCue}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Beats 1–6: each a screen plus a hold. While the section fills the screen its card is pinned and the film stays on the beat: the next scroll brings the card in, then the film moves on (scroll-film.tsx). Copy sits on a near-opaque card (no blur: blurring the moving film costs every frame). */}
      <MotionProvider>
        {beats.map((beat, i) => {
          const n = i + 1;
          const proof = n === 5 ? stats.filter((s) => showClaim(s.value)) : [];
          return (
            <section key={n} id={`beat-${n}`} data-beat={n} aria-labelledby={`beat-${n}-title`} className="h-[140dvh] scroll-mt-16">
              {/* Phones: compact card in the bottom third so the scene keeps the top of the screen. */}
              <div className="container-page sticky top-0 flex h-dvh items-end pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] md:items-center md:py-16">
                <Reveal beat={n} className="w-full max-w-xl">
                  <div className="rounded-3xl border bg-background/90 p-5 md:p-8 dark:bg-background/85">
                    <h2 id={`beat-${n}-title`} className="text-h2">
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
                </Reveal>
              </div>
            </section>
          );
        })}
      </MotionProvider>

      {/* Everything after the scroll story sits on an opaque surface over the fixed canvas. */}
      <ScrollReveal className="relative border-t bg-background">
        {who && (
          <section aria-labelledby="who-title" className="container-page section-y">
            <h2 id="who-title" data-rise className="text-h2">{who.title}</h2>
            <p className="mt-4 max-w-prose text-body-lg text-muted-foreground">{who.body.split("\n")[0]}</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {industries.map((page) => (
                <li key={page.slug} data-rise>
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
              <h2 id="why-title" data-rise className="max-w-2xl text-h2">{why.title}</h2>
              <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {whyPoints.map(([, title, text]) => (
                  <li key={title} data-rise className="border-t border-foreground/20 pt-5">
                    <p className="text-h4">{title}</p>
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
            <div data-rise className="flex flex-col rounded-2xl border bg-card p-6 elevation-1 md:p-8">
              <h2 className="flex items-center gap-3 text-h3">
                <FileCheck2 aria-hidden className="size-6 shrink-0 text-primary-ink" />
                {procurement.title}
              </h2>
              <Markdown source={procurement.body} ctx={ctx} className="text-muted-foreground [&_a]:text-foreground" />
            </div>
          )}
          {attack && (
            <div data-rise className="flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
              <h2 className="flex items-center gap-3 text-h3">
                <ShieldAlert aria-hidden className="size-6 shrink-0 text-primary-ink" />
                {attack.title}
              </h2>
              <Markdown source={attack.body} ctx={ctx} className="text-muted-foreground [&_a]:text-foreground" />
            </div>
          )}
        </div>

        {facts.length > 0 && (
          <section aria-labelledby="facts-title" className="container-page pb-16 md:pb-24">
            <div data-rise className="rounded-2xl border p-6 md:p-8">
              <h2 id="facts-title" className="eyebrow font-sans text-muted-foreground">{t("home.atAGlance")}</h2>
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
              <Link href="/about" className="mt-8 inline-flex min-h-11 items-center text-small font-semibold text-primary-ink underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                {t("nav.about")}
              </Link>
            </div>
          </section>
        )}
      </ScrollReveal>
    </main>
  );
}
