"use client";

import Script from "next/script";
import { useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";

import type { FormState } from "@/lib/forms/actions";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile widget. Renders nothing until a site key is configured. */
export function Turnstile() {
  const t = useTranslations("forms");
  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-size="flexible" />
      <p className="text-small text-muted-foreground">{t("turnstile")}</p>
    </>
  );
}

/**
 * Server-action form state that keeps the user's answers on validation errors. React resets uncontrolled
 * fields after an `action` submission, so with JavaScript we submit from onSubmit in a transition instead;
 * without JavaScript the plain `action` still works.
 */
export function useFormAction(action: (state: FormState, data: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { status: "idle" });
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, formAction, onSubmit, pending };
}

/** Submit button that swaps its label for a "working" orb while the server action runs. */
export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  const t = useTranslations("forms");
  return (
    <Button type="submit" size="xl" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader state="working" size={16} label={false} className="text-primary-foreground" />
          {t("sending")}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FailedNotice() {
  const t = useTranslations("forms");
  return (
    <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
      <p className="font-semibold">{t("failedTitle")}</p>
      <p className="mt-2 text-body text-muted-foreground">{t("failedBody")}</p>
    </div>
  );
}

export function ErrorSummary({ count, message }: { count: number; message?: string }) {
  const t = useTranslations("forms");
  if (!count && !message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-body font-medium text-destructive">
      {message ?? t("errorSummary", { count })}
    </p>
  );
}
