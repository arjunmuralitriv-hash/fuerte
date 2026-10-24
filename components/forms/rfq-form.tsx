"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { animate } from "motion/mini";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { startTransition, useEffect, useRef, useState } from "react";

import { DateField } from "@/components/forms/date-field";
import { CheckLine, ChoiceCard, controlClass, Field } from "@/components/forms/fields";
import { SOURCE_KEY } from "@/components/layout/source-capture";
import { ErrorSummary, FailedNotice, SubmitButton, Turnstile, useFormAction } from "@/components/forms/form-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { uploadFiles } from "@/components/forms/upload";
import { submitRfq } from "@/lib/forms/actions";
import { DURATION, EASE_ENTRANCE, prefersReducedMotion, seconds } from "@/lib/motion";
import { whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const GROUPS = {
  network: ["network-design", "structured-cabling", "unified-communications", "business-applications", "it-consulting"],
  dataCenter: ["data-center-design-build", "servers-storage-backup", "data-center-network"],
  elv: ["cctv", "access-control", "fire-alarm", "public-address", "bms", "audio-visual", "home-automation"],
  cyber: ["vapt", "managed-soc", "security-awareness-training", "grc"],
  people: ["resource-augmentation", "amc"],
  other: ["other"],
} as const;
const ALIASES: Record<string, string> = { "data-center": "data-center-design-build", technology: "network-design" };
const SITE_TYPES = ["office", "government", "bank", "education", "hospitality", "oilgas", "healthcare", "residential", "industrial", "datacenter", "other"] as const;
const STAGES = ["new", "fitout", "upgrade", "maintenance"] as const;
const TIMELINES = ["asap", "1m", "1-3m", "3-6m", "6m+", "planning"] as const;
const BUDGETS = ["lt50k", "50-250k", "250k-1m", "gt1m", "unsure"] as const;
const STEPS = ["services", "site", "size", "timeline", "contact"] as const;
const FIELD_STEP: Record<string, number> = { services: 0, siteType: 1, location: 1, files: 2, name: 4, organisation: 4, email: 4, phone: 4, consent: 4, form: 4 };
const MAX_FILE = 25 * 1024 * 1024;
const FILE_TYPES = /\.(pdf|dwg|docx|xlsx|zip)$/i;

/** Five-step RFQ / site-survey form (content-drafts/en/contact-rfq.md). One <form>; inactive steps are hidden, not unmounted. */
export function RfqForm() {
  const t = useTranslations("rfq");
  const f = useTranslations("forms");
  const e = useTranslations("forms.errors");
  const locale = useLocale();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const preset = params.get("service") ?? "";
  const [step, setStep] = useState(0);
  const shown = useRef(0); // the step on screen before the current one, for the slide direction
  const [mode, setMode] = useState(params.get("type") === "quote" ? "quote" : "survey");
  const [services, setServices] = useState<Set<string>>(() => new Set([ALIASES[preset] ?? preset].filter((s) => Object.values(GROUPS).flat().includes(s as never))));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { state, formAction, pending } = useFormAction(submitRfq);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors = { ...serverErrors, ...clientErrors };
  const moved = useRef(false);

  // On server-side errors, jump back to the first step that has one.
  useEffect(() => {
    if (state.status !== "invalid") return;
    const first = Math.min(...Object.keys(state.errors).map((k) => FIELD_STEP[k] ?? 4));
    setStep(first);
  }, [state]);

  // Move focus to the step heading whenever the step changes (not on first render), and slide the new step in from
  // the side the visitor is heading: forward from the inline end, back from the inline start (mirrored in RTL).
  useEffect(() => {
    const section = headingRef.current?.closest("section");
    if (moved.current && section) {
      headingRef.current?.focus();
      if (!prefersReducedMotion()) {
        const side = (step > shown.current ? 1 : -1) * (getComputedStyle(section).direction === "rtl" ? -1 : 1);
        animate(section, { opacity: [0, 1], transform: [`translateX(${24 * side}px)`, "none"] }, { duration: seconds(DURATION.slow), ease: EASE_ENTRANCE });
      }
    }
    shown.current = step;
    moved.current = true;
  }, [step]);

  const has = (...keys: string[]) => keys.some((k) => services.has(k));
  const toggle = (key: string, on: boolean) =>
    setServices((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  function validate(current: number) {
    const data = new FormData(formRef.current!);
    const next: Record<string, string> = {};
    if (current === 0 && !data.getAll("services").length) next.services = e("services");
    if (current === 1) {
      if (!data.get("siteType")) next.siteType = e("siteType");
      if (!String(data.get("location") ?? "").trim()) next.location = e("location");
    }
    if (current === 2) {
      const files = data.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
      if (files.some((x) => x.size > MAX_FILE)) next.files = e("fileSize");
      else if (files.some((x) => !FILE_TYPES.test(x.name))) next.files = e("fileType");
    }
    setClientErrors(next);
    return !Object.keys(next).length;
  }

  /** Files go straight to storage first (lib/forms/uploads.ts); the form itself then carries only their names and paths. */
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const files = data.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    data.delete("files");
    try {
      data.set("source", sessionStorage.getItem(SOURCE_KEY) ?? "");
    } catch {}
    setUploadFailed(false);
    if (files.length) {
      setUploading(true);
      const result = await uploadFiles(locale, files, "rfq");
      setUploading(false);
      if (result.status === "invalid") {
        setClientErrors({ files: result.error });
        setStep(2);
        return;
      }
      if (result.status === "failed") return setUploadFailed(true);
      data.set("uploads", result.uploads);
    }
    startTransition(() => formAction(data));
  }

  if (state.status === "success") {
    const ref = state.reference;
    return (
      <div role="status" className="rounded-2xl border bg-card p-6 md:p-10">
        <CheckCircle2 aria-hidden className="size-10 text-primary-ink" />
        <h2 className="mt-6 text-h2">{t("successTitle", { name: state.name })}</h2>
        <p className="mt-4 text-body-lg text-muted-foreground">{t("successBody", { reference: ref, email: state.email })}</p>
        <h3 className="mt-10 text-h4">{t("nextTitle")}</h3>
        <ol className="mt-4 list-decimal space-y-2 ps-6 text-body marker:text-muted-foreground">
          <li>{t("next1")}</li>
          <li>{t("next2")}</li>
          <li>{t("next3")}</li>
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}>
            {t("backHome")}
          </Link>
          <a href={whatsappHref(`Fuerte ${ref}`)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "xl" })}>
            <MessageCircle aria-hidden data-icon="inline-start" />
            {t("whatsappRef")}
          </a>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(errors).filter((k) => k !== "form" && (FIELD_STEP[k] ?? 4) === step).length;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(ev) => {
        // Enter inside an earlier step advances instead of submitting.
        if (step < 4) {
          ev.preventDefault();
          if (validate(step)) setStep(step + 1);
          return;
        }
        ev.preventDefault();
        void submit(ev.currentTarget);
      }}
      noValidate
      className="rounded-2xl border bg-card p-5 md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />

      {/* Progress */}
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-250", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <p className="mt-4 text-small font-medium text-muted-foreground tabular-nums" aria-live="polite">
        {t("progress", { step: step + 1, name: t(`steps.${STEPS[step]}`) })}
      </p>

      {(state.status === "failed" || uploadFailed) && (
        <div className="mt-6">
          <FailedNotice />
        </div>
      )}
      <div className="mt-6 empty:hidden">
        <ErrorSummary count={errorCount} message={step === 4 ? errors.form : undefined} />
      </div>

      {/* Step 1: services */}
      <section hidden={step !== 0} className="mt-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-small font-medium">{t("modeLabel")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard type="radio" name="mode" value="survey" checked={mode === "survey"} onChange={() => setMode("survey")} label={t("modeSurvey")} />
            <ChoiceCard type="radio" name="mode" value="quote" checked={mode === "quote"} onChange={() => setMode("quote")} label={t("modeQuote")} />
          </div>
          <p className="text-small text-muted-foreground">{t("modeHelp")}</p>
        </fieldset>

        <h2 ref={step === 0 ? headingRef : undefined} tabIndex={-1} className="mt-10 text-h3 outline-none">
          {t("servicesHeading")}
        </h2>
        <p className="mt-2 text-body text-muted-foreground">{t("servicesHelp")}</p>
        <div className="mt-6 flex flex-col gap-8">
          {Object.entries(GROUPS).map(([group, keys]) => (
            <fieldset key={group} className="flex flex-col gap-3">
              <legend className="mb-1 text-small font-semibold">{t(`groups.${group}`)}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {keys.map((key) => (
                  <ChoiceCard
                    key={key}
                    type="checkbox"
                    name="services"
                    value={key}
                    checked={services.has(key)}
                    onChange={(ev) => toggle(key, ev.currentTarget.checked)}
                    label={t(`services.${key}`)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
          {services.has("other") && (
            <Field id="rfq-other" label={t("otherService")}>
              {(d) => <input id="rfq-other" name="serviceOther" className={controlClass} aria-describedby={d} />}
            </Field>
          )}
          {errors.services && (
            <p role="alert" className="text-small font-medium text-destructive">
              {errors.services}
            </p>
          )}
        </div>
      </section>

      {/* Step 2: site */}
      <section hidden={step !== 1} className="mt-6">
        <h2 ref={step === 1 ? headingRef : undefined} tabIndex={-1} className="text-h3 outline-none">
          {t("siteHeading")}
        </h2>
        <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">{t("siteHeading")}</legend>
          {SITE_TYPES.map((s) => (
            <ChoiceCard key={s} type="radio" name="siteType" value={s} label={t(`siteTypes.${s}`)} />
          ))}
        </fieldset>
        {errors.siteType && (
          <p role="alert" className="mt-3 text-small font-medium text-destructive">
            {errors.siteType}
          </p>
        )}
        <fieldset className="mt-8 flex flex-col gap-3">
          <legend className="mb-1 text-small font-medium">{t("stage")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {STAGES.map((s) => (
              <ChoiceCard key={s} type="radio" name="stage" value={s} label={t(`stages.${s}`)} />
            ))}
          </div>
        </fieldset>
        <Field id="rfq-location" className="mt-8" label={t("location")} required requiredText={f("required")} help={t("locationHelp")} error={errors.location}>
          {(d, invalid) => <input id="rfq-location" name="location" autoComplete="address-level2" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />}
        </Field>
      </section>

      {/* Step 3: size */}
      <section hidden={step !== 2} className="mt-6">
        <h2 ref={step === 2 ? headingRef : undefined} tabIndex={-1} className="text-h3 outline-none">
          {t("sizeHeading")}
        </h2>
        <p className="mt-2 text-body text-muted-foreground">{t("sizeHelp")}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {(["buildings", "floors", "area"] as const).map((k) => (
            <Field key={k} id={`rfq-${k}`} label={t(`size.${k}`)}>
              {(d) => <input id={`rfq-${k}`} name={k} type="number" min={0} inputMode="numeric" className={controlClass} aria-describedby={d} />}
            </Field>
          ))}
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {has("cctv") && <NumberField name="cameras" label={t("size.cameras")} />}
          {has("structured-cabling", "network-design") && <NumberField name="points" label={t("size.points")} />}
          {has("access-control") && <NumberField name="doors" label={t("size.doors")} />}
          {has("network-design", "unified-communications", "managed-soc", "security-awareness-training") && <NumberField name="users" label={t("size.users")} />}
          {has(...GROUPS.dataCenter) && <TextField name="racks" label={t("size.racks")} />}
          {has("resource-augmentation") && <TextField name="engineers" label={t("size.engineers")} />}
        </div>
        <Field id="rfq-files" className="mt-8" label={t("upload")} help={t("uploadHelp")} error={errors.files}>
          {(d, invalid) => (
            <input
              id="rfq-files"
              name="files"
              type="file"
              multiple
              accept=".pdf,.dwg,.docx,.xlsx,.zip"
              aria-describedby={d}
              aria-invalid={invalid || undefined}
              className="block w-full rounded-lg border border-dashed border-input bg-background p-3 text-small file:me-4 file:h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:font-medium file:text-secondary-foreground"
            />
          )}
        </Field>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="mt-6 min-h-11 text-small font-medium underline decoration-primary underline-offset-4"
        >
          {t("skip")}
        </button>
      </section>

      {/* Step 4: timeline */}
      <section hidden={step !== 3} className="mt-6">
        <h2 ref={step === 3 ? headingRef : undefined} tabIndex={-1} className="text-h3 outline-none">
          {t("timelineHeading")}
        </h2>
        <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">{t("timelineHeading")}</legend>
          {TIMELINES.map((s) => (
            <ChoiceCard key={s} type="radio" name="timeline" value={s} label={t(`timelines.${s}`)} />
          ))}
        </fieldset>
        <Field id="rfq-deadline" className="mt-8 sm:max-w-sm" label={t("deadline")} help={t("deadlineHelp")}>
          {(d) => <DateField id="rfq-deadline" name="deadline" describedBy={d} placeholder={t("deadlinePlaceholder")} clearLabel={t("clearDate")} />}
        </Field>
        {/* One tap, all options visible: replaces a native select whose list ignored the theme. */}
        <fieldset className="mt-8">
          <legend className="text-small font-medium">{t("budget")}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {BUDGETS.map((b) => (
              <ChoiceCard key={b} type="radio" name="budget" value={b} label={t(`budgets.${b}`)} />
            ))}
          </div>
        </fieldset>
        <Field id="rfq-notes" className="mt-6" label={t("notes")}>
          {(d) => <textarea id="rfq-notes" name="notes" rows={4} placeholder={t("notesPlaceholder")} className={`${controlClass} h-auto py-2.5`} aria-describedby={d} />}
        </Field>
      </section>

      {/* Step 5: contact */}
      <section hidden={step !== 4} className="mt-6">
        <h2 ref={step === 4 ? headingRef : undefined} tabIndex={-1} className="text-h3 outline-none">
          {t("contactHeading")}
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field id="rfq-name" label={t("name")} required requiredText={f("required")} error={errors.name}>
            {(d, invalid) => <input id="rfq-name" name="name" autoComplete="name" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />}
          </Field>
          <Field id="rfq-title" label={t("jobTitle")}>
            {(d) => <input id="rfq-title" name="jobTitle" autoComplete="organization-title" className={controlClass} aria-describedby={d} />}
          </Field>
          <Field id="rfq-org" label={t("organisation")} required requiredText={f("required")} error={errors.organisation}>
            {(d, invalid) => <input id="rfq-org" name="organisation" autoComplete="organization" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />}
          </Field>
          <Field id="rfq-email" label={t("email")} required requiredText={f("required")} error={errors.email}>
            {(d, invalid) => (
              <input id="rfq-email" name="email" type="email" autoComplete="email" dir="ltr" className={controlClass} aria-describedby={d} aria-invalid={invalid || undefined} />
            )}
          </Field>
          <Field id="rfq-phone" label={t("phone")} required requiredText={f("required")} error={errors.phone}>
            {(d, invalid) => (
              <div dir="ltr" className="flex">
                <span className="grid h-11 place-items-center rounded-s-lg border border-e-0 border-input bg-muted px-3 text-base text-muted-foreground tabular-nums">
                  +974
                </span>
                <input
                  id="rfq-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className={cn(controlClass, "rounded-s-none tabular-nums")}
                  aria-describedby={d}
                  aria-invalid={invalid || undefined}
                />
              </div>
            )}
          </Field>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-small font-medium">{t("preferredContact")}</legend>
            {(["phone", "whatsapp", "email"] as const).map((m) => (
              <ChoiceCard key={m} type="radio" name="preferredContact" value={m} label={t(`contactMethods.${m}`)} />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-small font-medium">{t("language")}</legend>
            {(["en", "ar"] as const).map((l) => (
              <ChoiceCard key={l} type="radio" name="language" value={l} defaultChecked={l === locale} label={<span lang={l}>{t(`languages.${l}`)}</span>} />
            ))}
          </fieldset>
        </div>
        <div className="mt-8 flex flex-col gap-5">
          <CheckLine
            id="rfq-consent"
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
          <CheckLine id="rfq-marketing" name="marketing" label={t("marketing")} />
          <Turnstile />
        </div>
      </section>

      {/* Navigation */}
      <div className="mt-10 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="xl" onClick={() => setStep(step - 1)}>
            <ArrowLeft aria-hidden data-icon="inline-start" className="rtl:-scale-x-100" />
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <Button type="button" size="xl" onClick={() => validate(step) && setStep(step + 1)}>
            {t("continue")}
            <ArrowRight aria-hidden data-icon="inline-end" className="rtl:-scale-x-100" />
          </Button>
        ) : (
          <SubmitButton pending={pending || uploading}>{mode === "quote" ? t("submitQuote") : t("submitSurvey")}</SubmitButton>
        )}
      </div>
    </form>
  );
}

function NumberField({ name, label }: { name: string; label: string }) {
  return (
    <Field id={`rfq-${name}`} label={label}>
      {(d) => <input id={`rfq-${name}`} name={name} type="number" min={0} inputMode="numeric" className={controlClass} aria-describedby={d} />}
    </Field>
  );
}

function TextField({ name, label }: { name: string; label: string }) {
  return (
    <Field id={`rfq-${name}`} label={label}>
      {(d) => <input id={`rfq-${name}`} name={name} className={controlClass} aria-describedby={d} />}
    </Field>
  );
}
