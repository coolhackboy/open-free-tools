/**
 * Forgiving tool search: word prefixes, typos ("compres", "mrege"), both languages, synonyms
 * ("shrink" → compress, "join" → merge) and CJK substrings. Every query word must match something.
 */
import type { FreeTool } from '@/tools/catalog';

export type SearchDoc = {
  tool: FreeTool;
  title: string;
  /** Other names: catalog titles in both languages, slug words, kind and category. */
  alt: string;
  description: string;
};

const SYNONYMS: Record<string, string[]> = {
  jpeg: ['jpg'],
  pic: ['image', 'photo'],
  picture: ['image', 'photo'],
  img: ['image'],
  photo: ['image'],
  shrink: ['compress'],
  smaller: ['compress'],
  reduce: ['compress'],
  join: ['merge'],
  combine: ['merge'],
  cut: ['trim', 'crop', 'split'],
  enlarge: ['upscale', 'resize'],
  bigger: ['upscale'],
  record: ['recorder'],
  transcribe: ['speech', 'text', 'subtitle'],
  captions: ['subtitle'],
  srt: ['subtitle'],
  mp4: ['video'],
  sound: ['audio'],
  music: ['audio', 'music'],
  calc: ['calculator'],
  timer: ['timer', 'countdown', 'stopwatch', 'pomodoro'],
  clock: ['clock', 'timer'],
  game: ['games'],
  convert: ['converter'],
  converter: ['convert'],
  generator: ['maker', 'generate'],
  maker: ['generator'],
  qrcode: ['qr'],
  sha: ['hash'],
  md5: ['hash'],
  encode: ['encoder'],
  decode: ['decoder', 'decode'],
  ip: ['ip'],
  ocr: ['ocr', 'text'],
  sign: ['signature', 'sign'],
  esign: ['sign'],
  watermark: ['watermark'],
  bg: ['background'],
  colour: ['color'],
  grey: ['gray'],
};

const CJK = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[_./\\-]+/g, ' ');
}

function words(text: string) {
  return normalize(text).split(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]+/).filter(Boolean);
}

/**
 * Edit distance (optimal string alignment: insert, delete, substitute, swap two neighbours)
 * with an early exit once every cell in a row exceeds `max`. "mrege" is one edit from "merge".
 */
function within(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
      if (row[j] < best) best = row[j];
    }
    if (best > max) return false;
    before = prev;
    prev = row;
  }
  return prev[b.length] <= max;
}

type Indexed = { doc: SearchDoc; title: string[]; alt: string[]; desc: string[]; titleText: string; altText: string; descText: string };

export function buildIndex(docs: SearchDoc[]): Indexed[] {
  return docs.map((doc) => ({
    doc,
    title: words(doc.title),
    alt: words(doc.alt),
    desc: words(doc.description),
    titleText: normalize(doc.title),
    altText: normalize(doc.alt),
    descText: normalize(doc.description),
  }));
}

function scoreWord(term: string, list: string[], weight: number) {
  let best = 0;
  const fuzz = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  for (const word of list) {
    if (word === term) return weight;
    if (word.startsWith(term)) best = Math.max(best, weight * 0.85);
    else if (term.length >= 3 && word.includes(term)) best = Math.max(best, weight * 0.55);
    else if (fuzz && word.length >= 3 && (within(term, word, fuzz) || within(term, word.slice(0, term.length), fuzz))) best = Math.max(best, weight * 0.5);
  }
  return best;
}

function scoreTerm(term: string, item: Indexed) {
  if (CJK.test(term)) {
    if (item.titleText.includes(term)) return 10;
    if (item.altText.includes(term)) return 7;
    if (item.descText.includes(term)) return 2;
    return 0;
  }
  return Math.max(scoreWord(term, item.title, 10), scoreWord(term, item.alt, 7), scoreWord(term, item.desc, 2.5));
}

export function search(index: Indexed[], query: string): FreeTool[] {
  const raw = normalize(query).trim();
  if (!raw) return index.map((item) => item.doc.tool);
  const terms = raw.split(/\s+/).filter((term) => term && term !== 'free' && term !== '\u514d\u8d39');
  if (!terms.length) return index.map((item) => item.doc.tool);
  const SLUG_ALIASES: Record<string, string> = { jpeg: 'jpg', tif: 'tiff' };
  const ordered = terms.map((term) => SLUG_ALIASES[term] ?? term).join('-');
  const results: { tool: FreeTool; score: number; order: number }[] = [];
  index.forEach((item, order) => {
    let total = 0;
    for (const term of terms) {
      let score = scoreTerm(term, item);
      for (const synonym of SYNONYMS[term] ?? []) score = Math.max(score, scoreTerm(synonym, item) * 0.8);
      if (!score) return;
      total += score;
    }
    if (item.titleText.includes(raw)) total += 8;
    if (item.doc.tool.slug === raw.replace(/\s+/g, '-')) total += 20;
    // Word order matters for converters: "jpeg to pdf" should rank jpg-to-pdf above pdf-to-jpg.
    else if (terms.length > 1 && item.doc.tool.slug.includes(ordered)) total += 12;
    results.push({ tool: item.doc.tool, score: total, order });
  });
  return results.sort((a, b) => b.score - a.score || a.order - b.order).map((item) => item.tool);
}
