import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client (project in Mumbai, ap-south-1; docs/supabase-setup.md). It uses the secret key, which
 * bypasses row-level security, so it must never reach the browser: nothing here is NEXT_PUBLIC_.
 */
const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;

export const supabaseConfigured = () => Boolean(url && key);

let client: SupabaseClient | undefined;
export function supabase() {
  client ??= createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
