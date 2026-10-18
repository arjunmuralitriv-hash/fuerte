import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Type & tokens · dev", robots: { index: false, follow: false } };

const sample = {
  en: { heading: "Structured cabling, certified end to end.", body: "We design, install and certify Cat6A and fibre networks for offices, data centers and campuses across Qatar, then keep them running with preventive maintenance and a 24/7 response line." },
  ar: { heading: "كابلات هيكلية معتمدة من البداية إلى النهاية.", body: "نصمم شبكات Cat6A والألياف الضوئية وننفذها ونعتمدها للمكاتب ومراكز البيانات والمجمعات في أنحاء قطر، ثم نحافظ على تشغيلها بالصيانة الوقائية وخط استجابة على مدار الساعة." },
} as const;

const scale = [
  { token: "text-display", range: "40 → 88" },
  { token: "text-h1", range: "34 → 64" },
  { token: "text-h2", range: "28 → 44" },
  { token: "text-h3", range: "22 → 30" },
  { token: "text-h4", range: "18 → 22" },
  { token: "text-body-lg", range: "18 → 20" },
  { token: "text-body", range: "16 → 17" },
  { token: "text-small", range: "14" },
] as const;

const swatches = ["background", "card", "foreground", "primary", "muted", "muted-foreground", "accent", "border", "glow"] as const;
const swatchClass: Record<(typeof swatches)[number], string> = {
  background: "bg-background",
  card: "bg-card",
  foreground: "bg-foreground",
  primary: "bg-primary",
  muted: "bg-muted",
  "muted-foreground": "bg-muted-foreground",
  accent: "bg-accent",
  border: "bg-border",
  glow: "bg-glow",
};

const spacing = [
  { px: 4, cls: "w-1" },
  { px: 8, cls: "w-2" },
  { px: 12, cls: "w-3" },
  { px: 16, cls: "w-4" },
  { px: 24, cls: "w-6" },
  { px: 32, cls: "w-8" },
  { px: 48, cls: "w-12" },
  { px: 64, cls: "w-16" },
  { px: 96, cls: "w-24" },
  { px: 128, cls: "w-32" },
  { px: 160, cls: "w-40" },
] as const;

/** QA specimen for the type scale, colour tokens and spacing scale in the current locale and theme. */
export default async function TypePage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const s = sample[locale === "ar" ? "ar" : "en"];

  return (
    <main id="main" className="container-page section-y">
      <p className="eyebrow text-muted-foreground">Design tokens · {locale.toUpperCase()}</p>
      <h1 className="mt-3 text-h2">Type, colour and spacing</h1>

      <section className="mt-12 divide-y border-y">
        {scale.map(({ token, range }) => (
          <div key={token} className="grid gap-2 py-6 md:grid-cols-[12rem_1fr] md:gap-8">
            <p className="font-mono text-small text-muted-foreground" dir="ltr">
              {token}
              <br />
              <span className="tabular-nums">{range}px</span>
            </p>
            <p className={`${token} max-w-prose`}>{token.startsWith("text-body") || token === "text-small" ? s.body : s.heading}</p>
          </div>
        ))}
        <div className="grid gap-2 py-6 md:grid-cols-[12rem_1fr] md:gap-8">
          <p className="font-mono text-small text-muted-foreground" dir="ltr">eyebrow<br /><span className="tabular-nums">12 → 13px</span></p>
          <p className="eyebrow">{s.heading}</p>
        </div>
      </section>

      <h2 className="mt-16 text-h3">Colour</h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {swatches.map((name) => (
          <li key={name} className="overflow-hidden rounded-2xl border bg-card">
            <div className={`h-16 ${swatchClass[name]}`} />
            <p className="px-4 py-3 font-mono text-small" dir="ltr">--{name}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-16 text-h3">Spacing (4px base)</h2>
      <ul className="mt-6 space-y-3" dir="ltr">
        {spacing.map(({ px, cls }) => (
          <li key={px} className="flex items-center gap-4">
            <span className="w-12 text-end font-mono text-small text-muted-foreground tabular-nums">{px}</span>
            <span className={`h-3 rounded-sm bg-primary ${cls}`} />
          </li>
        ))}
      </ul>
    </main>
  );
}
