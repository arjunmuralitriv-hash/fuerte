import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Third parties the site may load: Turnstile, and analytics/ads only after consent (components/consent).
const TURNSTILE = "https://challenges.cloudflare.com";
const ANALYTICS = "https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://c.bing.com";
const LINKEDIN = "https://snap.licdn.com https://px.ads.linkedin.com";
// Sentry's ingest host, only when a DSN is configured (instrumentation.ts). Speed Insights reports to /_vercel (self).
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const SENTRY = SENTRY_DSN ? new URL(SENTRY_DSN).origin : "";

// Pages are statically generated, so per-request nonces aren't available: inline scripts are allowed,
// everything else is an explicit allow-list. Dev mode is left without a CSP (it needs eval).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${ANALYTICS} ${LINKEDIN}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${ANALYTICS} ${LINKEDIN}`,
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE} ${ANALYTICS} ${LINKEDIN}${SENTRY ? ` ${SENTRY}` : ""}`,
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
  // Inlined into server and browser bundles, so the browser SDK can be dropped entirely when it is empty.
  env: { SENTRY_DSN },
  experimental: {
    // RFQ uploads: up to 25 MB per file (lib/forms/actions.ts), plus form fields.
    serverActions: { bodySizeLimit: "26mb" },
  },
  async rewrites() {
    // Markdown twins: /en.md and /en/services/cctv.md (plan section 6, GEO).
    return [
      { source: "/:locale(en|ar).md", destination: "/api/md/:locale" },
      { source: "/:locale(en|ar)/:path(.+)\.md", destination: "/api/md/:locale/:path" },
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
