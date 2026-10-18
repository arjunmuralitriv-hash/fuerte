"use client";

import { X } from "lucide-react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { OPEN_CONSENT_EVENT, readConsent, writeConsent, type Consent } from "@/lib/consent";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const LINKEDIN_ID = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;

// Equal weight for every choice: no option is visually pushed over another.
const choice = "flex-1 border-foreground/25";

/** Cookie banner, preferences dialog and the consent-gated third-party tags. */
export function ConsentManager() {
  const t = useTranslations("consent");
  // undefined = not read yet (server render and first paint), null = no choice made.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const dialog = useRef<HTMLDialogElement>(null);

  // Native modal <dialog> (focus trap, Escape, inert page) mirrors the `open` state.
  useEffect(() => {
    const el = dialog.current;
    if (open && !el?.open) el?.showModal();
    if (!open && el?.open) el.close();
  }, [open]);

  useEffect(() => {
    setConsent(readConsent());
    const show = () => {
      const current = readConsent();
      setDraft({ analytics: current?.analytics ?? false, marketing: current?.marketing ?? false });
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, show);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, show);
  }, []);

  const save = (next: { analytics: boolean; marketing: boolean }) => {
    setConsent(writeConsent(next));
    setOpen(false);
  };

  const categories = [
    { key: "analytics", label: t("analytics"), text: t("analyticsText") },
    { key: "marketing", label: t("marketing"), text: t("marketingText") },
  ] as const;

  return (
    <>
      {consent === null && !open && (
        <section
          aria-label={t("title")}
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border bg-popover p-5 text-popover-foreground elevation-3 md:inset-x-auto md:end-6 md:bottom-6 md:w-[28rem] dark:border-foreground/15"
        >
          <h2 className="text-h4">{t("title")}</h2>
          <p className="mt-2 text-small text-muted-foreground">
            {t("text")}{" "}
            <Link href="/legal/cookies" className="font-medium text-foreground underline decoration-primary underline-offset-4">
              {t("notice")}
            </Link>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" size="xl" className={choice} onClick={() => save({ analytics: true, marketing: true })}>
              {t("accept")}
            </Button>
            <Button variant="outline" size="xl" className={choice} onClick={() => save({ analytics: false, marketing: false })}>
              {t("reject")}
            </Button>
            <Button
              variant="outline"
              size="xl"
              className={`${choice} basis-full`}
              onClick={() => {
                setDraft({ analytics: false, marketing: false });
                setOpen(true);
              }}
            >
              {t("choose")}
            </Button>
          </div>
        </section>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="consent-title"
        aria-describedby="consent-text"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground elevation-3 backdrop:bg-black/40 backdrop:backdrop-blur-xs"
      >
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div>
              <h2 id="consent-title" className="text-h4">{t("title")}</h2>
              <p id="consent-text" className="mt-2 text-small text-muted-foreground">{t("text")}</p>
            </div>
            <Button variant="ghost" size="icon-xl" aria-label={t("close")} className="-me-2 -mt-2 shrink-0" onClick={() => setOpen(false)}>
              <X aria-hidden />
            </Button>
          </div>
          <ul className="divide-y">
            <li className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-body font-semibold">{t("essential")}</p>
                <p className="mt-1 text-small text-muted-foreground">{t("essentialText")}</p>
              </div>
              <span className="shrink-0 pt-0.5 text-small font-medium text-muted-foreground">{t("essentialAlways")}</span>
            </li>
            {categories.map((c) => (
              <li key={c.key}>
                <label htmlFor={`consent-${c.key}`} className="flex cursor-pointer items-start justify-between gap-4 p-5 hover:bg-muted/50">
                  <span>
                    <span className="block text-body font-semibold">{c.label}</span>
                    <span className="mt-1 block text-small text-muted-foreground">{c.text}</span>
                  </span>
                  <input
                    id={`consent-${c.key}`}
                    type="checkbox"
                    checked={draft[c.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.checked }))}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t p-5">
            <Button variant="outline" size="xl" className={choice} onClick={() => save({ analytics: false, marketing: false })}>
              {t("reject")}
            </Button>
            <Button variant="outline" size="xl" className={choice} onClick={() => save({ analytics: true, marketing: true })}>
              {t("accept")}
            </Button>
            <Button size="xl" className="basis-full" onClick={() => save(draft)}>
              {t("save")}
            </Button>
          </div>
      </dialog>

      {consent?.analytics && GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent?.analytics && CLARITY_ID && (
        <Script id="clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
      {consent?.marketing && LINKEDIN_ID && (
        <Script id="linkedin" strategy="lazyOnload">
          {`window._linkedin_partner_id="${LINKEDIN_ID}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(window._linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);`}
        </Script>
      )}
    </>
  );
}
