import type { Lead } from "@/lib/forms/deliver";
import type { Tier } from "@/lib/forms/score";
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
  // B5 columns (supabase/migrations/20261021000000_lead_triage.sql)
  score: number | null;
  tier: string | null;
  pillars: string[];
  source: Lead["source"] | null;
};

const leads = () => supabase().from("leads");

export async function storeLead(lead: Lead) {
  const row: Row = {
    reference: lead.reference,
    kind: lead.kind,
    locale: lead.locale,
    subject: lead.subject,
    email: lead.replyTo,
    fields: lead.fields,
    files: lead.files,
    consent: lead.consent,
    score: lead.triage?.score ?? null,
    tier: lead.triage?.tier ?? null,
    pillars: lead.triage?.pillars ?? [],
    source: lead.source ?? null,
  };
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
    .select("reference, kind, locale, subject, email, fields, files, consent, score, tier, pillars, source")
    .is(column, null)
    .lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(50);
  if (error) throw error;
  return (data as Row[]).map(
    (r): Lead => ({
      kind: r.kind,
      reference: r.reference,
      locale: r.locale,
      subject: r.subject,
      replyTo: r.email,
      fields: r.fields,
      files: r.files,
      consent: r.consent,
      ...(r.score !== null ? { triage: { score: r.score, tier: r.tier as Tier, pillars: r.pillars } } : {}),
      ...(r.source ? { source: r.source } : {}),
    }),
  );
}

const monthsAgo = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

/** Retention (plan section 5): applications after 12 months, other leads after 24, with their files; uploads never submitted. */
export async function purgeExpired(bucket: string) {
  const applications = await leads().delete({ count: "exact" }).eq("kind", "careers").lt("created_at", monthsAgo(12));
  if (applications.error) throw applications.error;
  const others = await leads().delete({ count: "exact" }).neq("kind", "careers").lt("created_at", monthsAgo(24));
  if (others.error) throw others.error;
  const count = (applications.count ?? 0) + (others.count ?? 0);

  const files = await supabase().rpc("expired_lead_files", { bucket });
  if (files.error) throw files.error;
  const names = (files.data as { name: string }[]).map((f) => f.name);
  if (names.length) {
    const removed = await supabase().storage.from(bucket).remove(names);
    if (removed.error) throw removed.error;
  }
  return { leads: count, files: names.length };
}
