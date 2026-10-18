import type { Locale } from "@/i18n/routing";
import { getSource, hasPlaceholder } from "@/lib/content";

export type Beat = { eyebrow: string; title: string; body: string };
export type Extra = { title: string; body: string };

/**
 * home.md is a panel-by-panel spec (one "## " section per scroll beat, plan section 9).
 * Sections are read by position, not by heading text, so the Arabic draft parses the same way.
 * Lines that start with a bold label ("**Eyebrow:** …", "**Proof strip** …") are spec notes, not copy.
 */
export function getHome(locale: Locale) {
  const source = getSource(locale, "/");
  if (!source) return undefined;
  const sections = source.text.split(/^## .*$/m).slice(1).map((s) => s.trim().split("\n"));
  const [heroLines, ...rest] = sections;
  const beatLines = rest.slice(0, 6);
  const belowLines = rest[6] ?? [];
  const factLines = sections.at(-1) ?? [];

  const LABEL = /^\*\*([^*]+):\*\*\s*(.*)$/;
  const labels = (lines: string[]) => lines.map((l) => l.match(LABEL)).filter((m): m is RegExpMatchArray => Boolean(m));
  const isNote = (l: string) => l.startsWith("**") || l.startsWith("|") || l.trim() === "---";

  const h1At = heroLines.findIndex((l) => l.startsWith("# "));
  const heroLabels = labels(heroLines);
  const hero = {
    eyebrow: heroLabels[0]?.[2] ?? "",
    title: heroLines[h1At]?.slice(2).trim() ?? "",
    body: heroLines.slice(h1At + 1).filter((l) => !isNote(l)).join("\n").trim(),
    scrollCue: heroLabels.length > 1 ? heroLabels.at(-1)![2] : "",
  };

  const beats: Beat[] = beatLines.map((lines) => {
    const titleAt = lines.findIndex((l) => l.startsWith("### "));
    return {
      eyebrow: labels(lines)[0]?.[2] ?? "",
      title: lines[titleAt]?.slice(4).trim() ?? "",
      body: lines.slice(titleAt + 1).filter((l) => !isNote(l)).join("\n").trim(),
    };
  });

  // Proof strip table in beat 5: | n | value | label |, after the header and separator rows.
  const stats = (beatLines[4] ?? [])
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()))
    .map(([, , value, label]) => ({ value, label }));

  const extras: Extra[] = belowLines
    .join("\n")
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [title, ...body] = block.split("\n");
      return { title: title.trim(), body: body.filter((l) => l.trim() !== "---").join("\n").trim() };
    });

  const facts = factLines
    .map((l) => l.match(/^- \*\*([^*]+):\*\*\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map(([, label, value]) => ({ label, value }));

  return { fm: source.fm, contentLocale: source.contentLocale, hero, beats, stats, extras, facts };
}

/** Unverified figures never reach production (Consumer Protection Law 8/2008, plan section 5). */
export const showClaim = (value: string) => !hasPlaceholder(value) || process.env.VERCEL_ENV !== "production";
