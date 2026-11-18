const SCRIPT_UPPER: Record<string, string> = {
  B: "ℬ",
  E: "ℰ",
  F: "ℱ",
  H: "ℋ",
  I: "ℐ",
  L: "ℒ",
  M: "ℳ",
  R: "ℛ",
};
const SCRIPT_LOWER: Record<string, string> = { e: "ℯ", g: "ℊ", o: "ℴ" };
const FRAKTUR_UPPER: Record<string, string> = { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" };
const DOUBLE_UPPER: Record<string, string> = {
  C: "ℂ",
  H: "ℍ",
  N: "ℕ",
  P: "ℙ",
  Q: "ℚ",
  R: "ℝ",
  Z: "ℤ",
};

function mapLetters(text: string, upperStart: number, lowerStart: number, exceptions: Record<string, string> = {}) {
  return [...text].map((char) => {
    if (exceptions[char]) return exceptions[char];
    if (char >= "A" && char <= "Z") return String.fromCodePoint(upperStart + char.charCodeAt(0) - 65);
    if (char >= "a" && char <= "z") return String.fromCodePoint(lowerStart + char.charCodeAt(0) - 97);
    return char;
  }).join("");
}

const SMALL_CAPS: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
  k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ",
  u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
};

const UPSIDE: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ",
  k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ",
  u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
};

export const FONT_STYLES: { id: string; label: string; labelZh: string; group: string; apply: (text: string) => string }[] = [
  { id: "bold", label: "Bold", labelZh: "粗体", group: "bold", apply: (text) => mapLetters(text, 0x1d400, 0x1d41a) },
  { id: "italic", label: "Italic", labelZh: "斜体", group: "cursive", apply: (text) => mapLetters(text, 0x1d434, 0x1d44e) },
  { id: "bold-italic", label: "Bold italic", labelZh: "粗斜体", group: "bold", apply: (text) => mapLetters(text, 0x1d468, 0x1d482) },
  { id: "script", label: "Cursive", labelZh: "手写", group: "cursive", apply: (text) => mapLetters(text, 0x1d49c, 0x1d4b6, { ...SCRIPT_UPPER, ...SCRIPT_LOWER }) },
  { id: "bold-script", label: "Bold cursive", labelZh: "粗手写", group: "cursive", apply: (text) => mapLetters(text, 0x1d4d0, 0x1d4ea) },
  { id: "fraktur", label: "Gothic", labelZh: "哥特", group: "all", apply: (text) => mapLetters(text, 0x1d504, 0x1d51e, FRAKTUR_UPPER) },
  { id: "double", label: "Double struck", labelZh: "双线", group: "all", apply: (text) => mapLetters(text, 0x1d538, 0x1d552, DOUBLE_UPPER) },
  { id: "sans", label: "Sans", labelZh: "无衬线", group: "all", apply: (text) => mapLetters(text, 0x1d5a0, 0x1d5ba) },
  { id: "sans-bold", label: "Sans bold", labelZh: "无衬线粗体", group: "bold", apply: (text) => mapLetters(text, 0x1d5d4, 0x1d5ee) },
  { id: "sans-italic", label: "Sans italic", labelZh: "无衬线斜体", group: "cursive", apply: (text) => mapLetters(text, 0x1d608, 0x1d622) },
  { id: "mono", label: "Monospace", labelZh: "等宽", group: "all", apply: (text) => mapLetters(text, 0x1d670, 0x1d68a) },
  { id: "fullwidth", label: "Fullwidth", labelZh: "全角", group: "all", apply: (text) => [...text].map((char) => {
    const code = char.charCodeAt(0);
    return code >= 33 && code <= 126 ? String.fromCharCode(code + 0xfee0) : char === " " ? "　" : char;
  }).join("") },
  { id: "small-caps", label: "Small caps", labelZh: "小型大写", group: "all", apply: (text) => [...text.toLowerCase()].map((char) => SMALL_CAPS[char] ?? char).join("") },
  { id: "circled", label: "Bubble", labelZh: "气泡", group: "all", apply: (text) => [...text].map((char) => {
    if (char >= "A" && char <= "Z") return String.fromCodePoint(0x24b6 + char.charCodeAt(0) - 65);
    if (char >= "a" && char <= "z") return String.fromCodePoint(0x24d0 + char.charCodeAt(0) - 97);
    if (char >= "1" && char <= "9") return String.fromCodePoint(0x2460 + char.charCodeAt(0) - 49);
    if (char === "0") return "⓪";
    return char;
  }).join("") },
  { id: "squared", label: "Squared", labelZh: "方框", group: "all", apply: (text) => [...text.toLowerCase()].map((char) => (
    char >= "a" && char <= "z" ? String.fromCodePoint(0x1f130 + char.charCodeAt(0) - 97) : char
  )).join("") },
  { id: "superscript", label: "Superscript", labelZh: "上标", group: "all", apply: (text) => {
    const map: Record<string, string> = { a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ", j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return [...text.toLowerCase()].map((char) => map[char] ?? char).join("");
  } },
  { id: "upside", label: "Upside down", labelZh: "倒置", group: "all", apply: (text) => [...text.toLowerCase()].reverse().map((char) => UPSIDE[char] ?? char).join("") },
  { id: "strike", label: "Strikethrough", labelZh: "删除线", group: "all", apply: (text) => [...text].map((char) => `${char}\u0336`).join("") },
  { id: "underline", label: "Underline", labelZh: "下划线", group: "all", apply: (text) => [...text].map((char) => `${char}\u0332`).join("") },
  { id: "slash", label: "Slashed", labelZh: "斜杠", group: "all", apply: (text) => [...text].map((char) => `${char}\u0338`).join("") },
];

export function stylesFor(group: string) {
  if (!group || group === "all") return FONT_STYLES;
  return FONT_STYLES.filter((style) => style.group === group || style.group === "all");
}
