import type { Lead } from "@/lib/forms/deliver";
import { supabase } from "@/lib/supabase";

/** Lead storage (plan row B4): the leads table in supabase/migrations, written first so no lead depends on email or the CRM. */

type Row = {
  reference: string;
  kind: Lead["kind"];
  locale: string;
  subject: string;
  email: string;
  fields: Lead["fields"];
  files: Lead["files"];
  consent: Lead["consent"];
};

const leads = () => supabase().from("leads");

export async function storeLead(lead: Lead) {
  const row: Row = { reference: lead.reference, kind: lead.kind, locale: lead.locale, subject: lead.subject, email: lead.replyTo, fields: lead.fields, files: lead.files, consent: lead.consent };
  const { error } = await leads().insert(row);
  if (error) throw error;
}

export async function markLead(reference: string, patch: { emailed_at?: string; crm_synced_at?: string; last_error?: string | null }) {
  const { error } = await leads().update(patch).eq("reference", reference);
  if (error) console.error("[lead] mark failed", reference, error);
}

/** Leads at least 10 minutes old that email or the CRM has not taken yet, rebuilt for another delivery attempt. */
export async function unsyncedLeads(column: "emailed_at" | "crm_synced_at") {
  const { data, error } = await leads()
    .select("reference, kind, locale, subject, email, fields, files, consent")
    .is(column, null)
    .lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(50);
  if (error) throw error;
  return (data as Row[]).map((r): Lead => ({ kind: r.kind, reference: r.reference, locale: r.locale, subject: r.subject, replyTo: r.email, fields: r.fields, files: r.files, consent: r.consent }));
}

/** 24-month retention (plan section 5): deletes old leads and their files, and uploads never submitted. */
export async function purgeExpired(bucket: string) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);
  const { count, error } = await leads().delete({ count: "exact" }).lt("created_at", cutoff.toISOString());
  if (error) throw error;

  const files = await supabase().rpc("expired_lead_files", { bucket });
  if (files.error) throw files.error;
  const names = (files.data as { name: string }[]).map((f) => f.name);
  if (names.length) {
    const removed = await supabase().storage.from(bucket).remove(names);
    if (removed.error) throw removed.error;
  }
  return { leads: count ?? 0, files: names.length };
}
