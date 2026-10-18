import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main id="main" className="container-page section-y">
      <p className="eyebrow font-mono text-primary">404</p>
      <h1 className="mt-3 max-w-3xl text-h1">{t("title")}</h1>
      <p className="mt-6 max-w-prose text-body-lg text-muted-foreground">{t("body")}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonVariants({ size: "xl" })}>
          {t("home")}
          <ArrowRight aria-hidden data-icon="inline-end" className="rtl:-scale-x-100" />
        </Link>
        <Link href="/services" className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}>
          {t("services")}
        </Link>
        <Link href="/contact" className={buttonVariants({ size: "xl", variant: "ghost" })}>
          {t("contact")}
        </Link>
      </div>
    </main>
  );
}
