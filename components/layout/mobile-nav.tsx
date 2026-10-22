"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Menu, MessageCircle, Phone, ShieldAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { Nav, NavLink } from "@/lib/nav";
import { SITE, whatsappHref } from "@/lib/site";

type View = "services" | "industries";

const row = "flex min-h-16 w-full items-center justify-between border-b text-h4 font-normal";
// Outline actions use their own classes: buttonVariants' outline variant also carries border-transparent, which cn()
// does not resolve against a token colour, so the border vanishes in the light theme.
const action = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-base font-semibold transition-colors hover:bg-muted [&_svg]:size-5";
const outline = `${action} border-foreground/25`;

/**
 * Full-screen menu (native modal <dialog>: focus trap, Escape, inert page and top layer with no library JS).
 * Services and Industries open their own screen, with a Back row, instead of expanding in place.
 */
export function MobileNav({ nav }: { nav: Nav }) {
  const t = useTranslations();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Record<View, HTMLButtonElement | null>>({ services: null, industries: null });
  const [view, setView] = useState<View | null>(null);
  const close = () => dialog.current?.close();
  const back = () => {
    const from = view!;
    setView(null);
    requestAnimationFrame(() => opener.current[from]?.focus());
  };

  const current = (href: string) => (pathname === href ? "page" : undefined);

  /** An entry on a sub-screen: title, with its one-line description underneath when it has one. */
  const entry = (link: NavLink) => (
    <li key={link.href}>
      <Link href={link.href} onClick={close} aria-current={current(link.href)} className="block py-3">
        <span className={`block text-body font-medium${current(link.href) ? " text-primary-ink" : ""}`}>{link.label}</span>
        {link.description && <span className="mt-0.5 block text-small text-muted-foreground">{link.description}</span>}
      </Link>
    </li>
  );

  const all = (href: string, label: string) => (
    <Link href={href} onClick={close} className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-body font-medium text-primary-ink">
      {label}
      <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
    </Link>
  );

  const opens = (v: View, label: string) => (
    <button
      ref={(el) => {
        opener.current[v] = el;
      }}
      type="button"
      onClick={() => setView(v)}
      className={row}
    >
      {label}
      <ChevronRight aria-hidden className="size-5 text-muted-foreground rtl:-scale-x-100" />
    </button>
  );

  return (
    <>
      <Button variant="ghost" size="icon-xl" aria-label={t("nav.menu")} aria-haspopup="dialog" className="lg:hidden" onClick={() => dialog.current?.showModal()}>
        <Menu aria-hidden />
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="mobile-nav-title"
        onClose={() => setView(null)}
        className="fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none flex-col bg-background p-0 text-foreground not-open:hidden motion-safe:transition-opacity motion-safe:duration-200 motion-safe:starting:open:opacity-0"
      >
        <div className="flex h-16 shrink-0 items-center justify-between ps-5 pe-3">
          <p id="mobile-nav-title" className="flex items-center gap-3 text-small font-semibold">
            <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-small font-semibold text-primary-foreground">
              ft
            </span>
            {t("common.companyName")}
          </p>
          <Button variant="ghost" size="icon-xl" aria-label={t("nav.close")} onClick={close}>
            <X aria-hidden />
          </Button>
        </div>

        <nav aria-label={t("nav.label")} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
          {view === null && (
            <ul>
              <li>{opens("services", t("nav.services"))}</li>
              <li>{opens("industries", t("nav.industries"))}</li>
              {[...nav.links, { href: "/contact", label: t("nav.contact") }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={close} aria-current={current(l.href)} className={`${row}${current(l.href) ? " text-primary-ink" : ""}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {view && (
            // autoFocus moves focus to the new screen's first control.
            <button type="button" autoFocus onClick={back} className="-ms-1 flex min-h-11 items-center gap-1 text-small font-medium text-muted-foreground">
              <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
              {t("nav.back")}
            </button>
          )}

          {view === "services" && (
            <>
              <p className="mt-2 text-h3">{t("nav.services")}</p>
              {nav.menu.map((column) => (
                <section key={column.label} className="mt-8">
                  {column.href ? (
                    <Link href={column.href} onClick={close} className="text-small text-muted-foreground">
                      {column.label}
                    </Link>
                  ) : (
                    <p className="text-small text-muted-foreground">{column.label}</p>
                  )}
                  <ul className="mt-1 divide-y">{column.links.map(entry)}</ul>
                </section>
              ))}
              {all("/services", t("nav.allServices"))}
            </>
          )}

          {view === "industries" && (
            <>
              <p className="mt-2 text-h3">{t("nav.industries")}</p>
              <ul className="mt-6 divide-y">{nav.industries.map(entry)}</ul>
              {all("/industries", t("nav.allIndustries"))}
            </>
          )}
        </nav>

        {/* Actions on the main screen only, so a sub-screen's list gets the full height. */}
        <div hidden={view !== null} className="shrink-0 space-y-3 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Link
            href="/emergency-cyber-response"
            onClick={close}
            className={`${action} border-primary/50 text-primary-ink`}
          >
            <ShieldAlert aria-hidden data-icon="inline-start" />
            {t("nav.underAttack")}
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={whatsappHref(t("cta.whatsappPrefill", { service: t("cta.whatsappGeneric") }))}
              target="_blank"
              rel="noopener noreferrer"
              className={outline}
            >
              <MessageCircle aria-hidden data-icon="inline-start" />
              {t("mobileBar.whatsapp")}
            </a>
            <a href={SITE.phoneHref} className={outline}>
              <Phone aria-hidden data-icon="inline-start" />
              {t("cta.call")}
            </a>
          </div>
          <Link href={{ pathname: "/contact", query: { type: "survey" } }} onClick={close} className={buttonVariants({ size: "xl", className: "w-full" })}>
            {t("cta.survey")}
          </Link>
        </div>
      </dialog>
    </>
  );
}
