"use client";

import { useEffect } from "react";

/** sessionStorage key for the first-touch source, read by the RFQ form (components/forms/rfq-form.tsx). */
export const SOURCE_KEY = "fuerte_source";

/**
 * First-touch campaign data for lead attribution (plan row B5; privacy notice section 2, "Campaign data"): the UTM
 * tags, the referring site and the landing page, kept for this browser tab only. No cookie, no ad click IDs.
 */
export function SourceCapture() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SOURCE_KEY)) return;
      const params = new URLSearchParams(location.search);
      const source: Record<string, string> = { landing: location.pathname };
      for (const [k, v] of params) if (k.startsWith("utm_") && v) source[k] = v;
      const referrer = document.referrer ? new URL(document.referrer).host : "";
      if (referrer && referrer !== location.host) source.referrer = referrer;
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(source));
    } catch {
      // Storage blocked (private mode, settings): the lead simply arrives without a source.
    }
  }, []);
  return null;
}
