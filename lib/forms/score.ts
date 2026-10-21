/**
 * RFQ lead score (plan row B5): a transparent 0–100 points table, so sales can see why a lead is hot. The weights are
 * a starting point to tune against real outcomes; the values match the RFQ form's choice keys (components/forms/rfq-form.tsx).
 */
const TIMELINE: Record<string, number> = { asap: 25, "1m": 20, "1-3m": 15, "3-6m": 8, "6m+": 3, planning: 0 };
const BUDGET: Record<string, number> = { gt1m: 25, "250k-1m": 20, "50-250k": 12, lt50k: 5, unsure: 5 };
// Regulated or mission-critical sites: larger scopes and formal procurement.
const PRIORITY_SITES = new Set(["government", "bank", "oilgas", "datacenter", "healthcare"]);

export type Tier = "hot" | "warm" | "cold";

export function scoreRfq(fields: Record<string, string | string[]>, files: number): { score: number; tier: Tier } {
  const one = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string) : "");
  const services = Array.isArray(fields.services) ? fields.services.length : 0;
  let score = one("mode") === "quote" ? 10 : 5;
  score += TIMELINE[one("timeline")] ?? 0;
  score += BUDGET[one("budget")] ?? 0;
  score += PRIORITY_SITES.has(one("siteType")) ? 15 : 8;
  if (files > 0) score += 10; // drawings, a BOQ or a tender: the project is defined
  if (one("deadline")) score += 5;
  score += services >= 3 ? 10 : services === 2 ? 5 : 0;
  score = Math.min(score, 100);
  return { score, tier: score >= 60 ? "hot" : score >= 35 ? "warm" : "cold" };
}
