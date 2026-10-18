"use client";

import { ChevronDown, Menu, MessageCircle, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { Nav, NavLink } from "@/lib/nav";
import { SITE, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const row = "flex min-h-11 items-center rounded-lg px-3 text-body font-medium hover:bg-muted";
const sub = "flex min-h-11 items-center rounded-lg ps-6 pe-3 text-small text-muted-foreground hover:bg-muted hover:text-foreground";

export function MobileNav({ nav }: { nav: Nav }) {
  const t = useTranslations();
  const pathname = usePathname();
  // Native modal <dialog>: focus trap, Escape, inert page and top layer for free, with no library JS.
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  const link = (l: NavLink, className: string) => (
    <Link
      key={l.href}
      href={l.href}
      onClick={close}
      aria-current={pathname === l.href ? "page" : undefined}
      className={cn(className, pathname === l.href && "text-primary")}
    >
      {l.label}
    </Link>
  );

  const group = (label: string, children: React.ReactNode) => (
    <details className="group/nav">
      <summary className={cn(row, "cursor-pointer list-none justify-between [&::-webkit-details-marker]:hidden")}>
        {label}
        <ChevronDown aria-hidden className="size-5 text-muted-foreground transition-transform group-open/nav:rotate-180" />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );

  return (
    <>
      <Button variant="ghost" size="icon-xl" aria-label={t("nav.menu")} aria-haspopup="dialog" className="lg:hidden" onClick={() => dialog.current?.showModal()}>
        <Menu aria-hidden />
      </Button>
      {/* Slides in from the inline-end edge: right in English, left in Arabic. A click on the backdrop closes it. */}
      <dialog
        ref={dialog}
        aria-labelledby="mobile-nav-title"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed inset-y-0 start-auto end-0 m-0 flex h-dvh max-h-none w-full max-w-sm flex-col border-s bg-popover p-0 text-popover-foreground elevation-3 not-open:hidden backdrop:bg-black/40 backdrop:backdrop-blur-xs motion-safe:transition-transform motion-safe:duration-250 motion-safe:starting:open:translate-x-full motion-safe:rtl:starting:open:-translate-x-full"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b ps-5 pe-3">
          <p id="mobile-nav-title" className="text-small font-semibold">{t("common.companyName")}</p>
          <Button variant="ghost" size="icon-xl" aria-label={t("nav.close")} onClick={close}>
            <X aria-hidden />
          </Button>
        </div>

        <nav aria-label={t("nav.label")} className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {group(
            t("nav.services"),
            <>
              {nav.pillars.map((pillar) => (
                <div key={pillar.href}>
                  {link(pillar, cn(sub, "font-semibold text-foreground"))}
                  {pillar.children.map((child) => link(child, cn(sub, "ps-9")))}
                </div>
              ))}
              {link({ href: "/services", label: t("nav.allServices") }, cn(sub, "font-semibold text-primary"))}
            </>,
          )}
          {group(
            t("nav.industries"),
            <>
              {nav.industries.map((l) => link(l, sub))}
              {link({ href: "/industries", label: t("nav.allIndustries") }, cn(sub, "font-semibold text-primary"))}
            </>,
          )}
          {nav.links.map((l) => link(l, row))}
          {link({ href: "/contact", label: t("nav.contact") }, row)}
        </nav>

        <div className="shrink-0 space-y-3 border-t p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Link
            href={{ pathname: "/contact", query: { type: "survey" } }}
            onClick={close}
            className={buttonVariants({ size: "xl", className: "w-full" })}
          >
            {t("cta.survey")}
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={whatsappHref(t("cta.whatsappPrefill", { service: t("cta.whatsappGeneric") }))}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}
            >
              <MessageCircle aria-hidden data-icon="inline-start" />
              {t("mobileBar.whatsapp")}
            </a>
            <a href={SITE.phoneHref} className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}>
              <Phone aria-hidden data-icon="inline-start" />
              {t("cta.call")}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
