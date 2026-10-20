import { expect, LOCALES, open, PAGES, test, THEMES } from "./fixtures";

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.use({ theme });
    for (const locale of LOCALES) {
      for (const p of PAGES) {
        test(`${locale} ${p.name}`, async ({ page }) => {
          await open(page, `/${locale}${p.path}`);
          // The scroll film is a pre-rendered canvas behind the page: masked, it has its own QA page (/dev/film).
          await expect(page).toHaveScreenshot(`${locale}-${p.name}-${theme}.png`, { fullPage: true, mask: [page.locator("canvas")] });
        });
      }
    }
  });
}
