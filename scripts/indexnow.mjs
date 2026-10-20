// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver…) which pages changed, after a deploy.
// Changed pages come from git: content/<locale>/**.md files changed since a ref, mapped to their URLs
// through front-matter `slug` and kept only if the live sitemap lists them. --all sends the whole sitemap.
//
// Dry run by default; --submit sends. Needs INDEXNOW_KEY (served at /{key}.txt) and the site URL:
//   node --env-file=.env.local scripts/indexnow.mjs --since <last-deployed-commit>
//   node --env-file=.env.local scripts/indexnow.mjs --since HEAD~1 --submit
//   node --env-file=.env.local scripts/indexnow.mjs --all --submit
// --site overrides NEXT_PUBLIC_SITE_URL; --sitemap reads the sitemap from elsewhere (e.g. a local `npm start`).
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { values: args } = parseArgs({
  options: { since: { type: "string" }, all: { type: "boolean" }, submit: { type: "boolean" }, site: { type: "string" }, sitemap: { type: "string" } },
});
const site = new URL(args.site ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fuertetechnologies.com");
const key = process.env.INDEXNOW_KEY;
if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) fail("Set INDEXNOW_KEY (8–128 letters, digits or dashes).");
if (!args.all && !args.since) fail("Pass --since <git ref> (pages changed since then) or --all.");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" });

/** URL of a content file at a revision, from its front-matter slug. */
function urlOf(file, rev) {
  const slug = git("show", `${rev}:${file}`).match(/^slug:\s*"?([^"\r\n]+)"?/m)?.[1];
  const locale = file.split("/")[1];
  return slug ? new URL(`/${locale}${slug === "/" ? "" : slug}`, site).toString() : undefined;
}

/** Pages whose content file changed between `since` and HEAD. */
function changedPages(since) {
  const lines = git("diff", "--name-status", "--no-renames", since, "HEAD", "--", "content/").split("\n").filter(Boolean);
  return lines.flatMap((line) => {
    const [status, file] = line.split("\t");
    if (!/^content\/(en|ar)\/.+\.md$/.test(file)) return [];
    const deleted = status === "D";
    const url = urlOf(file, deleted ? since : "HEAD");
    return url ? [{ url, deleted }] : [];
  });
}

// Normal paths return instead of calling process.exit(), which can abort on Windows while a fetch socket is still open.
async function main() {
  const sitemap = await fetch(args.sitemap ?? new URL("/sitemap.xml", site)).then((r) => (r.ok ? r.text() : fail(`sitemap.xml: HTTP ${r.status}`)));
  const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  // Changed pages must be live (in the sitemap); a deleted page is sent too, so engines re-crawl it and drop it.
  const urlList = args.all
    ? [...listed]
    : [...new Set(changedPages(args.since).filter((p) => p.deleted || listed.has(p.url)).map((p) => p.url))];

  if (!urlList.length) {
    console.log("Nothing to send.");
    return;
  }
  const body = { host: site.host, key, keyLocation: new URL(`/${key}.txt`, site).toString(), urlList: urlList.slice(0, 10000) };
  console.log(`${urlList.length} URL(s):\n${urlList.join("\n")}`);

  if (!args.submit) {
    console.log("\nDry run. Add --submit to send to", ENDPOINT);
    return;
  }

  // The engines verify the key at keyLocation; check it first so a key missing on the host fails here, not silently.
  const served = await fetch(body.keyLocation).then((r) => (r.ok ? r.text() : ""));
  if (served.trim() !== key) fail(`${body.keyLocation} does not serve the key. Set INDEXNOW_KEY on the host and redeploy.`);

  const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
  // 200 OK and 202 Accepted are success; 403 = key not valid, 422 = URLs not on this host, 429 = too many requests.
  console.log(`IndexNow: HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) process.exitCode = 1;
}

await main();
