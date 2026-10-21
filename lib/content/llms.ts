import type { Locale } from "@/i18n/routing";
import { getListedSlugs, getPage, getSource } from "@/lib/content";
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

const SECTIONS: [Record<Locale, string>, (slug: string) => boolean][] = [
  [{ en: "Services", ar: "الخدمات" }, (s) => s.startsWith("/services")],
  [{ en: "Industries", ar: "القطاعات" }, (s) => s.startsWith("/industries")],
  [{ en: "Guides", ar: "الأدلة" }, (s) => s.startsWith("/insights")],
  [{ en: "Company", ar: "الشركة" }, (s) => !/^\/(services|industries|insights|legal)/.test(s) && s !== "/"],
  [{ en: "Legal", ar: "معلومات قانونية" }, (s) => s.startsWith("/legal")],
];

// Arabic phone numbers and paths sit in LTR isolates so they keep their order inside RTL text (fuerte-arabic skill).
const ltr = (text: string) => `⁦${text}⁩`;

type Copy = { title: string; based: string; about: string; home: string; full: [string, string]; other: [string, string] };
const COPY: Record<Locale, Copy> = {
  en: {
    title: "Fuerte Technologies & Contracting Services",
    based: `Based in Doha, Qatar. Phone ${SITE.phoneDisplay}.`,
    about:
      "Fuerte is an IT, ELV and cyber security contractor in Qatar. It designs, installs, secures and maintains networks, structured cabling, data centers, CCTV, access control, fire alarm, public address, BMS and audio-visual systems, and provides penetration testing, managed security monitoring, compliance support, resource augmentation and annual maintenance contracts. Every page is also available in Arabic under /ar.",
    home: "Home",
    full: ["Full site text", "every English page in one file"],
    other: ["Arabic", "the same map in Arabic"],
  },
  ar: {
    title: "فورت تكنولوجيس اند كونتراكتينغ سرفيسس (Fuerte Technologies & Contracting Services)",
    based: `مقرها الدوحة، قطر. الهاتف: ${ltr(SITE.phoneDisplay)}.`,
    about: `فورت مقاول لتقنية المعلومات وأنظمة التيار الخفيف (ELV) والأمن السيبراني في قطر. نصمم الشبكات والكابلات الهيكلية ومراكز البيانات وكاميرات المراقبة وأنظمة التحكم في الدخول وإنذار الحريق والنداء العام ونظام إدارة المباني (BMS) والأنظمة السمعية والبصرية، وننفذها ونؤمّنها ونتولى صيانتها. ونقدّم أيضًا اختبار الاختراق، والمراقبة الأمنية المُدارة، ودعم الامتثال، وتوفير الكوادر التقنية، وعقود الصيانة السنوية (AMC). وتتوفر كل صفحة باللغة الإنجليزية أيضًا ضمن ${ltr("/en")}.`,
    home: "الصفحة الرئيسية",
    full: ["النص الكامل للموقع", "جميع الصفحات العربية في ملف واحد"],
    other: ["English", "الخريطة نفسها باللغة الإنجليزية"],
  },
};

/** Where each locale's llms files live: English at the root (llmstxt.org), Arabic under /ar. */
const llmsPath = (locale: Locale, file: "llms.txt" | "llms-full.txt") => (locale === "en" ? `/${file}` : `/${locale}/${file}`);

/** /llms.txt and /ar/llms.txt (llmstxt.org): a short map of the site pointing at the Markdown twins. */
export function llmsIndex(locale: Locale = "en") {
  const slugs = getListedSlugs();
  const home = getPage(locale, "/");
  const copy = COPY[locale];
  const lines = [`# ${copy.title}`, "", `> ${home?.fm.metaDescription ?? ""} ${copy.based}`, "", copy.about, ""];
  for (const [title, test] of SECTIONS) {
    lines.push(`## ${title[locale]}`, "");
    for (const slug of slugs.filter(test)) {
      const page = getPage(locale, slug)!;
      lines.push(`- [${page.h1}](${absoluteUrl(twinPath(locale, slug))}): ${page.fm.metaDescription}`);
    }
    lines.push("");
  }
  // "Optional" is the section name llmstxt.org defines, so it stays in English.
  lines.push(
    "## Optional",
    "",
    `- [${copy.home}](${absoluteUrl(twinPath(locale, "/"))})`,
    `- [${copy.full[0]}](${absoluteUrl(llmsPath(locale, "llms-full.txt"))}): ${copy.full[1]}`,
    `- [${copy.other[0]}](${absoluteUrl(llmsPath(locale === "en" ? "ar" : "en", "llms.txt"))}): ${copy.other[1]}`,
    "",
  );
  return lines.join("\n");
}

/** /llms-full.txt and /ar/llms-full.txt: every page's Markdown twin, concatenated. */
export function llmsFull(locale: Locale = "en") {
  return getListedSlugs()
    .map((slug) => markdownTwin(locale, slug))
    .filter(Boolean)
    .join("\n\n---\n\n");
}
