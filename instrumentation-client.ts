import { sentryOptions } from "@/lib/sentry";

// Browser error monitoring. SENTRY_DSN is inlined at build time (next.config.ts); when it is empty this branch is
// dropped and the SDK chunk is never requested.
if (process.env.SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => Sentry.init(sentryOptions));
}
