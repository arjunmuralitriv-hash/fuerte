import AxeBuilder from "@axe-core/playwright";

import { expect, LOCALES, open, PAGES, test, THEMES } from "./fixtures";

const BLOCKING = ["serious", "critical"];

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.use({ theme });
    for (const locale of LOCALES) {
      for (const p of PAGES) {
        test(`axe ${locale} ${p.name}`, async ({ page }) => {
          await open(page, `/${locale}${p.path}`);
          const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
          const blocking = violations
            .filter((v) => BLOCKING.includes(v.impact ?? ""))
            .map((v) => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map((n) => n.target.join(" ")) }));
          expect(blocking).toEqual([]);
        });
      }
    }
  });
}
