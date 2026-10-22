import { after } from "next/server";

import { markLead, storeLead, unsyncedLeads } from "@/lib/forms/leads";
import type { Tier } from "@/lib/forms/score";
import { supabaseConfigured } from "@/lib/supabase";

/**
 * Lead delivery. Every channel is optional and configured by environment variables (.env.example):
 * - SUPABASE_URL + SUPABASE_KEY: the leads table, written first (lib/forms/leads.ts)
 * - RESEND_API_KEY + LEADS_EMAIL_TO (+ LEADS_EMAIL_FROM): email to sales, with links to uploaded files; auto-reply to the sender
 * - LEADS_ROUTES (optional): JSON of pillar → extra recipients, e.g. {"elv":"elv@…","cyber-security":"soc@…"}, added to
 *   LEADS_EMAIL_TO for leads that name a service in that pillar
 * - CRM_WEBHOOK_URL: JSON copy of the lead for Zoho/HubSpot (sent after the response, so users never wait on it)
 * In production at least one channel must be configured, or the submission fails visibly instead of losing the lead.
 */

export type Lead = {
  kind: "rfq" | "data-request" | "careers" | "vendor-pack";
  reference: string;
  locale: string;
  subject: string;
  replyTo: string;
  fields: Record<string, string | string[]>;
  consent: { text: string; marketing: boolean; at: string };
  files: LeadFile[];
  autoReply?: { subject: string; text: string };
  /** RFQs only: score and tier (lib/forms/score.ts) and the pillars its services belong to, for routing. */
  triage?: { score: number; tier: Tier; pillars: string[] };
  /** First-touch campaign data captured on landing (components/layout/source-capture.tsx). */
  source?: Record<string, string>;
};

/** An RFQ upload: stored files carry a time-limited read link (lib/forms/uploads.ts); locally only the name is known. */
export type LeadFile = { name: string; size?: number; url?: string };

export function makeReference(prefix: string) {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function verifyTurnstile(token: FormDataEntryValue | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured yet (requirements checklist, section 7).
  if (typeof token !== "string" || !token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  return ((await res.json()) as { success?: boolean }).success === true;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function resend(body: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const channels = () => {
  const { RESEND_API_KEY, LEADS_EMAIL_TO, LEADS_EMAIL_FROM, CRM_WEBHOOK_URL } = process.env;
  return { email: Boolean(RESEND_API_KEY && LEADS_EMAIL_TO && LEADS_EMAIL_FROM), crm: Boolean(CRM_WEBHOOK_URL), store: supabaseConfigured() };
};

/** LEADS_EMAIL_TO plus the engineers LEADS_ROUTES names for the lead's pillars; applications go to CAREERS_EMAIL_TO only, when set. */
function recipients(lead: Lead) {
  if (lead.kind === "careers" && process.env.CAREERS_EMAIL_TO) return process.env.CAREERS_EMAIL_TO.split(",").map((s) => s.trim());
  const to = new Set(process.env.LEADS_EMAIL_TO!.split(",").map((s) => s.trim()));
  try {
    const routes = JSON.parse(process.env.LEADS_ROUTES || "{}") as Record<string, string>;
    for (const pillar of lead.triage?.pillars ?? []) for (const r of (routes[pillar] ?? "").split(",")) if (r.trim()) to.add(r.trim());
  } catch {
    console.error("[lead] LEADS_ROUTES is not valid JSON");
  }
  return [...to].filter(Boolean);
}

export async function sendSalesEmail(lead: Lead) {
  const files = lead.files
    .map((f) => `<li>${f.url ? `<a href="${escape(f.url)}">${escape(f.name)}</a>` : escape(f.name)}${f.size ? ` (${(f.size / 1048576).toFixed(1)} MB)` : ""}</li>`)
    .join("");
  const rows = Object.entries(lead.fields)
    .map(([k, v]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${escape(k)}</th><td>${escape(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`)
    .join("");
  await resend({
    from: process.env.LEADS_EMAIL_FROM,
    to: recipients(lead),
    reply_to: lead.replyTo,
    subject: `${lead.triage ? `[${lead.triage.tier.toUpperCase()} ${lead.triage.score}] ` : ""}${lead.subject} [${lead.reference}]`,
    html: `<h2>${escape(lead.subject)}</h2><p>Reference: <b>${lead.reference}</b> · Locale: ${lead.locale}</p>${lead.source ? `<p>Source: ${escape(Object.entries(lead.source).map(([k, v]) => `${k}=${v}`).join(" · "))}</p>` : ""}<table>${rows}</table>${files ? `<p>Files (links expire after 7 days):</p><ul>${files}</ul>` : ""}<p>Consent: ${escape(lead.consent.text)} (${lead.consent.at}) · Marketing: ${lead.consent.marketing ? "yes" : "no"}</p>`,
  });
}

export async function sendToCrm(lead: Lead) {
  const res = await fetch(process.env.CRM_WEBHOOK_URL!, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  if (!res.ok) throw new Error(`CRM webhook ${res.status}`);
}

/**
 * Stores the lead first (lib/forms/leads.ts), then emails sales and syncs the CRM. Once stored, a failed email or
 * webhook no longer fails the visitor's submission: the error is recorded and the daily job (app/api/cron/daily)
 * retries. Without storage, the sales email must succeed, as before.
 */
export async function deliverLead(lead: Lead) {
  const { email, crm, store } = channels();
  const stored =
    store &&
    (await storeLead(lead).then(
      () => true,
      (error) => {
        console.error("[lead] store failed", lead.reference, error);
        return false;
      },
    ));

  if (!stored && !email && !crm) {
    if (process.env.NODE_ENV === "production") throw new Error("No lead delivery channel configured");
    console.info("[lead:dev]", JSON.stringify(lead, null, 2));
    return;
  }

  if (email) {
    try {
      await sendSalesEmail(lead);
      if (stored) await markLead(lead.reference, { emailed_at: new Date().toISOString() });
    } catch (error) {
      if (!stored) throw error;
      console.error("[lead] email failed, will retry", lead.reference, error);
      await markLead(lead.reference, { last_error: String(error) });
    }
  }

  after(async () => {
    if (email && lead.autoReply) {
      await resend({ from: process.env.LEADS_EMAIL_FROM, to: [lead.replyTo], subject: lead.autoReply.subject, text: lead.autoReply.text }).catch(console.error);
    }
    if (!crm) return;
    try {
      await sendToCrm(lead);
      if (stored) await markLead(lead.reference, { crm_synced_at: new Date().toISOString() });
    } catch (error) {
      console.error("[lead] CRM sync failed", lead.reference, error);
      if (stored) await markLead(lead.reference, { last_error: String(error) });
    }
  });
}

/** Daily job: retries leads that email or the CRM has not taken yet. Leads stored with a channel unset are skipped. */
export async function retryUnsynced() {
  const { email, crm } = channels();
  let retried = 0;
  for (const [on, column, send] of [
    [email, "emailed_at", sendSalesEmail],
    [crm, "crm_synced_at", sendToCrm],
  ] as const) {
    if (!on) continue;
    for (const lead of await unsyncedLeads(column)) {
      await send(lead).then(
        () => markLead(lead.reference, { [column]: new Date().toISOString(), last_error: null }),
        (error) => markLead(lead.reference, { last_error: String(error) }),
      );
      retried++;
    }
  }
  return retried;
}
