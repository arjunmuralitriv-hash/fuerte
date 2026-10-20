/**
 * Sentry options shared by the server and browser SDKs (instrumentation.ts, instrumentation-client.ts).
 * Errors only. Leads are personal data under the PDPPL (plan section 5), so no user info, cookies, headers,
 * query strings or request/response bodies leave the site.
 */
export const sentryOptions = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
};
