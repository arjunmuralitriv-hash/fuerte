import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={t("header.home")} className="flex min-h-11 items-center gap-3 rounded-lg">
          {/* Placeholder mark until the client supplies the logo SVG. */}
          <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-small font-semibold text-primary-foreground">
            ft
          </span>
          <span className="hidden text-small font-semibold sm:inline">{t("common.companyName")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
