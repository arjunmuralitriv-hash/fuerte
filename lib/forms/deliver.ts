import { after } from "next/server";

/**
 * Lead delivery. Every channel is optional and configured by environment variables (.env.example):
 * - RESEND_API_KEY + LEADS_EMAIL_TO (+ LEADS_EMAIL_FROM): email to sales, with links to uploaded files; auto-reply to the sender
 * - CRM_WEBHOOK_URL: JSON copy of the lead for Zoho/HubSpot (sent after the response, so users never wait on it)
 * In production at least one channel must be configured, or the submission fails visibly instead of losing the lead.
 */

export type Lead = {
  kind: "rfq" | "data-request";
  reference: string;
  locale: string;
  subject: string;
  replyTo: string;
  fields: Record<string, string | string[]>;
  consent: { text: string; marketing: boolean; at: string };
  files: LeadFile[];
  autoReply?: { subject: string; text: string };
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

export async function deliverLead(lead: Lead) {
  const { RESEND_API_KEY, LEADS_EMAIL_TO, LEADS_EMAIL_FROM, CRM_WEBHOOK_URL } = process.env;
  const email = Boolean(RESEND_API_KEY && LEADS_EMAIL_TO && LEADS_EMAIL_FROM);

  if (!email && !CRM_WEBHOOK_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("No lead delivery channel configured");
    console.info("[lead:dev]", JSON.stringify(lead, null, 2));
    return;
  }

  if (email) {
    const files = lead.files
      .map((f) => `<li>${f.url ? `<a href="${escape(f.url)}">${escape(f.name)}</a>` : escape(f.name)}${f.size ? ` (${(f.size / 1048576).toFixed(1)} MB)` : ""}</li>`)
      .join("");
    const rows = Object.entries(lead.fields)
      .map(([k, v]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${escape(k)}</th><td>${escape(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`)
      .join("");
    await resend({
      from: LEADS_EMAIL_FROM,
      to: LEADS_EMAIL_TO!.split(","),
      reply_to: lead.replyTo,
      subject: `${lead.subject} [${lead.reference}]`,
      html: `<h2>${escape(lead.subject)}</h2><p>Reference: <b>${lead.reference}</b> · Locale: ${lead.locale}</p><table>${rows}</table>${files ? `<p>Files (links expire after 7 days):</p><ul>${files}</ul>` : ""}<p>Consent: ${escape(lead.consent.text)} (${lead.consent.at}) · Marketing: ${lead.consent.marketing ? "yes" : "no"}</p>`,
    });
  }

  after(async () => {
    if (email && lead.autoReply) {
      await resend({ from: LEADS_EMAIL_FROM, to: [lead.replyTo], subject: lead.autoReply.subject, text: lead.autoReply.text }).catch(console.error);
    }
    if (CRM_WEBHOOK_URL) {
      await fetch(CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      }).catch(console.error);
    }
  });
}
