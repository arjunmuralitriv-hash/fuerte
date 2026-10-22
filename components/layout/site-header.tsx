import { ShieldAlert } from "lucide-react";
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
      {/* Three columns on wide screens so the menu sits in the true centre, whatever the widths either side. */}
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg">
          {/* Placeholder mark until the client supplies the logo SVG. */}
          <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-small font-semibold text-primary-foreground">
            ft
          </span>
          {/* Link text is the company name (WCAG 2.5.3); visually hidden where space is tight, never removed. */}
          <span className="sr-only text-small font-semibold sm:not-sr-only lg:sr-only xl:not-sr-only">{t("common.companyName")}</span>
        </Link>
        <DesktopNav nav={nav} />
        <div className="flex items-center justify-end gap-1">
          <Link
            href="/emergency-cyber-response"
            className="me-2 hidden min-h-11 items-center gap-1.5 rounded-lg px-2 text-small font-medium text-primary-ink transition-colors hover:bg-muted 2xl:inline-flex"
          >
            <ShieldAlert aria-hidden className="size-4" />
            {t("nav.underAttack")}
          </Link>
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
