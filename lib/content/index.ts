import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

import { routing, type Locale } from "@/i18n/routing";

/** Front-matter every draft carries (content-drafts/README.md, "Conventions"). */
export type Frontmatter = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  pillar?: string;
};

export type Section = "home" | "services" | "industries" | "insights" | "legal" | "page";

export type Page = {
  slug: string;
  /** Locale of the text actually shown. Differs from the requested locale while a translation is missing. */
  contentLocale: Locale;
  fm: Frontmatter;
  section: Section;
  h1: string;
  /** First paragraph after the H1: the direct answer / lead. Markdown. */
  lead: string;
  /** Everything after the lead. Markdown, with HTML comments removed. */
  body: string;
};

export const PILLARS = ["technology", "data-center", "elv", "cyber-security", "resource-augmentation", "amc"] as const;

const CONTENT_ROOT = join(process.cwd(), "content");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : name.endsWith(".md") ? [path] : [];
  });
}

function sectionOf(slug: string): Section {
  if (slug === "/") return "home";
  const first = slug.split("/")[1];
  return first === "services" || first === "industries" || first === "insights" || first === "legal" ? first : "page";
}

/** Splits a draft into H1, lead paragraph and body. Comments are notes for the team, never rendered. */
function splitDoc(markdown: string) {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
  const lines = text.split("\n");
  const h1At = lines.findIndex((l) => l.startsWith("# "));
  const h1 = h1At >= 0 ? lines[h1At].slice(2).trim() : "";
  let i = h1At + 1;
  while (i < lines.length && !lines[i].trim()) i++;
  const leadLines: string[] = [];
  const isProse = (l: string) => l.trim() && !/^(#|-|\*\s|\d+\.|\||>|```|\*\*[^*]+:\*\*)/.test(l.trim());
  while (i < lines.length && isProse(lines[i])) leadLines.push(lines[i++]);
  return { h1, lead: leadLines.join("\n"), body: lines.slice(i).join("\n").trim() };
}

type Raw = { fm: Frontmatter; content: string };
const cache = new Map<Locale, Map<string, Raw>>();

function load(locale: Locale): Map<string, Raw> {
  const hit = process.env.NODE_ENV === "production" ? cache.get(locale) : undefined;
  if (hit) return hit;
  const pages = new Map<string, Raw>();
  try {
    for (const file of walk(join(CONTENT_ROOT, locale))) {
      // Drafts are edited on Windows: normalise CRLF so line-anchored patterns match.
      const { data, content } = matter(readFileSync(file, "utf8").replace(/\r\n?/g, "\n"));
      const fm = data as Frontmatter;
      if (fm.slug) pages.set(fm.slug, { fm, content });
    }
  } catch {
    // Locale folder not synced yet: callers fall back to English.
  }
  cache.set(locale, pages);
  return pages;
}

/** The page for `slug` in `locale`, falling back to English while the translation is missing. */
export function getPage(locale: Locale, slug: string): Page | undefined {
  const own = load(locale).get(slug);
  const raw = own ?? load(routing.defaultLocale).get(slug);
  if (!raw) return undefined;
  return {
    slug,
    contentLocale: own ? locale : routing.defaultLocale,
    fm: raw.fm,
    section: sectionOf(slug),
    ...splitDoc(raw.content),
  };
}

/** Raw Markdown (comments removed) for pages with their own layout, such as the home page. */
export function getSource(locale: Locale, slug: string) {
  const own = load(locale).get(slug);
  const raw = own ?? load(routing.defaultLocale).get(slug);
  if (!raw) return undefined;
  return { fm: raw.fm, contentLocale: own ? locale : routing.defaultLocale, text: raw.content.replace(/<!--[\s\S]*?-->/g, "").trim() };
}

/** Every canonical slug (English is the master list). */
export function getAllSlugs(): string[] {
  return [...load(routing.defaultLocale).keys()];
}

/** Child pages of a section, e.g. all industries, in file order. */
export function getSectionPages(locale: Locale, section: Section): Page[] {
  return getAllSlugs()
    .filter((slug) => sectionOf(slug) === section)
    .map((slug) => getPage(locale, slug)!)
    .sort((a, b) => a.h1.localeCompare(b.h1, locale));
}

/** Stable heading id for anchors and the table of contents; keeps Arabic letters. */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

const PLACEHOLDER = /\[(?:CONFIRM|PLACEHOLDER)(?:[^[\]]|\[[^[\]]*\])*\]|\[EMAIL\]|\[CR NUMBER\]/;

/** H2 headings of the body, for "On this page". */
export function getToc(body: string) {
  return body
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim())
    .map((text) => ({ text, id: headingId(text) }));
}

const FAQ_HEADING = /^## (frequently asked questions|faqs?|الأسئلة الشائعة|أسئلة شائعة)/i;

/** Question/answer pairs from the FAQ section, as plain text. Items with unanswered placeholders are left out. */
export function getFaqs(body: string) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => FAQ_HEADING.test(l));
  if (start < 0) return [];
  const faqs: { q: string; a: string }[] = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("## "); i++) {
    if (!lines[i].startsWith("### ")) continue;
    const answer: string[] = [];
    let j = i + 1;
    for (; j < lines.length && !/^#{2,3} /.test(lines[j]); j++) answer.push(lines[j]);
    const a = toPlain(answer.join(" "));
    if (a && !PLACEHOLDER.test(a)) faqs.push({ q: toPlain(lines[i].slice(4)), a });
    i = j - 1;
  }
  return faqs;
}

/** Markdown to plain text, for structured data and llms.txt. */
export function toPlain(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#|]/g, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasPlaceholder(text: string) {
  return PLACEHOLDER.test(text);
}
