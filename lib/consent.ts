/**
 * Cookie consent (PDPPL, plan section 5): non-essential categories are off until the visitor opts in.
 * The choice itself is stored in an essential first-party cookie for 180 days.
 */
export type Consent = { analytics: boolean; marketing: boolean; at: string };

export const CONSENT_COOKIE = "fuerte_consent";
export const OPEN_CONSENT_EVENT = "fuerte:open-consent";
const MAX_AGE = 60 * 60 * 24 * 180;

/** Cookies set by the optional tools, removed when consent for them is withdrawn. */
const TRACKER_COOKIES: Record<keyof Omit<Consent, "at">, RegExp> = {
  analytics: /^(_ga|_gid|_gat|_clck|_clsk|CLID|MUID)/,
  marketing: /^(li_|lidc|bcookie|bscookie|UserMatchHistory|AnalyticsSyncHistory)/,
};

export function readConsent(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)));
    return { analytics: value.analytics === true, marketing: value.marketing === true, at: String(value.at) };
  } catch {
    return null;
  }
}

export function writeConsent(choice: Omit<Consent, "at">): Consent {
  const previous = readConsent();
  const consent = { ...choice, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;

  const withdrawn = (Object.keys(TRACKER_COOKIES) as (keyof typeof TRACKER_COOKIES)[]).filter((k) => previous?.[k] && !choice[k]);
  if (withdrawn.length) {
    for (const name of document.cookie.split("; ").map((c) => c.split("=")[0])) {
      if (withdrawn.some((k) => TRACKER_COOKIES[k].test(name))) {
        document.cookie = `${name}=; Max-Age=0; Path=/`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname.replace(/^www\./, "")}`;
      }
    }
    // Scripts already running can't be unloaded; a reload guarantees they stop.
    location.reload();
  }
  return consent;
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
