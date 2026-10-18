import { getLocale, getTranslations } from "next-intl/server";

import { DesktopNav } from "@/components/layout/desktop-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const t = await getTranslations();
  const nav = await getNav((await getLocale()) as Locale);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={t("header.home")} className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg">
          {/* Placeholder mark until the client supplies the logo SVG. */}
          <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-small font-semibold text-primary-foreground">
            ft
          </span>
          <span className="hidden text-small font-semibold sm:inline lg:hidden xl:inline">{t("common.companyName")}</span>
        </Link>
        <DesktopNav nav={nav} />
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href={{ pathname: "/contact", query: { type: "survey" } }}
            className={cn(buttonVariants({ size: "xl" }), "ms-2 hidden md:inline-flex")}
          >
            {t("nav.primaryCta")}
          </Link>
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  );
}
