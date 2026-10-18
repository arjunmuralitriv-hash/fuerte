import { ArrowRight, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const common = await getTranslations("common");

  return (
    <main id="main">
      <section className="container-page section-y lg:py-40">
        <p className="eyebrow flex items-center gap-3 text-muted-foreground">
          <span aria-hidden className="h-px w-8 bg-primary" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 max-w-4xl text-display">{t("title")}</h1>
        <p className="mt-6 max-w-prose text-body-lg text-muted-foreground">{t("lead")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#contact" className={buttonVariants({ size: "xl" })}>
            {t("primaryCta")}
            <ArrowRight data-icon="inline-end" aria-hidden className="rtl:-scale-x-100" />
          </a>
          <a href="#contact" className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}>
            {t("secondaryCta")}
          </a>
        </div>
        <p className="mt-12 text-small text-muted-foreground">{t("phaseNote")}</p>
      </section>

      <section id="contact" className="border-t">
        <address className="container-page flex flex-col gap-4 py-12 text-body not-italic sm:flex-row sm:gap-12">
          <a href="tel:+97471258588" className="flex min-h-11 items-center gap-3 rounded-lg">
            <Phone aria-hidden className="size-5 text-primary" />
            <span dir="ltr" className="whitespace-nowrap tabular-nums">+974 7125 8588</span>
          </a>
          <p className="flex min-h-11 items-center gap-3">
            <MapPin aria-hidden className="size-5 shrink-0 text-primary" />
            <span>{common("address")}</span>
          </p>
        </address>
      </section>
    </main>
  );
}
