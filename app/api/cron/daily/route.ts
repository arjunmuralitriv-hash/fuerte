import { retryUnsynced } from "@/lib/forms/deliver";
import { purgeExpired } from "@/lib/forms/leads";
import { supabaseConfigured } from "@/lib/supabase";

/**
 * Daily job (vercel.json): retries leads that email or the CRM missed, applies the 24-month retention to leads and
 * RFQ files, and clears uploads never submitted. Its database query also keeps a Free-plan Supabase project active.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!supabaseConfigured()) return Response.json({ skipped: "Supabase not configured" });
  const retried = await retryUnsynced();
  const purged = await purgeExpired(process.env.SUPABASE_BUCKET ?? "rfq-files");
  console.info("[cron:daily]", { retried, purged });
  return Response.json({ retried, purged });
}
