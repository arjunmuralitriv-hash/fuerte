/**
 * Arabic for Satori (next/og). Satori measures an Arabic word by its unjoined letters but draws it joined,
 * which leaves a gap after every word, and its right-to-left line layout is unreliable. So Arabic is
 * pre-joined into Unicode presentation forms (IBM Plex Sans Arabic carries them), and each word is
 * handed over already in display order, one flex item per word in a row-reverse wrap.
 */

// Presentation forms per letter: [isolated, final, initial, medial]. Two forms = joins only to the letter before.
const FORMS: Record<number, number[]> = {
  0x621: [0xfe80],
  0x622: [0xfe81, 0xfe82],
  0x623: [0xfe83, 0xfe84],
  0x624: [0xfe85, 0xfe86],
  0x625: [0xfe87, 0xfe88],
  0x627: [0xfe8d, 0xfe8e],
  0x629: [0xfe93, 0xfe94],
  0x62f: [0xfea9, 0xfeaa],
  0x630: [0xfeab, 0xfeac],
  0x631: [0xfead, 0xfeae],
  0x632: [0xfeaf, 0xfeb0],
  0x648: [0xfeed, 0xfeee],
  0x649: [0xfeef, 0xfef0],
};
// Dual-joining letters: their four forms are consecutive from the isolated one.
const DUAL: Record<number, number> = {
  0x626: 0xfe89, 0x628: 0xfe8f, 0x62a: 0xfe95, 0x62b: 0xfe99, 0x62c: 0xfe9d, 0x62d: 0xfea1, 0x62e: 0xfea5, 0x633: 0xfeb1,
  0x634: 0xfeb5, 0x635: 0xfeb9, 0x636: 0xfebd, 0x637: 0xfec1, 0x638: 0xfec5, 0x639: 0xfec9, 0x63a: 0xfecd, 0x641: 0xfed1,
  0x642: 0xfed5, 0x643: 0xfed9, 0x644: 0xfedd, 0x645: 0xfee1, 0x646: 0xfee5, 0x647: 0xfee9, 0x64a: 0xfef1,
};
for (const [letter, isolated] of Object.entries(DUAL)) FORMS[Number(letter)] = [0, 1, 2, 3].map((i) => isolated + i);

const LAM = 0x644;
const LAM_ALEF: Record<number, number> = { 0x622: 0xfef5, 0x623: 0xfef7, 0x625: 0xfef9, 0x627: 0xfefb }; // isolated; final is +1
const TATWEEL = 0x640;
const isMark = (c: number) => (c >= 0x64b && c <= 0x65f) || c === 0x670;
const joinsNext = (c: number) => c === TATWEEL || FORMS[c]?.length === 4;
const joinsPrev = (c: number) => c === TATWEEL || (c in FORMS && c !== 0x621);

/** Contextual joining in logical order. Characters that are not Arabic letters pass through. */
function join(text: string) {
  const cs = [...text].map((ch) => ch.codePointAt(0)!);
  const neighbour = (i: number, step: 1 | -1) => {
    for (let j = i + step; j >= 0 && j < cs.length; j += step) if (!isMark(cs[j])) return j;
    return -1;
  };
  let out = "";
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (!(c in FORMS)) {
      out += String.fromCodePoint(c);
      continue;
    }
    const p = neighbour(i, -1);
    const n = neighbour(i, 1);
    const prev = p >= 0 && joinsNext(cs[p]);
    if (c === LAM && n >= 0 && cs[n] in LAM_ALEF) {
      out += String.fromCodePoint(LAM_ALEF[cs[n]] + (prev ? 1 : 0), ...cs.slice(i + 1, n));
      i = n;
      continue;
    }
    const next = FORMS[c].length === 4 && n >= 0 && joinsPrev(cs[n]);
    out += String.fromCodePoint(FORMS[c][prev && next ? 3 : prev ? 1 : next ? 2 : 0]);
  }
  return out;
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };
// A Latin or digit run (kept left to right), or one letter with its marks.
const TOKEN = /[A-Za-z0-9٠-٩]+(?:[./:\-+%,&][A-Za-z0-9٠-٩]+)*|(\P{M})(\p{M}*)/gu;

/** One word in display order. Satori draws a mark where the pen stands, so it goes before its letter. */
function visualWord(word: string) {
  return [...join(word).matchAll(TOKEN)]
    .map(([token, base, marks]) => (base ? `${marks}${MIRROR[base] ?? base}` : token))
    .reverse()
    .join("");
}

/** Words of a right-to-left line, each ready to draw. Consecutive Latin words stay together, in their own order. */
export function rtlWords(text: string) {
  const words: { text: string; latin: boolean }[] = [];
  for (const w of text.replace(/[‎‏⁦-⁩]/g, "").split(/\s+/).filter(Boolean)) {
    const latin = !/[؀-ۿ]/.test(w);
    const last = words.at(-1);
    if (latin && last?.latin) last.text += ` ${w}`;
    else words.push({ text: w, latin });
  }
  return words.map((w) => (w.latin ? w.text : visualWord(w.text)));
}
