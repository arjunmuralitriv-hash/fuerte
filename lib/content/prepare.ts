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
    text = text.replace(/^## (?:Form|النموذج)\s*\n[\s\S]*?(?=^## )/m, block).replace(/^\*\*Form\*\*\s*\n[\s\S]*?(?=^## )/m, block);
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

  return out.join("\n").replace(PLACEHOLDER, (m) => "`⟦" + m.slice(1, -1) + "⟧`");
}
