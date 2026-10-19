"use client";

import { useLocale, useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const other = useLocale() === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className={buttonVariants({ variant: "ghost", size: "xl", className: "px-3 font-medium" })}
    >
      {t("switchLanguage")}
    </Link>
  );
}
