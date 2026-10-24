"use client";

import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startTransition, useState } from "react";

import { CheckLine, ChoiceCard, controlClass, Field } from "@/components/forms/fields";
import { ErrorSummary, FailedNotice, SubmitButton, Turnstile, useFormAction } from "@/components/forms/form-shell";
import { uploadFiles } from "@/components/forms/upload";
import { Link } from "@/i18n/navigation";
import { submitCareers } from "@/lib/forms/actions";

const LOCATIONS = ["inQatar", "outside"] as const;

/** Job application (content: careers.md "Apply"). The CV goes straight to storage before the form is sent. */
export function CareersForm() {
  const t = useTranslations("careersForm");
  const f = useTranslations("forms");
  const locale = useLocale();
  const { state, formAction, pending } = useFormAction(submitCareers);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [cvError, setCvError] = useState<string>();
  const errors: Record<string, string> = { ...(state.status === "invalid" ? state.errors : {}), ...(cvError ? { cv: cvError } : {}) };

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const cv = data.get("cv");
    data.delete("cv");
    setUploadFailed(false);
    setCvError(undefined);
    if (cv instanceof File && cv.size > 0) {
      setUploading(true);
      const result = await uploadFiles(locale, [cv], "careers");
      setUploading(false);
      if (result.status === "invalid") return setCvError(result.error);
      if (result.status === "failed") return setUploadFailed(true);
      data.set("uploads", result.uploads);
    }
    startTransition(() => formAction(data));
  }

  if (state.status === "success") {
    return (
      <div role="status" className="mt-8 flex gap-4 rounded-2xl border bg-card p-6">
        <CheckCircle2 aria-hidden className="size-6 shrink-0 text-primary-ink" />
        <p className="text-body">{t("success", { name: state.name })}</p>
      </div>
    );
  }

  const text = (name: string, label: string, opts: { required?: boolean; help?: string; type?: string; autoComplete?: string; ltr?: boolean } = {}) => (
    <Field id={`cv-${name}`} label={label} required={opts.required} requiredText={f("required")} help={opts.help} error={errors[name]}>
      {(d, invalid) => (
        <input
          id={`cv-${name}`}
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
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        void submit(ev.currentTarget);
      }}
      noValidate
      className="mt-8 flex flex-col gap-8 rounded-2xl border bg-card p-5 md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      {(state.status === "failed" || uploadFailed) && <FailedNotice />}
      <ErrorSummary count={Object.keys(errors).filter((k) => k !== "form").length} message={errors.form} />

      <div className="grid gap-6 md:grid-cols-2">
        {text("name", t("name"), { required: true, autoComplete: "name" })}
        {text("email", t("email"), { required: true, type: "email", autoComplete: "email", ltr: true })}
        {text("phone", t("phone"), { required: true, type: "tel", autoComplete: "tel", ltr: true })}
        {text("role", t("role"), { required: true })}
        {text("experience", t("experience"), { required: true, type: "number" })}
        {text("notice", t("notice"))}
        {text("certifications", t("certifications"), { help: t("certificationsHelp") })}
        {text("linkedin", t("linkedin"), { type: "url", ltr: true })}
      </div>

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.location ? "cv-location-error" : undefined}>
        <legend className="mb-1 text-small font-medium">
          {t("location")} <span className="font-normal text-muted-foreground">{f("required")}</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOCATIONS.map((l) => (
            <ChoiceCard key={l} type="radio" name="location" value={l} label={t(`locations.${l}`)} />
          ))}
        </div>
        {errors.location && (
          <p id="cv-location-error" role="alert" className="text-small font-medium text-destructive">
            {errors.location}
          </p>
        )}
      </fieldset>

      <Field id="cv-cv" label={t("cv")} required requiredText={f("required")} help={t("cvHelp")} error={errors.cv}>
        {(d, invalid) => (
          <input
            id="cv-cv"
            name="cv"
            type="file"
            accept=".pdf,.docx"
            aria-describedby={d}
            aria-invalid={invalid || undefined}
            className="block w-full rounded-lg border border-dashed border-input bg-background p-3 text-small file:me-4 file:h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:font-medium file:text-secondary-foreground"
          />
        )}
      </Field>

      <CheckLine
        id="cv-consent"
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
      <Turnstile />
      <div>
        <SubmitButton pending={pending || uploading}>{t("button")}</SubmitButton>
      </div>
    </form>
  );
}
