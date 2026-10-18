"use client";

import { CalendarCheck, FileText, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { whatsappHref } from "@/lib/site";

const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-small font-medium";

/** Thumb-zone actions on phones (plan section 10). Hidden on the contact page, where the form already is. */
export function MobileCtaBar() {
  const t = useTranslations();
  if (usePathname() === "/contact") return null;

  return (
    <nav
      aria-label={t("mobileBar.label")}
      className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t bg-background/95 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      <Link href={{ pathname: "/contact", query: { type: "survey" } }} className={`${item} bg-primary text-primary-foreground`}>
        <CalendarCheck aria-hidden className="size-5" />
        {t("mobileBar.survey")}
      </Link>
      <Link href={{ pathname: "/contact", query: { type: "quote" } }} className={`${item} hover:bg-muted`}>
        <FileText aria-hidden className="size-5 text-primary" />
        {t("mobileBar.quote")}
      </Link>
      <a
        href={whatsappHref(t("cta.whatsappPrefill", { service: t("cta.whatsappGeneric") }))}
        target="_blank"
        rel="noopener noreferrer"
        className={`${item} hover:bg-muted`}
      >
        <MessageCircle aria-hidden className="size-5 text-primary" />
        {t("mobileBar.whatsapp")}
      </a>
    </nav>
  );
}
