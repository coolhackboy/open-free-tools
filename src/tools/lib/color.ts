/** Color conversions, palette extraction (median cut) and contrast. Pure, no DOM. */

export type Rgb = { r: number; g: number; b: number; a?: number };
export type Hsl = { h: number; s: number; l: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function parseHex(input: string): Rgb {
  let hex = input.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) throw new Error("Use a HEX color like #1e90ff or #fff.");
  if (hex.length <= 4) hex = [...hex].map((char) => char + char).join("");
  const rgb: Rgb = { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  if (hex.length === 8) rgb.a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 1000) / 1000;
  return rgb;
}

export function toHex({ r, g, b, a }: Rgb, upper = false) {
  const part = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  const out = `#${part(r)}${part(g)}${part(b)}${a !== undefined && a < 1 ? part(a * 255) : ""}`;
  return upper ? out.toUpperCase() : out;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 1000) / 10 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  return { h: Math.round(h * 10) / 10, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + (((h % 360) + 360) % 360) / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export function rgbToHsv({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const { h } = rgbToHsl({ r, g, b });
  return { h, s: max ? Math.round(((max - min) / max) * 1000) / 10 : 0, v: Math.round(max * 1000) / 10 };
}

export function rgbToCmyk({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const pct = (value: number) => Math.round(value * 1000) / 10;
  return { c: pct((1 - rn - k) / (1 - k)), m: pct((1 - gn - k) / (1 - k)), y: pct((1 - bn - k) / (1 - k)), k: pct(k) };
}

/** Accepts HEX, rgb()/rgba(), hsl()/hsla() or bare "r, g, b". */
export function parseColor(input: string): Rgb {
  const value = input.trim().toLowerCase();
  if (/^#?[0-9a-f]{3,8}$/.test(value)) return parseHex(value);
  const numbers = value.match(/-?\d*\.?\d+%?/g)?.map((item) => item) ?? [];
  if (value.startsWith("hsl")) {
    if (numbers.length < 3) throw new Error("Use hsl(210, 100%, 56%).");
    const [h, s, l, alpha] = numbers.map((item) => parseFloat(item));
    return { ...hslToRgb({ h, s, l }), ...(alpha !== undefined ? { a: numbers[3].endsWith("%") ? alpha / 100 : alpha } : {}) };
  }
  if (numbers.length >= 3) {
    const channel = (item: string) => clamp(item.endsWith("%") ? (parseFloat(item) / 100) * 255 : parseFloat(item), 0, 255);
    const rgb: Rgb = { r: Math.round(channel(numbers[0])), g: Math.round(channel(numbers[1])), b: Math.round(channel(numbers[2])) };
    if (numbers[3] !== undefined) rgb.a = clamp(numbers[3].endsWith("%") ? parseFloat(numbers[3]) / 100 : parseFloat(numbers[3]), 0, 1);
    return rgb;
  }
  throw new Error("Use HEX (#1e90ff), rgb(30, 144, 255) or hsl(210, 100%, 56%).");
}

export function formatRgb({ r, g, b, a }: Rgb) {
  return a !== undefined && a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

export function formatHsl(rgb: Rgb) {
  const { h, s, l } = rgbToHsl(rgb);
  return rgb.a !== undefined && rgb.a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${rgb.a})` : `hsl(${h}, ${s}%, ${l}%)`;
}

function luminance({ r, g, b }: Rgb) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Median-cut palette from RGBA pixel data. Skips mostly transparent pixels; deterministic for the same input. */
export function medianCut(data: Uint8ClampedArray | Uint8Array, count: number, step = 1) {
  const pixels: [number, number, number][] = [];
  for (let index = 0; index < data.length; index += 4 * step) {
    if (data[index + 3] < 128) continue;
    pixels.push([data[index], data[index + 1], data[index + 2]]);
  }
  if (!pixels.length) return [];
  let boxes = [pixels];
  while (boxes.length < count) {
    let target = -1;
    let widest = -1;
    let channel = 0;
    boxes.forEach((box, index) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let min = 255;
        let max = 0;
        for (const pixel of box) {
          if (pixel[c] < min) min = pixel[c];
          if (pixel[c] > max) max = pixel[c];
        }
        if (max - min > widest) {
          widest = max - min;
          target = index;
          channel = c;
        }
      }
    });
    if (target < 0 || widest <= 0) break;
    const box = boxes[target].slice().sort((a, b) => a[channel] - b[channel]);
    // Split near the median, but never between pixels with the same value, so solid areas stay whole.
    const median = Math.floor(box.length / 2);
    const value = box[median][channel];
    let low = median;
    while (low > 0 && box[low - 1][channel] === value) low -= 1;
    let high = median;
    while (high < box.length && box[high][channel] === value) high += 1;
    let middle = median - low <= high - median ? low : high;
    if (middle <= 0 || middle >= box.length) middle = middle <= 0 ? high : low;
    boxes = [...boxes.slice(0, target), box.slice(0, middle), box.slice(middle), ...boxes.slice(target + 1)];
  }
  return boxes
    .map((box) => {
      const sum = box.reduce((acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]], [0, 0, 0]);
      return { rgb: { r: Math.round(sum[0] / box.length), g: Math.round(sum[1] / box.length), b: Math.round(sum[2] / box.length) }, share: box.length / pixels.length };
    })
    .sort((a, b) => b.share - a.share);
}

/** Simple harmonies from one base color. */
export function harmonies(base: Rgb) {
  const { h, s, l } = rgbToHsl(base);
  const at = (shift: number, lightness = l) => toHex(hslToRgb({ h: h + shift, s, l: lightness }));
  return {
    complementary: [toHex(base), at(180)],
    analogous: [at(-30), toHex(base), at(30)],
    triadic: [toHex(base), at(120), at(240)],
    shades: [90, 75, 60, 45, 30, 15].map((value) => at(0, value)),
  };
}
