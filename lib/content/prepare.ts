/**
 * Turns draft conventions into renderable Markdown before parsing:
 * - [CONFIRM: …], [PLACEHOLDER: …], [EMAIL], [CR NUMBER] → inline code `⟦…⟧`, rendered as a visible "to confirm" mark
 * - the "- **Primary CTA:** … / Secondary CTA / Tertiary link" list → a ```fuerte-cta``` block
 * - "**Form**" / "## Form" microcopy specs → a ```fuerte-form``` block, replaced by a real form or a contact CTA
 */
const PLACEHOLDER = /\[(?:CONFIRM|PLACEHOLDER)(?:[^[\]]|\[[^[\]]*\])*\]|\[EMAIL\]|\[CR NUMBER\]/g;
const CTA_LINE = /^- \*\*(Primary CTA|Secondary CTA|Tertiary link|الدعوة الرئيسية|الدعوة الثانوية|رابط إضافي):\*\*\s*(.+)$/;
const KEYS = {
  "Primary CTA": "primary",
  "Secondary CTA": "secondary",
  "Tertiary link": "tertiary",
  "الدعوة الرئيسية": "primary",
  "الدعوة الثانوية": "secondary",
  "رابط إضافي": "tertiary",
} as const;

export type CtaSpec = { primary?: string; secondary?: string; tertiary?: string };

export function prepareMarkdown(markdown: string, formKind?: string) {
  let text = markdown;

  if (formKind) {
    const block = "```fuerte-form\n" + formKind + "\n```\n\n";
    text = text.replace(/^## (?:Form|النموذج)\s*\n[\s\S]*?(?=^## )/m, block).replace(/^\*\*(?:Form|النموذج)\*\*\s*\n[\s\S]*?(?=^## )/m, block);
  }

  const out: string[] = [];
  let cta: CtaSpec | null = null;
  for (const line of text.split("\n")) {
    const m = line.match(CTA_LINE);
    if (m) {
      cta ??= {};
      cta[KEYS[m[1] as keyof typeof KEYS]] = m[2].trim();
      continue;
    }
    if (cta) {
      out.push("```fuerte-cta", JSON.stringify(cta), "```");
      cta = null;
    }
    out.push(line);
  }
  if (cta) out.push("```fuerte-cta", JSON.stringify(cta), "```");

  const body = process.env.VERCEL_ENV === "production" ? withoutUnconfirmed(out.join("\n")) : out.join("\n");
  return body.replace(PLACEHOLDER, (m) => "`⟦" + m.slice(1, -1) + "⟧`");
}

const MARKER = new RegExp(PLACEHOLDER.source); // non-global: safe for .test()
const TOKEN = /\u0000\d+\u0000/g;
// A placeholder right after one of these stands for a missing value ("within [CONFIRM: number] working days",
// "**Office hours:** [CONFIRM]"); anywhere else it annotates a complete sentence ("+974 7125 8588 [CONFIRM: …].").
const VALUE_BEFORE = /(?:\b(?:within|takes?|to|of|for|in|is|are)|(?:^|\s)(?:خلال|من|في)|[,:،](?:\*\*)?)\s*$/i;

/**
 * Production renders a placeholder as nothing (components/content/markdown.tsx), so the words that need it go too: the
 * sentence (or the whole list item) where it stands for a missing value, a table row for a document listed "only if
 * held" (never implied before it is confirmed), and a table column with nothing confirmed in it. A placeholder that
 * only annotates a complete sentence goes on its own.
 */
function withoutUnconfirmed(markdown: string) {
  const lines = markdown.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("|")) {
      const table: string[] = [];
      while (lines[i]?.startsWith("|")) table.push(lines[i++]);
      i--;
      out.push(...confirmedTable(table));
    } else if (MARKER.test(lines[i])) {
      const line = confirmedLine(lines[i]);
      if (line !== null) out.push(line);
    } else out.push(lines[i]);
  }
  return out.join("\n");
}

function confirmedLine(line: string) {
  const masked = line.replace(PLACEHOLDER, (_, at: number) => `\u0000${at}\u0000`); // no "." inside a sentence split
  const missing = (sentence: string) => [...sentence.matchAll(TOKEN)].some((m) => VALUE_BEFORE.test(sentence.slice(0, m.index)));
  const list = /^\s*(?:[-*]|\d+\.)\s/.test(line);
  if (list && missing(masked)) return null;
  const kept = masked
    .split(/(?<=[.!?؟])\s+/)
    .filter((s) => list || !missing(s))
    .map((s) => s.replace(new RegExp(`\\s*${TOKEN.source}`, "g"), ""))
    .join(" ");
  return kept.replace(/^\s*(?:[-*]|\d+\.|#+)?\s*$/, "") ? kept : null;
}

function confirmedTable(rows: string[]) {
  if (rows.length < 3) return rows;
  const cells = rows.map((r) => r.replace(/^\||\|$/g, "").split("|"));
  const body = cells.slice(2).filter((row) => !row.some((c) => /only if held/i.test(c)));
  const empty = cells[0].map((_, j) => body.length > 0 && body.every((row) => !(row[j] ?? "").replace(PLACEHOLDER, "").trim()));
  return [cells[0], cells[1], ...body].map((row) => `|${row.filter((_, j) => !empty[j]).join("|")}|`);
}
