"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import type { Nav } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Menu = "services" | "industries";

const top = "inline-flex h-11 items-center gap-1 rounded-lg px-3 text-small font-medium transition-colors hover:bg-muted aria-expanded:bg-muted";
const item = "block rounded-lg px-3 py-2 text-small leading-snug text-muted-foreground hover:bg-muted hover:text-foreground";
const more = "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-small font-semibold text-primary hover:bg-muted";

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
      className={cn(top, active(href) && "text-primary")}
    >
      {label}
      <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform", open === menu && "rotate-180")} />
    </button>
  );

  const panel = "absolute inset-x-0 top-full border-b bg-popover text-popover-foreground elevation-3";
  const [tech, dc, elv, cyber, ...rest] = nav.pillars;

  return (
    <nav ref={root} aria-label={t("label")} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        <li>
          {trigger("services", t("services"), "/services")}
          <div id="menu-services" hidden={open !== "services"} className={panel}>
            <div className="container-page grid grid-cols-4 gap-x-6 py-8">
              {[tech, dc, elv, cyber].map((pillar) => (
                <div key={pillar.href}>
                  <Link href={pillar.href} onClick={close} className="block rounded-lg px-3 py-2 text-small font-semibold hover:bg-muted">
                    {pillar.label}
                  </Link>
                  <ul className="mt-1">
                    {pillar.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={close}
                          aria-current={pathname === child.href ? "page" : undefined}
                          className={cn(item, pathname === child.href && "text-primary")}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t bg-muted/50">
              <div className="container-page flex flex-wrap items-center gap-2 py-3">
                {rest.map((pillar) => (
                  <Link key={pillar.href} href={pillar.href} onClick={close} className="inline-flex min-h-11 items-center rounded-lg px-3 text-small font-semibold hover:bg-background">
                    {pillar.label}
                  </Link>
                ))}
                <Link href="/services" onClick={close} className={cn(more, "ms-auto hover:bg-background")}>
                  {t("allServices")}
                  <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
                </Link>
              </div>
            </div>
          </div>
        </li>

        <li>
          {trigger("industries", t("industries"), "/industries")}
          <div id="menu-industries" hidden={open !== "industries"} className={panel}>
            <div className="container-page py-8">
              <ul className="grid grid-cols-4 gap-1">
                {nav.industries.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className={cn(item, "text-body", pathname === link.href && "text-primary")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/industries" onClick={close} className={cn(more, "mt-4")}>
                {t("allIndustries")}
                <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </li>

        {nav.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active(link.href) ? "page" : undefined}
              className={cn(top, active(link.href) && "text-primary")}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
