"use client";

import { ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import type { Nav, NavLink } from "@/lib/nav";

type Menu = "services" | "industries";

const top =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-transparent px-3 text-small font-medium transition-colors hover:bg-muted aria-expanded:border-border aria-expanded:bg-muted";
const header = "block text-small text-muted-foreground";
const footerLink = "inline-flex min-h-11 items-center text-small text-muted-foreground transition-colors hover:text-foreground";
const allLink = "inline-flex min-h-11 items-center gap-1.5 text-small font-medium text-primary-ink";
// Class strings are joined by hand, not cn(): its tailwind-merge logic reads text-small as a colour and drops it next to one.

/**
 * Disclosure-pattern menus (button + panel), not an ARIA menu: links stay in the normal tab order.
 * Click or Enter opens; Escape, an outside click or following a link closes. Deliberately dependency-free
 * to keep the initial JS budget (plan section 10).
 */
export function DesktopNav({ nav }: { nav: Nav }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState<Menu | null>(null);
  const root = useRef<HTMLElement>(null);
  const triggers = useRef<Record<Menu, HTMLButtonElement | null>>({ services: null, industries: null });
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const close = () => setOpen(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      triggers.current[open]?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger = (menu: Menu, label: string, href: string) => (
    <button
      ref={(el) => {
        triggers.current[menu] = el;
      }}
      type="button"
      aria-expanded={open === menu}
      aria-controls={`menu-${menu}`}
      onClick={() => setOpen(open === menu ? null : menu)}
      className={`${top}${active(href) ? " text-primary-ink" : ""}`}
    >
      {label}
      <ChevronsUpDown aria-hidden className="size-3.5 text-muted-foreground" />
    </button>
  );

  /** A menu entry: title, with its one-line description underneath when it has one. */
  const entry = (link: NavLink) => (
    <li key={link.href}>
      <Link
        href={link.href}
        onClick={close}
        aria-current={pathname === link.href ? "page" : undefined}
        className="-mx-2 block rounded-lg px-2 py-2 transition-colors hover:bg-muted"
      >
        <span className={`block text-small font-medium${pathname === link.href ? " text-primary-ink" : ""}`}>{link.label}</span>
        {link.description && <span className="mt-0.5 block text-small text-muted-foreground">{link.description}</span>}
      </Link>
    </li>
  );

  /** Floating panel under the header: hairline-divided cells (gap-px over the border colour) and a footer row. */
  const panel = (menu: Menu, cells: React.ReactNode, footer: React.ReactNode) => (
    <div id={`menu-${menu}`} hidden={open !== menu} className="absolute inset-x-0 top-full pt-2">
      <div className="container-page">
        <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-popover text-popover-foreground elevation-3">
          {cells}
          <div className="flex flex-wrap items-center gap-x-6 border-t px-6 py-1">{footer}</div>
        </div>
      </div>
    </div>
  );

  return (
    <nav ref={root} aria-label={t("label")} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        <li>
          {trigger("services", t("services"), "/services")}
          {panel(
            "services",
            <div className="grid grid-cols-5 gap-px bg-border">
              {nav.menu.map((column) => (
                <div key={column.label} className="bg-popover p-5 xl:p-6">
                  {column.href ? (
                    <Link href={column.href} onClick={close} className={`${header} hover:text-foreground`}>
                      {column.label}
                    </Link>
                  ) : (
                    <p className={header}>{column.label}</p>
                  )}
                  <ul className="mt-4 space-y-1">{column.links.map(entry)}</ul>
                </div>
              ))}
            </div>,
            <>
              <Link href="/services" onClick={close} className={`${allLink} me-auto`}>
                {t("allServices")}
              </Link>
              <Link href="/vendor-pack" onClick={close} className={footerLink}>
                {t("vendorPack")}
              </Link>
              <Link href="/contact" onClick={close} className={footerLink}>
                {t("contact")}
              </Link>
            </>,
          )}
        </li>

        <li>
          {trigger("industries", t("industries"), "/industries")}
          {panel(
            "industries",
            <div className="bg-popover p-6">
              <p className={header}>{t("industries")}</p>
              <ul className="mt-4 grid grid-cols-4 gap-x-6 gap-y-1">{nav.industries.map(entry)}</ul>
            </div>,
            <Link href="/industries" onClick={close} className={allLink}>
              {t("allIndustries")}
            </Link>,
          )}
        </li>

        {nav.links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-current={active(link.href) ? "page" : undefined} className={`${top}${active(link.href) ? " text-primary-ink" : ""}`}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
