import { Color } from "three";

/**
 * Scene colours and lighting for one theme. Brand colours come from the CSS tokens
 * (--primary, --glow, --background), so the scene follows app/globals.css; the rest is
 * derived from them: night in dark theme, dusk in light theme.
 */
export type Palette = {
  dark: boolean;
  primary: Color;
  glow: Color;
  /** Bright core of a travelling pulse. */
  hot: Color;
  skyTop: Color;
  /** Horizon and fog share one colour so the ground melts into the sky. */
  horizon: Color;
  haze: Color;
  fogNear: number;
  fogFar: number;
  window: Color;
  litRatio: number;
  ground: Color;
  groundLine: Color;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  key: Color;
  keyIntensity: number;
  rimIntensity: number;
  /** Multiplier on every emissive term. */
  emissive: number;
  /** Additive glow reads on a dark sky; on a light sky glows are drawn as normal alpha. */
  additive: boolean;
  bloom: { intensity: number; threshold: number };
  stars: boolean;
};

export function readPalette(dark: boolean): Palette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const primary = new Color(token("--primary", dark ? "#d0230c" : "#bc1704"));
  const glow = new Color(token("--glow", "#ff4a2e"));
  const background = new Color(token("--background", dark ? "#0b0b0d" : "#fafaf9"));

  if (dark) {
    const horizon = background.clone().lerp(primary, 0.02);
    return {
      dark,
      primary,
      glow,
      hot: new Color("#ffd9cf"),
      skyTop: background.clone(),
      horizon,
      haze: primary.clone().multiplyScalar(0.06),
      fogNear: 16,
      fogFar: 95,
      window: new Color("#ffcfae").multiplyScalar(1.1),
      litRatio: 0.24,
      ground: background.clone().lerp(new Color("#ffffff"), 0.015),
      groundLine: new Color("#2a2a31"),
      hemiSky: new Color("#4a4a5c"),
      hemiGround: background.clone(),
      hemiIntensity: 0.25,
      key: new Color("#c9ceff"),
      keyIntensity: 1.2,
      rimIntensity: 2.5,
      emissive: 1,
      additive: true,
      bloom: { intensity: 0.22, threshold: 1.15 },
      stars: true,
    };
  }

  const horizon = background.clone().lerp(glow, 0.18);
  return {
    dark,
    primary,
    glow,
    hot: new Color("#fff1ec"),
    skyTop: background.clone(),
    horizon,
    haze: glow.clone().multiplyScalar(0.12),
    fogNear: 14,
    fogFar: 95,
    window: new Color("#ffc4a8").multiplyScalar(0.45),
    litRatio: 0.18,
    ground: horizon.clone().lerp(new Color("#ffffff"), 0.25),
    groundLine: new Color("#d2c6c1"),
    hemiSky: new Color("#ffffff"),
    hemiGround: new Color("#e9dcd6"),
    hemiIntensity: 0.45,
    key: new Color("#ffd2b8"),
    keyIntensity: 2.2,
    rimIntensity: 3,
    emissive: 0.85,
    additive: false,
    bloom: { intensity: 0.18, threshold: 1.25 },
    stars: false,
  };
}
