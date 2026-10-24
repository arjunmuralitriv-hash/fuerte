import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { homeFilm } from "@/lib/film";

/** Opening frame of a film cut (lib/film.ts), so the 404 follows the same theme, cut and render version as the home page. */
const still = (f: { path: string; ext: string; version?: string }) => `${f.path}0000.${f.ext}${f.version ? `?v=${f.version}` : ""}`;

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const film = homeFilm();
  const layer = "pointer-events-none absolute inset-0 -z-20 size-full object-cover";

  return (
    <main id="main" className="relative isolate overflow-hidden">
      {/* Decorative film still: dusk cut in light theme, night cut in dark; the phone cut on portrait screens. */}
      {(["light", "dark"] as const).map((theme) => (
        <picture key={theme} className={theme === "light" ? "dark:hidden" : "hidden dark:block"}>
          <source media="(orientation: portrait)" srcSet={still(film.themes[theme].portrait)} />
          <img src={still(film.themes[theme].landscape)} alt="" aria-hidden className={layer} />
        </picture>
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-background from-25% via-background/70 via-55% to-background/10 md:bg-linear-to-r md:from-background md:from-20% md:via-background/70 md:via-50% md:to-transparent md:rtl:bg-linear-to-l" />

      <div className="container-page flex min-h-[calc(100dvh-4rem)] flex-col justify-end pt-24 pb-[calc(5rem+env(safe-area-inset-bottom))] md:justify-center md:py-24">
        <h1 className="max-w-3xl text-h1">{t("title")}</h1>
        <p className="mt-6 max-w-prose text-body-lg text-muted-foreground">{t("body")}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ size: "xl" })}>
            {t("home")}
          </Link>
          <Link href="/services" className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}>
            {t("services")}
          </Link>
          <Link href="/contact" className={buttonVariants({ size: "xl", variant: "ghost" })}>
            {t("contact")}
          </Link>
        </div>
      </div>
    </main>
  );
}
