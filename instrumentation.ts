import type { Instrumentation } from "next";

import { sentryOptions } from "@/lib/sentry";

// Error monitoring (plan row B9). Off unless SENTRY_DSN is set at build time (next.config.ts): no SDK is loaded.
export async function register() {
  if (!sentryOptions.dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions);
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!sentryOptions.dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
