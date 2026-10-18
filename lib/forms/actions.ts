"use server";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { deliverLead, makeReference, verifyTurnstile } from "@/lib/forms/deliver";

export type FormState =
  | { status: "idle" }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "failed" }
  | { status: "success"; reference: string; name: string; email: string };

const MAX_FILE = 25 * 1024 * 1024;
const FILE_TYPES = /\.(pdf|dwg|docx|xlsx|zip)$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function validPhone(raw: string) {
  const digits = raw.replace(/[\s()-]/g, "");
  return /^\d{8}$/.test(digits) || /^(\+|00)\d{9,15}$/.test(digits);
}

async function setup(fd: FormData) {
  const raw = str(fd, "locale");
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "forms.errors" });
  return { locale, t };
}

export async function submitRfq(_prev: FormState, fd: FormData): Promise<FormState> {
  const { locale, t } = await setup(fd);
  const errors: Record<string, string> = {};
  const services = fd.getAll("services").map(String);
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!services.length) errors.services = t("services");
  if (!str(fd, "siteType")) errors.siteType = t("siteType");
  if (!str(fd, "location")) errors.location = t("location");
  if (files.some((f) => f.size > MAX_FILE)) errors.files = t("fileSize");
  else if (files.some((f) => !FILE_TYPES.test(f.name))) errors.files = t("fileType");
  if (!str(fd, "name")) errors.name = t("name");
  if (!str(fd, "organisation")) errors.organisation = t("organisation");
  if (!EMAIL.test(str(fd, "email"))) errors.email = t("email");
  if (!validPhone(str(fd, "phone"))) errors.phone = t("phone");
  if (fd.get("consent") !== "on") errors.consent = t("consent");
  if (Object.keys(errors).length) return { status: "invalid", errors };
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return { status: "invalid", errors: { form: t("spam") } };

  const reference = makeReference("FT");
  const name = str(fd, "name");
  const email = str(fd, "email");
  const mode = str(fd, "mode") === "quote" ? "Quote request" : "Site survey booking";
  const keys = ["mode", "serviceOther", "siteType", "stage", "location", "buildings", "floors", "area", "cameras", "points", "doors", "users", "racks", "engineers", "timeline", "deadline", "budget", "notes", "name", "jobTitle", "organisation", "email", "phone", "preferredContact", "language"];
  const fields: Record<string, string | string[]> = { services };
  for (const k of keys) if (str(fd, k)) fields[k] = str(fd, k);

  const tr = await getTranslations({ locale, namespace: "rfq" });
  try {
    await deliverLead({
      kind: "rfq",
      reference,
      locale,
      subject: `${mode}: ${str(fd, "organisation")}`,
      replyTo: email,
      fields,
      files,
      consent: { text: tr.markup("consent", { privacy: (chunks) => chunks }), marketing: fd.get("marketing") === "on", at: new Date().toISOString() },
      autoReply: {
        subject: `${tr("successTitle", { name })} (${reference})`,
        text: `${tr("successBody", { reference, email })}\n\n${tr("nextTitle")}:\n1. ${tr("next1")}\n2. ${tr("next2")}\n3. ${tr("next3")}\n\nFuerte Technologies & Contracting Services · +974 7125 8588`,
      },
    });
  } catch (error) {
    console.error("[rfq] delivery failed", reference, error);
    return { status: "failed" };
  }
  return { status: "success", reference, name: name.split(" ")[0], email };
}

export async function submitDataRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const { locale, t } = await setup(fd);
  const errors: Record<string, string> = {};
  if (!str(fd, "action")) errors.action = t("required");
  if (!str(fd, "name")) errors.name = t("name");
  if (!EMAIL.test(str(fd, "email"))) errors.email = t("email");
  if (!str(fd, "details")) errors.details = t("required");
  if (fd.get("declaration") !== "on") errors.declaration = t("declaration");
  if (Object.keys(errors).length) return { status: "invalid", errors };
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")))) return { status: "invalid", errors: { form: t("spam") } };

  const reference = makeReference("DR");
  const email = str(fd, "email");
  const fields: Record<string, string> = {};
  for (const k of ["action", "name", "email", "phone", "relationship", "details", "onBehalf"]) if (str(fd, k)) fields[k] = str(fd, k);
  const td = await getTranslations({ locale, namespace: "dataRequest" });
  try {
    await deliverLead({
      kind: "data-request",
      reference,
      locale,
      subject: `PDPPL data request: ${fields.action}`,
      replyTo: email,
      fields,
      files: [],
      consent: { text: td("declaration"), marketing: false, at: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[data-request] delivery failed", reference, error);
    return { status: "failed" };
  }
  return { status: "success", reference, name: str(fd, "name").split(" ")[0], email };
}
