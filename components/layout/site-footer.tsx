import { MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Placeholder } from "@/components/content/markdown";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getNav } from "@/lib/nav";
import { SITE, whatsappHref } from "@/lib/site";

const LEGAL = ["privacy", "cookies", "terms", "legal-information", "accessibility-statement", "ai-assistant-notice", "responsible-disclosure", "data-request"] as const;

const heading = "eyebrow text-muted-foreground";
const link = "inline-flex min-h-11 items-center text-small text-foreground/80 hover:text-foreground sm:min-h-9";

export async function SiteFooter() {
  const t = await getTranslations();
  const nav = await getNav((await getLocale()) as Locale);

  const company = [
    { href: "/about", label: t("nav.about") },
    { href: "/industries", label: t("nav.industries") },
    { href: "/amc-plans", label: t("nav.amcPlans") },
    { href: "/insights", label: t("nav.insights") },
    { href: "/vendor-pack", label: t("footer.vendorPack") },
    { href: "/careers", label: t("footer.careers") },
    { href: "/glossary", label: t("footer.glossary") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg">
            <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-small font-semibold text-primary-foreground">
              ft
            </span>
            <span className="text-small font-semibold">{t("common.companyName")}</span>
          </Link>
          <p className="mt-4 text-small text-muted-foreground">{t("footer.tagline")}</p>
          <address className="mt-6 space-y-1 text-small not-italic">
            <p className="text-muted-foreground">{t("common.address")}</p>
            <a href={SITE.phoneHref} className={`${link} gap-2`}>
              <Phone aria-hidden className="size-4 text-primary-ink" />
              <span dir="ltr" className="tabular-nums">{SITE.phoneDisplay}</span>
            </a>
            <br />
            <a
              href={whatsappHref(t("cta.whatsappPrefill", { service: t("cta.whatsappGeneric") }))}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link} gap-2`}
            >
              <MessageCircle aria-hidden className="size-4 text-primary-ink" />
              {t("cta.whatsapp")}
            </a>
          </address>
          <Link
            href="/emergency-cyber-response"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 text-small font-semibold text-primary-ink hover:bg-primary/10"
          >
            <ShieldAlert aria-hidden className="size-4 shrink-0" />
            {t("footer.emergency")}
          </Link>
        </div>

        <nav aria-label={t("footer.services")}>
          <p className={heading}>{t("footer.services")}</p>
          <ul className="mt-4">
            {nav.pillars.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={link}>{p.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/services" className={`${link} font-semibold text-primary-ink`}>{t("nav.allServices")}</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t("footer.company")}>
          <p className={heading}>{t("footer.company")}</p>
          <ul className="mt-4">
            {company.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={link}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("footer.legal")}>
          <p className={heading}>{t("footer.legal")}</p>
          <ul className="mt-4">
            {LEGAL.map((key) => (
              <li key={key}>
                <Link href={`/legal/${key}`} className={link}>{t(`legalLinks.${key}`)}</Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton className={link}>{t("footer.cookieSettings")}</CookieSettingsButton>
            </li>
          </ul>
        </nav>
      </div>

      {/* E-Commerce Law (Decree-Law 16/2010) Art. 51: identity details, continuously accessible on every page. */}
      <div className="border-t">
        <div className="container-page py-8">
          <h2 className={heading}>
            <Link href="/legal/legal-information" className="hover:text-foreground">{t("footer.legalInfo")}</Link>
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-small sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{t("footer.legalName")}</dt>
              <dd className="mt-1">{SITE.legalName ?? <Placeholder>CONFIRM legal name as on CR</Placeholder>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("footer.cr")}</dt>
              <dd className="mt-1 tabular-nums">{SITE.crNumber ?? <Placeholder>CR NUMBER</Placeholder>}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("footer.authority")}</dt>
              <dd className="mt-1">{t("footer.authorityValue")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("rfq.emailLabel")}</dt>
              <dd className="mt-1">
                {SITE.email ? <a href={`mailto:${SITE.email}`} className="hover:text-primary-ink">{SITE.email}</a> : <Placeholder>EMAIL</Placeholder>}
              </dd>
            </div>
          </dl>
          <p className="mt-8 text-small text-muted-foreground">
            © {new Date().getFullYear()} {SITE.legalName ?? t("common.companyName")}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
