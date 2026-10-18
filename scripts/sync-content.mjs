// Copies the approved Markdown drafts into the repo so the site builds without the drafts folder.
// Usage: npm run content:sync -- en ar   (defaults to both locales)
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drafts = join(root, "..", "content-drafts");
const locales = process.argv.slice(2).length ? process.argv.slice(2) : ["en", "ar"];

for (const locale of locales) {
  const from = join(drafts, locale);
  const to = join(root, "content", locale);
  if (!existsSync(from)) {
    console.warn(`skip ${locale}: ${from} not found`);
    continue;
  }
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith("README.md") });
  console.log(`synced ${locale} → content/${locale}`);
}
