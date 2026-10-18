"use client";

import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CheckLine, ChoiceCard, controlClass, Field } from "@/components/forms/fields";
import { ErrorSummary, FailedNotice, SubmitButton, Turnstile, useFormAction } from "@/components/forms/form-shell";
import { submitDataRequest } from "@/lib/forms/actions";

const ACTIONS = ["access", "correct", "delete", "withdraw", "object", "marketing", "other"] as const;
const RELATIONSHIPS = ["client", "visitor", "applicant", "supplier", "other"] as const;

/** PDPPL data-subject request form (legal/data-request). */
export function DataRequestForm() {
  const t = useTranslations("dataRequest");
  const f = useTranslations("forms");
  const locale = useLocale();
  const { state, formAction, onSubmit, pending } = useFormAction(submitDataRequest);
  const errors = state.status === "invalid" ? state.errors : {};

  if (state.status === "success") {
    return (
      <div role="status" className="mt-8 flex gap-4 rounded-2xl border bg-card p-6">
        <CheckCircle2 aria-hidden className="size-6 shrink-0 text-primary" />
        <p className="text-body">{t("success", { reference: state.reference })}</p>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-8 rounded-2xl border bg-card p-5 md:p-8">
      <input type="hidden" name="locale" value={locale} />
      <h3 className="text-h3">{t("title")}</h3>
      {state.status === "failed" && <FailedNotice />}
      <ErrorSummary count={Object.keys(errors).filter((k) => k !== "form").length} message={errors.form} />

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.action ? "dr-action-error" : undefined}>
        <legend className="mb-1 text-small font-medium">
          {t("action")} <span className="font-normal text-muted-foreground">{f("required")}</span>
        </legend>
        {ACTIONS.map((a) => (
          <ChoiceCard key={a} type="radio" name="action" value={a} label={t(`actions.${a}`)} />
        ))}
        {errors.action && (
          <p id="dr-action-error" role="alert" className="text-small font-medium text-destructive">
            {errors.action}
          </p>
        )}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <Field id="dr-name" label={t("name")} required requiredText={f("required")} error={errors.name}>
          {(d, invalid) => <input id="dr-name" name="name" autoComplete="name" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />}
        </Field>
        <Field id="dr-email" label={t("email")} required requiredText={f("required")} help={t("emailHelp")} error={errors.email}>
          {(d, invalid) => (
            <input id="dr-email" name="email" type="email" autoComplete="email" dir="ltr" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />
          )}
        </Field>
        <Field id="dr-phone" label={t("phone")}>
          {(d) => <input id="dr-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={controlClass} aria-describedby={d} />}
        </Field>
        <Field id="dr-relationship" label={t("relationship")}>
          {(d) => (
            <select id="dr-relationship" name="relationship" defaultValue="" className={controlClass} aria-describedby={d}>
              <option value="" />
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {t(`relationships.${r}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field id="dr-details" label={t("details")} required requiredText={f("required")} help={t("detailsHelp")} error={errors.details}>
        {(d, invalid) => (
          <textarea id="dr-details" name="details" rows={5} className={`${controlClass} h-auto py-2.5`} aria-describedby={d} aria-invalid={invalid || undefined} />
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-small font-medium">{t("onBehalf")}</legend>
        <p className="-mt-1 text-small text-muted-foreground">{t("onBehalfHelp")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard type="radio" name="onBehalf" value="yes" label={f("yes")} />
          <ChoiceCard type="radio" name="onBehalf" value="no" label={f("no")} />
        </div>
      </fieldset>

      <CheckLine id="dr-declaration" name="declaration" label={t("declaration")} error={errors.declaration} />
      <Turnstile />
      <div>
        <SubmitButton pending={pending}>{f("send")}</SubmitButton>
      </div>
    </form>
  );
}
