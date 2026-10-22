import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Third parties the site may load: Turnstile, and analytics/ads only after consent (components/consent).
const TURNSTILE = "https://challenges.cloudflare.com";
const ANALYTICS = "https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://c.bing.com";
const LINKEDIN = "https://snap.licdn.com https://px.ads.linkedin.com";
// Sentry's ingest host, only when a DSN is configured (instrumentation.ts). Speed Insights reports to /_vercel (self).
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const SENTRY = SENTRY_DSN ? new URL(SENTRY_DSN).origin : "";
// Cloudflare Web Analytics (cookieless, no consent needed; plan row B8): the beacon script and its report endpoint.
const CF_ANALYTICS = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN ? { script: "https://static.cloudflareinsights.com", report: "https://cloudflareinsights.com" } : null;
// RFQ files upload straight from the browser to Supabase Storage (lib/forms/uploads.ts).
const SUPABASE = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";

// Pages are statically generated, so per-request nonces aren't available: inline scripts are allowed,
// everything else is an explicit allow-list. Dev mode is left without a CSP (it needs eval).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${ANALYTICS} ${LINKEDIN}${CF_ANALYTICS ? ` ${CF_ANALYTICS.script}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${ANALYTICS} ${LINKEDIN}`,
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE} ${ANALYTICS} ${LINKEDIN}${SENTRY ? ` ${SENTRY}` : ""}${CF_ANALYTICS ? ` ${CF_ANALYTICS.report}` : ""}${SUPABASE ? ` ${SUPABASE}` : ""}`,
  `frame-src ${TURNSTILE}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  // Lets parallel dev servers use separate output folders (e.g. NEXT_DIST_DIR=.next-scene).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Inline the CSS into the HTML: the stylesheet round trip was the one thing holding back first paint (the LCP headline).
  experimental: { inlineCss: true },
  // Inlined into server and browser bundles, so the browser SDK can be dropped entirely when it is empty.
  env: { SENTRY_DSN },
  async rewrites() {
    // Markdown twins: /en.md and /en/services/cctv.md (plan section 6, GEO).
    return [
      { source: "/:locale(en|ar).md", destination: "/api/md/:locale" },
      { source: "/:locale(en|ar)/:path(.+)\.md", destination: "/api/md/:locale/:path" },
      // Open Graph cards (app/api/og), outside /api/ so crawlers that obey robots.txt can fetch them.
      { source: "/og/:locale(en|ar).png", destination: "/api/og/:locale" },
      { source: "/og/:locale(en|ar)/:path(.+)\.png", destination: "/api/og/:locale/:path" },
      // IndexNow key file (app/api/indexnow) at the site root. Hex and dashes only, so it cannot shadow llms.txt or robots.txt.
      { source: "/:key([0-9a-fA-F-]{8,128}).txt", destination: "/api/indexnow/:key" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Film frames (lib/film.ts) only change when the film is re-rendered: cache for a week, refresh in the background.
      { source: "/film/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default createNextIntlPlugin()(nextConfig);
