import type { Locale } from "@/i18n/routing";
import { getAllSlugs, getPage, getSource } from "@/lib/content";
import { getHome } from "@/lib/content/home";
import { absoluteUrl, localePath } from "@/lib/seo";
import { SITE } from "@/lib/site";

const PLACEHOLDER = /\s*\[(?:CONFIRM|PLACEHOLDER)(?:[^[\]]|\[[^[\]]*\])*\]|\s*\[EMAIL\]|\s*\[CR NUMBER\]/g;
const CTA_SPEC = /^- \*\*(Primary CTA|Secondary CTA|Tertiary link|الدعوة الرئيسية|الدعوة الثانوية|رابط إضافي):\*\*.*\n?/gm;

/** Public URL of a page's Markdown twin: /en/services/cctv.md, /en.md for home. */
export const twinPath = (locale: Locale, slug: string) => `${localePath(locale, slug)}.md`;

/**
 * Clean Markdown for answer engines (plan section 6, GEO). Draft notes and unconfirmed
 * placeholders are removed, so only statements Fuerte stands behind are published.
 */
export function markdownTwin(locale: Locale, slug: string) {
  const source = getSource(locale, slug);
  if (!source) return undefined;
  const body = (slug === "/" ? homeText(locale) : source.text).replace(PLACEHOLDER, "").replace(CTA_SPEC, "").replace(/\n{3,}/g, "\n\n");
  const fm = [`title: ${JSON.stringify(source.fm.metaTitle)}`, `description: ${JSON.stringify(source.fm.metaDescription)}`, `url: ${absoluteUrl(localePath(locale, slug))}`, `language: ${source.contentLocale}`];
  return `---\n${fm.join("\n")}\n---\n\n${body}\n`;
}

/** The home draft is a scroll-story spec; publish only its copy, in reading order. */
function homeText(locale: Locale) {
  const home = getHome(locale)!;
  return [
    `# ${home.hero.title}`,
    home.hero.body,
    ...home.beats.map((b) => `## ${b.title}\n\n${b.body}`),
    ...home.extras.map((e) => `## ${e.title}\n\n${e.body}`),
    home.facts.map((f) => `- **${f.label}:** ${f.value}`).join("\n"),
  ].join("\n\n");
}

const GROUPS: [string, (slug: string) => boolean][] = [
  ["Services", (s) => s.startsWith("/services")],
  ["Industries", (s) => s.startsWith("/industries")],
  ["Guides", (s) => s.startsWith("/insights")],
  ["Company", (s) => !/^\/(services|industries|insights|legal)/.test(s) && s !== "/"],
  ["Legal", (s) => s.startsWith("/legal")],
];

/** /llms.txt (llmstxt.org): a short map of the site pointing at the Markdown twins. */
export function llmsIndex(locale: Locale = "en") {
  const slugs = getAllSlugs();
  const home = getPage(locale, "/");
  const lines = [
    "# Fuerte Technologies & Contracting Services",
    "",
    `> ${home?.fm.metaDescription ?? ""} Based in Doha, Qatar. Phone ${SITE.phoneDisplay}.`,
    "",
    "Fuerte is an IT, ELV and cyber security contractor in Qatar. It designs, installs, secures and maintains networks, structured cabling, data centers, CCTV, access control, fire alarm, public address, BMS and audio-visual systems, and provides penetration testing, managed security monitoring, compliance support, resource augmentation and annual maintenance contracts. Every page is also available in Arabic under /ar.",
    "",
  ];
  for (const [title, test] of GROUPS) {
    lines.push(`## ${title}`, "");
    for (const slug of slugs.filter(test)) {
      const page = getPage(locale, slug)!;
      lines.push(`- [${page.h1}](${absoluteUrl(twinPath(locale, slug))}): ${page.fm.metaDescription}`);
    }
    lines.push("");
  }
  lines.push("## Optional", "", `- [Home](${absoluteUrl(twinPath(locale, "/"))})`, `- [Full site text](${absoluteUrl("/llms-full.txt")}): every English page in one file`, "");
  return lines.join("\n");
}

/** /llms-full.txt: every page's Markdown twin, concatenated. */
export function llmsFull(locale: Locale = "en") {
  return getAllSlugs()
    .map((slug) => markdownTwin(locale, slug))
    .filter(Boolean)
    .join("\n\n---\n\n");
}
