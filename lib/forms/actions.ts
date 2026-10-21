"use server";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";
import { getPage, PILLARS } from "@/lib/content";
import { deliverLead, makeReference, verifyTurnstile, type LeadFile } from "@/lib/forms/deliver";
import { scoreRfq } from "@/lib/forms/score";
import { FILE_TYPES, MAX_FILE, MAX_FILES, promoteUploads, uploadsConfigured, uploadTargets, type UploadTarget } from "@/lib/forms/uploads";

export type FormState =
  | { status: "idle" }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "failed" }
  | { status: "success"; reference: string; name: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function validPhone(raw: string) {
  const digits = raw.replace(/[\s()-]/g, "");
  return /^\d{8}$/.test(digits) || /^(\+|00)\d{9,15}$/.test(digits);
}

async function setup(fd: FormData, given?: string) {
  const raw = given ?? str(fd, "locale");
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "forms.errors" });
  return { locale, t };
}

export type UploadPlan = { status: "ready"; targets: UploadTarget[] } | { status: "local" } | { status: "invalid"; error: string } | { status: "failed" };

/** Step one of an RFQ with files: upload links for the browser (lib/forms/uploads.ts). Locally, without storage, files are only named. */
export async function prepareUploads(locale: string, files: { name: string; size: number }[]): Promise<UploadPlan> {
  const { t } = await setup(new FormData(), locale);
  if (files.length > MAX_FILES) return { status: "failed" };
  if (files.some((f) => f.size > MAX_FILE)) return { status: "invalid", error: t("fileSize") };
  if (files.some((f) => !FILE_TYPES.test(f.name))) return { status: "invalid", error: t("fileType") };
  if (!uploadsConfigured()) return process.env.NODE_ENV === "production" ? { status: "failed" } : { status: "local" };
  try {
    return { status: "ready", targets: await uploadTargets(files.map((f) => f.name)) };
  } catch (error) {
    console.error("[rfq] upload links failed", error);
    return { status: "failed" };
  }
}

/** The "uploads" field: [{ path, name }] after an upload, or [{ name }] when storage is not configured (local dev). */
function parseUploads(raw: string): { path?: string; name: string }[] {
  try {
    const list = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(list) ? list.slice(0, MAX_FILES).filter((u) => typeof u?.name === "string") : [];
  } catch {
    return [];
  }
}

const SOURCE_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer", "landing"];

/** The "source" field (components/layout/source-capture.tsx): known keys only, short strings only. */
function parseSource(raw: string) {
  try {
    const data = JSON.parse(raw || "{}") as Record<string, unknown>;
    const source = Object.fromEntries(SOURCE_KEYS.filter((k) => typeof data[k] === "string" && data[k]).map((k) => [k, (data[k] as string).slice(0, 200)]));
    return Object.keys(source).length ? source : undefined;
  } catch {
    return undefined;
  }
}

/** Pillars of the chosen services (a pillar key itself, or a sub-service's front-matter pillar), for routing. */
function pillarsOf(locale: Locale, services: string[]) {
  const set = new Set<string>();
  for (const s of services) {
    const pillar = (PILLARS as readonly string[]).includes(s) ? s : getPage(locale, `/services/${s}`)?.fm.pillar;
    if (pillar) set.add(pillar);
  }
  return [...set];
}

export async function submitRfq(_prev: FormState, fd: FormData): Promise<FormState> {
  const { locale, t } = await setup(fd);
  const errors: Record<string, string> = {};
  const services = fd.getAll("services").map(String);
  const uploads = parseUploads(str(fd, "uploads"));

  if (!services.length) errors.services = t("services");
  if (!str(fd, "siteType")) errors.siteType = t("siteType");
  if (!str(fd, "location")) errors.location = t("location");
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
  // The auto-reply goes out in the language the visitor chose on the form, which can differ from the page's.
  const replyLocale = hasLocale(routing.locales, str(fd, "language")) ? str(fd, "language") : locale;
  const reply = await getTranslations({ locale: replyLocale, namespace: "rfq" });
  let files: LeadFile[] = uploads.map((u) => ({ name: u.name }));
  if (uploadsConfigured() && uploads.length) {
    const stored = await promoteUploads(reference, uploads.map((u) => ({ path: u.path ?? "", name: u.name }))).catch((error) => {
      console.error("[rfq] upload check failed", reference, error);
      return undefined;
    });
    if (stored === null) return { status: "invalid", errors: { files: t("fileSize") } };
    if (!stored) return { status: "failed" };
    files = stored;
  }
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
        subject: `${reply("successTitle", { name })} (${reference})`,
        text: `${reply("successBody", { reference, email })}\n\n${reply("nextTitle")}:\n1. ${reply("next1")}\n2. ${reply("next2")}\n3. ${reply("next3")}\n\nFuerte Technologies & Contracting Services · +974 7125 8588`,
      },
      triage: { ...scoreRfq(fields, files.length), pillars: pillarsOf(locale, services) },
      source: parseSource(str(fd, "source")),
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
