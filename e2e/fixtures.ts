import { test as base, type Page } from "@playwright/test";

import { CONSENT_COOKIE } from "../lib/consent";

export const LOCALES = ["en", "ar"] as const;
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Home, a service page, contact and a legal page (plan row B9). */
export const PAGES = [
  { name: "home", path: "" },
  { name: "service", path: "/services/elv" },
  { name: "contact", path: "/contact" },
  { name: "legal", path: "/legal/privacy" },
] as const;

/** A consent choice is on file, so the cookie banner stays hidden. */
export const test = base.extend<{ theme: Theme }>({
  theme: ["light", { option: true }],
  context: async ({ context, baseURL }, run) => {
    const value = encodeURIComponent(JSON.stringify({ analytics: false, marketing: false, at: "2026-01-01T00:00:00.000Z" }));
    await context.addCookies([{ name: CONSENT_COOKIE, value, url: baseURL! }]);
    await run(context);
  },
  page: async ({ page, theme }, run) => {
    // next-themes reads localStorage "theme" before first paint.
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.emulateMedia({ colorScheme: theme });
    await run(page);
  },
});

export { expect } from "@playwright/test";

/** Loads a page and waits until it is settled: fonts, lazy images below the fold, then back to the top. */
export async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => (i.onload = i.onerror = r)))));
}
