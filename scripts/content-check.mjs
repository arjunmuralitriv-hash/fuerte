// Launch gate (plan row B1): lists every unresolved client fact the site would still show as a "to confirm" mark.
// - content/<locale>/**/*.md: [CONFIRM: …], [PLACEHOLDER: …], [EMAIL], [CR NUMBER] (same pattern as lib/content/prepare.ts)
// - lib/site.ts: company facts still null, which the footer and contact page show as marks
// Usage: npm run content:check            lists them and fails if any remain
//        node scripts/content-check.mjs --launch   (in `npm run build`) fails only when CONTENT_GATE=on, which is set
//        in Vercel at launch; until then production deploys build, with the marks hidden (components/content/markdown.tsx)
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER = /\[(?:CONFIRM|PLACEHOLDER)(?:[^[\]]|\[[^[\]]*\])*\]|\[EMAIL\]|\[CR NUMBER\]/g;
const NULL_FACT = /^\s*(\w+): null as /;

const found = [];
const scan = (file, test) =>
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => test(line).forEach((what) => found.push(`${relative(root, file)}:${i + 1}  ${what}`)));

for (const entry of readdirSync(join(root, "content"), { recursive: true, withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".md")) scan(join(entry.parentPath, entry.name), (line) => line.match(PLACEHOLDER) ?? []);
}
scan(join(root, "lib/site.ts"), (line) => {
  const m = line.match(NULL_FACT);
  return m ? [`SITE.${m[1]} is not set`] : [];
});

const launch = process.argv.includes("--launch");
if (launch && process.env.CONTENT_GATE !== "on") {
  if (found.length) console.log(`content:check: ${found.length} unresolved marker(s); allowed until CONTENT_GATE=on (npm run content:check lists them).`);
} else if (found.length) {
  console.error(`${found.join("\n")}\n\ncontent:check: ${found.length} unresolved marker(s). Resolve them before launch (docs/content-placeholders.md).`);
  process.exitCode = 1;
} else console.log("content:check: no unresolved markers.");
