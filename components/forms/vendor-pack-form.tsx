"use client";

import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CheckLine, controlClass, Field } from "@/components/forms/fields";
import { ErrorSummary, FailedNotice, SubmitButton, Turnstile, useFormAction } from "@/components/forms/form-shell";
import { Link } from "@/i18n/navigation";
import { submitVendorPack } from "@/lib/forms/actions";

const PURPOSES = ["supplier", "tender", "prequal", "other"] as const;

/** Gated vendor pack request (content: vendor-pack.md "Request the pack"). */
export function VendorPackForm() {
  const t = useTranslations("vendorPackForm");
  const f = useTranslations("forms");
  const locale = useLocale();
  const { state, formAction, onSubmit, pending } = useFormAction(submitVendorPack);
  const errors = state.status === "invalid" ? state.errors : {};

  if (state.status === "success") {
    return (
      <div role="status" className="mt-8 flex gap-4 rounded-2xl border bg-card p-6">
        <CheckCircle2 aria-hidden className="size-6 shrink-0 text-primary-ink" />
        <p className="text-body">{t(state.pending ? "successPending" : "success", { email: state.email })}</p>
      </div>
    );
  }

  const text = (name: string, label: string, opts: { required?: boolean; help?: string; type?: string; autoComplete?: string; ltr?: boolean } = {}) => (
    <Field id={`vp-${name}`} label={label} required={opts.required} requiredText={f("required")} help={opts.help} error={errors[name]}>
      {(d, invalid) => (
        <input
          id={`vp-${name}`}
          name={name}
          type={opts.type ?? "text"}
          autoComplete={opts.autoComplete}
          dir={opts.ltr ? "ltr" : undefined}
          className={controlClass}
          aria-describedby={d}
          aria-invalid={invalid || undefined}
        />
      )}
    </Field>
  );

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-8 rounded-2xl border bg-card p-5 md:p-8">
      <input type="hidden" name="locale" value={locale} />
      {state.status === "failed" && <FailedNotice />}
      <ErrorSummary count={Object.keys(errors).filter((k) => k !== "form").length} message={errors.form} />

      <div className="grid gap-6 md:grid-cols-2">
        {text("name", t("name"), { required: true, autoComplete: "name" })}
        {text("jobTitle", t("jobTitle"), { required: true, autoComplete: "organization-title" })}
        {text("organisation", t("organisation"), { required: true, autoComplete: "organization" })}
        {text("email", t("email"), { required: true, type: "email", autoComplete: "email", help: t("emailHelp"), ltr: true })}
        {text("phone", t("phone"), { type: "tel", autoComplete: "tel", ltr: true })}
        <Field id="vp-purpose" label={t("purpose")}>
          {(d) => (
            <select id="vp-purpose" name="purpose" defaultValue="" className={controlClass} aria-describedby={d}>
              <option value="" />
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {t(`purposes.${p}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        {text("tenderRef", t("tenderRef"))}
      </div>

      <div className="flex flex-col gap-5">
        <CheckLine
          id="vp-consent"
          name="consent"
          error={errors.consent}
          label={t.rich("consent", {
            privacy: (chunks) => (
              <Link href="/legal/privacy" className="font-medium underline decoration-primary underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        />
        <CheckLine id="vp-marketing" name="marketing" label={t("marketing")} />
      </div>
      <Turnstile />
      <div>
        <SubmitButton pending={pending}>{t("button")}</SubmitButton>
      </div>
    </form>
  );
}
