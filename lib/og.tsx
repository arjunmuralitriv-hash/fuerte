import { ImageResponse } from "next/og";

import type { Locale } from "@/i18n/routing";
import { rtlWords } from "@/lib/og-arabic";
import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

// Brand tokens from design-system/fuerte/MASTER.md (ImageResponse cannot read CSS variables).
const SURFACES = {
  light: { background: "#FAFAF9", foreground: "#141416", muted: "#5B5B61", red: "#BC1704" },
  dark: { background: "#0B0B0D", foreground: "#F4F4F5", muted: "#A1A1A9", red: "#D0230C" },
} as const;

/** fetch with retries: a dropped connection should not fail a build that prerenders every card. */
async function fetchOk(url: string, attempts = 3): Promise<Response> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res;
  } catch (error) {
    if (attempts <= 1) throw error;
    return fetchOk(url, attempts - 1);
  }
}

/**
 * IBM Plex as TTF (Satori reads TTF/OTF/WOFF, not the WOFF2 next/font serves). Without a browser
 * user agent the Google Fonts CSS API answers with TrueType URLs. Each face is fetched once per process.
 */
const fonts = new Map<string, Promise<ArrayBuffer>>();
function loadFont(family: string, weight: number) {
  const key = `${family}:${weight}`;
  if (!fonts.has(key)) {
    const face = fetchOk(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)
      .then((r) => r.text())
      .then((css) => {
        const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
        if (!url) throw new Error(`No TTF for ${key}`);
        return fetchOk(url).then((r) => r.arrayBuffer());
      });
    // A failed fetch is not cached, so the next card tries again.
    face.catch(() => fonts.delete(key));
    fonts.set(key, face);
  }
  return fonts.get(key)!;
}

/** Text block. Arabic goes one word per flex item in a row-reverse wrap (see lib/og-arabic.ts). */
function Words({ text, rtl, style }: { text: string; rtl: boolean; style: React.CSSProperties }) {
  if (!rtl) return <div style={{ display: "flex", ...style }}>{text}</div>;
  const space = Number(style.fontSize) * 0.3;
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", width: "100%", ...style }}>
      {rtlWords(text).map((word, i) => (
        <span key={i} style={{ marginLeft: space }}>
          {word}
        </span>
      ))}
    </div>
  );
}

/** Social card: eyebrow, title, Fuerte red diagonal cut on the end side, brand line. Arabic is RTL and never letter-spaced. */
export async function ogImage({ locale, eyebrow, title, brand, surface = "light" }: { locale: Locale; eyebrow: string; title: string; brand: string; surface?: keyof typeof SURFACES }) {
  const c = SURFACES[surface];
  const rtl = locale === "ar";
  const host = new URL(SITE.url).host;
  const family = rtl ? "IBM Plex Sans Arabic" : "IBM Plex Sans";
  const [semibold, medium] = await Promise.all([loadFont(family, 600), loadFont(family, 500)]);
  const titleSize = title.length > 70 ? 52 : title.length > 40 ? 62 : 72;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: c.background, color: c.foreground, fontFamily: "Plex" }}>
        {/* Diagonal cut on the end side: same geometry as the content-page header band, mirrored for RTL. */}
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0 }}>
          <polygon points={rtl ? "0,0 300,0 180,630 0,630" : "900,0 1200,0 1200,630 1020,630"} fill={c.red} />
          <polygon points={rtl ? "300,0 330,0 210,630 180,630" : "870,0 900,0 1020,630 990,630"} fill={c.red} fillOpacity={0.35} />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 820,
            height: "100%",
            padding: "72px 80px",
            marginLeft: rtl ? "auto" : 0,
            alignItems: rtl ? "flex-end" : "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 20, width: "100%" }}>
            <div style={{ width: 48, height: 3, flexShrink: 0, background: c.red }} />
            <Words text={eyebrow} rtl={rtl} style={{ fontSize: 28, fontWeight: 500, color: c.muted, letterSpacing: rtl ? 0 : 1 }} />
          </div>
          <Words text={title} rtl={rtl} style={{ fontSize: titleSize, fontWeight: 600, lineHeight: rtl ? 1.4 : 1.1, letterSpacing: rtl ? 0 : -1 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: rtl ? "flex-end" : "flex-start", gap: 6, width: "100%" }}>
            <Words text={brand} rtl={rtl} style={{ fontSize: 28, fontWeight: 600 }} />
            <span style={{ fontSize: 24, fontWeight: 500, color: c.muted }}>{host}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Plex", data: semibold, weight: 600, style: "normal" },
        { name: "Plex", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
