import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Launch quality gates (plan row B9): visual snapshots and axe on the production build.
 * Baselines are per platform (the `-win32` suffix); refresh with `npm run test:e2e -- --update-snapshots`.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 20_000, toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "hide" } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Shows reveal copy at once and the film's beat stills only, so every run renders the same page.
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: "768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
  },
});
