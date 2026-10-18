import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const securityHeaders = [
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default createNextIntlPlugin()(nextConfig);
