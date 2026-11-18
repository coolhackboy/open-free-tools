/** Pure text / encoding helpers for the "dev" free tools. Browser and Node (check script) safe. */

/* Base64 ----------------------------------------------------------------- */

export function bytesToBase64(bytes: Uint8Array, urlSafe = false) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  const out = btoa(binary);
  return urlSafe ? out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : out;
}

export function base64ToBytes(input: string) {
  let value = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (/^data:[^,]*;base64,/i.test(input.trim())) value = input.trim().replace(/^data:[^,]*;base64,/i, "").replace(/\s+/g, "");
  if (/[^A-Za-z0-9+/=]/.test(value)) throw new Error("This is not valid Base64.");
  value = value.replace(/=+$/, "");
  if (value.length % 4 === 1) throw new Error("This Base64 has the wrong length.");
  value += "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeBase64Text(text: string, urlSafe = false) {
  return bytesToBase64(new TextEncoder().encode(text), urlSafe);
}

export function decodeBase64Text(input: string) {
  const bytes = base64ToBytes(input);
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), binary: false, bytes };
  } catch {
    return { text: "", binary: true, bytes };
  }
}

/* URL -------------------------------------------------------------------- */

export function encodeUrlText(text: string, whole = false) {
  return whole ? encodeURI(text) : encodeURIComponent(text);
}

export function decodeUrlText(text: string, plusAsSpace = true) {
  const source = plusAsSpace ? text.replace(/\+/g, " ") : text;
  try {
    return decodeURIComponent(source);
  } catch {
    throw new Error("This text has a broken % escape.");
  }
}

/* HTML entities ---------------------------------------------------------- */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", copy: "©", reg: "®", trade: "™",
  hellip: "…", mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", euro: "€",
  pound: "£", yen: "¥", cent: "¢", sect: "§", deg: "°", plusmn: "±", times: "×", divide: "÷",
  middot: "·", bull: "•", laquo: "«", raquo: "»", iexcl: "¡", iquest: "¿", para: "¶", micro: "µ",
  frac12: "½", frac14: "¼", frac34: "¾", larr: "←", rarr: "→", uarr: "↑", darr: "↓", hearts: "♥",
};

export function encodeHtmlEntities(text: string, nonAscii = false) {
  let out = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  if (nonAscii) out = Array.from(out, (char) => (char.codePointAt(0)! > 126 ? `&#x${char.codePointAt(0)!.toString(16).toUpperCase()};` : char)).join("");
  return out;
}

export function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? NAMED[body] ?? whole;
  });
}

/* Hashes ----------------------------------------------------------------- */

const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);

export function md5Bytes(input: Uint8Array) {
  const length = input.length;
  const padded = new Uint8Array((((length + 8) >> 6) + 1) * 64);
  padded.set(input);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (length * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(length / 0x20000000), true);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }
      const next = d;
      d = c;
      c = b;
      const sum = (a + f + MD5_K[index] + words[g]) >>> 0;
      b = (b + ((sum << MD5_S[index]) | (sum >>> (32 - MD5_S[index])))) >>> 0;
      a = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((value, index) => outView.setUint32(index * 4, value, true));
  return out;
}

export function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const HASH_ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export async function hashBytes(bytes: Uint8Array, algorithm: HashAlgorithm) {
  if (algorithm === "MD5") return toHex(md5Bytes(bytes));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return toHex(new Uint8Array(await crypto.subtle.digest(algorithm, copy.buffer as ArrayBuffer)));
}

export function hashText(text: string, algorithm: HashAlgorithm) {
  return hashBytes(new TextEncoder().encode(text), algorithm);
}

/* UUID ------------------------------------------------------------------- */

export function uuidV4(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)) {
  const bytes = random(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type UuidStyle = { upper?: boolean; braces?: boolean; hyphens?: boolean };

export function styleUuid(uuid: string, style: UuidStyle) {
  let out = style.hyphens === false ? uuid.replace(/-/g, "") : uuid;
  if (style.upper) out = out.toUpperCase();
  return style.braces ? `{${out}}` : out;
}

export function isUuid(value: string) {
  return /^\{?[0-9a-f]{8}-?[0-9a-f]{4}-?[1-8][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}\}?$/i.test(value.trim());
}

/* JWT -------------------------------------------------------------------- */

export type DecodedJwt = {
  header: Record<string, unknown>;
  payload: unknown;
  signature: string;
  times: { claim: string; value: number; iso: string }[];
  expired: boolean | null;
};

export function decodeJwt(token: string, nowMs: number): DecodedJwt {
  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".");
  if (parts.length < 2 || parts.length > 3) throw new Error("A JWT has three parts separated by dots.");
  const read = (part: string, label: string) => {
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(part)));
    } catch {
      throw new Error(`The ${label} is not Base64URL-encoded JSON.`);
    }
  };
  const header = read(parts[0], "header");
  const payload = read(parts[1], "payload");
  if (!header || typeof header !== "object" || Array.isArray(header)) throw new Error("The header must be a JSON object.");
  const times: DecodedJwt["times"] = [];
  let expired: boolean | null = null;
  if (payload && typeof payload === "object") {
    for (const claim of ["iat", "nbf", "exp"]) {
      const value = (payload as Record<string, unknown>)[claim];
      if (typeof value === "number" && Number.isFinite(value)) {
        times.push({ claim, value, iso: new Date(value * 1000).toISOString() });
        if (claim === "exp") expired = value * 1000 < nowMs;
      }
    }
  }
  return { header, payload, signature: parts[2] ?? "", times, expired };
}

/* Case ------------------------------------------------------------------- */

export const CASES = ["upper", "lower", "title", "sentence", "camel", "pascal", "snake", "kebab", "constant"] as const;
export type CaseName = (typeof CASES)[number];

function words(text: string) {
  return text
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export function convertCase(text: string, name: CaseName) {
  switch (name) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.toLowerCase().replace(/(^|[\s\-–—("'“‘/])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
    case "sentence":
      return text.toLowerCase().replace(/(^\s*|[.!?。！？]\s+|\n\s*)(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
    case "camel":
      return text.split("\n").map((row) => words(row).map((word, index) => (index ? cap(word) : word.toLowerCase())).join("")).join("\n");
    case "pascal":
      return text.split("\n").map((row) => words(row).map(cap).join("")).join("\n");
    case "snake":
      return text.split("\n").map((row) => words(row).map((word) => word.toLowerCase()).join("_")).join("\n");
    case "kebab":
      return text.split("\n").map((row) => words(row).map((word) => word.toLowerCase()).join("-")).join("\n");
    case "constant":
      return text.split("\n").map((row) => words(row).map((word) => word.toUpperCase()).join("_")).join("\n");
  }
}

/* Lorem ipsum ------------------------------------------------------------ */

const LOREM = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export type LoremUnit = "paragraphs" | "sentences" | "words";

export function lorem(count: number, unit: LoremUnit, seed = 1, classic = true) {
  const rand = seededRandom(seed);
  const pick = () => LOREM[Math.floor(rand() * LOREM.length)];
  const sentence = (first: boolean) => {
    const size = 6 + Math.floor(rand() * 10);
    const list = Array.from({ length: size }, pick);
    if (first && classic) list.splice(0, 5, "lorem", "ipsum", "dolor", "sit", "amet");
    const text = list.join(" ");
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  };
  const total = Math.max(1, Math.min(unit === "words" ? 5000 : 200, Math.floor(count)));
  if (unit === "words") {
    const list = Array.from({ length: total }, pick);
    if (classic) list.splice(0, Math.min(5, total), ...["lorem", "ipsum", "dolor", "sit", "amet"].slice(0, total));
    const text = list.join(" ");
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }
  if (unit === "sentences") return Array.from({ length: total }, (_, index) => sentence(index === 0)).join(" ");
  return Array.from({ length: total }, (_, index) =>
    Array.from({ length: 4 + Math.floor(rand() * 4) }, (__, inner) => sentence(index === 0 && inner === 0)).join(" "),
  ).join("\n\n");
}

/* Lines ------------------------------------------------------------------ */

export type LineOptions = { ignoreCase?: boolean; trim?: boolean; dropEmpty?: boolean };

export function dedupeLines(text: string, options: LineOptions = {}) {
  const seen = new Set<string>();
  const out: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const value = options.trim ? raw.trim() : raw;
    if (options.dropEmpty && !value.trim()) continue;
    const key = options.ignoreCase ? value.toLowerCase() : value;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return { text: out.join("\n"), before: lines.length, after: out.length };
}

export type SortOrder = "az" | "za" | "natural" | "length" | "reverse" | "shuffle";

export function sortLines(text: string, order: SortOrder, options: LineOptions & { seed?: number; locale?: string } = {}) {
  let lines = text.split(/\r?\n/).map((line) => (options.trim ? line.trim() : line));
  if (options.dropEmpty) lines = lines.filter((line) => line.trim());
  const collator = new Intl.Collator(options.locale || "en", { sensitivity: options.ignoreCase ? "base" : "variant", numeric: order === "natural" });
  if (order === "az" || order === "natural") lines.sort(collator.compare);
  else if (order === "za") lines.sort((a, b) => collator.compare(b, a));
  else if (order === "length") lines.sort((a, b) => a.length - b.length || collator.compare(a, b));
  else if (order === "reverse") lines.reverse();
  else {
    const rand = seededRandom(options.seed ?? 1);
    for (let index = lines.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rand() * (index + 1));
      [lines[index], lines[swap]] = [lines[swap], lines[index]];
    }
  }
  return lines.join("\n");
}

/* Timestamps ------------------------------------------------------------- */

export type TimestampUnit = "auto" | "s" | "ms" | "us" | "ns";

/** Returns epoch milliseconds for a number (seconds / ms / µs / ns) or a date string. */
export function parseTimestamp(input: string, unit: TimestampUnit = "auto") {
  const value = input.trim();
  if (!value) throw new Error("Enter a timestamp or a date.");
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const number = Number(value);
    const digits = value.replace(/^-/, "").split(".")[0].length;
    const chosen = unit !== "auto" ? unit : digits > 16 ? "ns" : digits > 14 ? "us" : digits > 11 ? "ms" : "s";
    const ms = chosen === "s" ? number * 1000 : chosen === "ms" ? number : chosen === "us" ? number / 1000 : number / 1e6;
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new Error("That timestamp is out of range.");
    return { ms, unit: chosen };
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error("That date could not be read. Try 2026-10-24 12:00:00 or an ISO date.");
  return { ms, unit: "date" as const };
}

export function describeTimestamp(ms: number) {
  const date = new Date(ms);
  return {
    seconds: Math.floor(ms / 1000),
    milliseconds: Math.round(ms),
    iso: date.toISOString(),
    utc: date.toUTCString(),
  };
}

export function relativeTime(ms: number, nowMs: number, locale = "en") {
  const diff = (ms - nowMs) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of units) if (Math.abs(diff) >= size || unit === "second") return format.format(Math.round(diff / size), unit);
  return "";
}

/* Number bases ----------------------------------------------------------- */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseBigInt(input: string, base: number) {
  let value = input.trim().toLowerCase().replace(/[\s_,]/g, "");
  let negative = false;
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  }
  const prefix = value.match(/^0([xbo])/);
  if (prefix) {
    const prefixBase = prefix[1] === "x" ? 16 : prefix[1] === "b" ? 2 : 8;
    if (prefixBase === base) value = value.slice(2);
  }
  if (!value) throw new Error("Enter a number.");
  const big = BigInt(base);
  let out = BigInt(0);
  for (const char of value) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0 || digit >= base) throw new Error(`"${char}" is not a base-${base} digit.`);
    out = out * big + BigInt(digit);
  }
  return negative ? -out : out;
}

export function convertBase(input: string, from: number, to: number) {
  return parseBigInt(input, from).toString(to);
}

export function groupDigits(value: string, size: number) {
  const negative = value.startsWith("-");
  const body = negative ? value.slice(1) : value;
  const out: string[] = [];
  for (let end = body.length; end > 0; end -= size) out.unshift(body.slice(Math.max(0, end - size), end));
  return (negative ? "-" : "") + out.join(" ");
}

/* Regex ------------------------------------------------------------------ */

export type RegexMatch = { index: number; text: string; groups: (string | null)[]; named: Record<string, string> | null };

/**
 * Self-contained on purpose: its source is copied into a Blob worker (see devTools.tsx),
 * so it must not reference anything outside its own body.
 */
export function runRegex(pattern: string, flags: string, input: string, limit: number) {
  const unique = Array.from(new Set(flags.split(""))).join("");
  const global = unique.includes("g") ? unique : `${unique}g`;
  const regex = new RegExp(pattern, global);
  const matches: { index: number; text: string; groups: (string | null)[]; named: Record<string, string> | null }[] = [];
  let found: RegExpExecArray | null;
  while ((found = regex.exec(input)) !== null) {
    matches.push({
      index: found.index,
      text: found[0],
      groups: found.slice(1).map((group) => (group === undefined ? null : group)),
      named: found.groups ? Object.assign({}, found.groups) : null,
    });
    if (found[0] === "") regex.lastIndex += 1;
    if (!unique.includes("g") || matches.length >= limit) break;
  }
  return matches;
}

/* Cron ------------------------------------------------------------------- */

const CRON_MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export type CronField = { values: number[]; any: boolean; raw: string };
export type CronSchedule = { minute: CronField; hour: CronField; day: CronField; month: CronField; weekday: CronField };

function parseField(raw: string, min: number, max: number, names?: string[]): CronField {
  const values = new Set<number>();
  const token = (part: string) => {
    const lower = part.toLowerCase();
    if (names) {
      const at = names.indexOf(lower);
      if (at >= 0) return at + min;
    }
    if (!/^\d+$/.test(part)) throw new Error(`"${part}" is not valid in this field.`);
    return Number(part);
  };
  for (const part of raw.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`"${part}" has an invalid step.`);
    let from: number;
    let to: number;
    if (range === "*" || range === "?") {
      from = min;
      to = max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      from = token(a);
      to = token(b);
    } else {
      from = token(range);
      to = stepText === undefined ? from : max;
    }
    if (from < min || to > max || from > to) throw new Error(`"${part}" is outside ${min}-${max}.`);
    for (let value = from; value <= to; value += step) values.add(max === 7 && value === 7 ? 0 : value);
  }
  return { values: [...values].sort((a, b) => a - b), any: raw === "*" || raw === "?", raw };
}

export function parseCron(expression: string): CronSchedule {
  const source = CRON_MACROS[expression.trim().toLowerCase()] ?? expression.trim();
  const fields = source.split(/\s+/);
  if (fields.length !== 5) throw new Error("Use 5 fields: minute hour day-of-month month day-of-week.");
  return {
    minute: parseField(fields[0], 0, 59),
    hour: parseField(fields[1], 0, 23),
    day: parseField(fields[2], 1, 31),
    month: parseField(fields[3], 1, 12, MONTH_NAMES),
    weekday: parseField(fields[4], 0, 7, DAY_NAMES),
  };
}

function dayMatches(schedule: CronSchedule, date: number, weekday: number) {
  const dom = schedule.day.values.includes(date);
  const dow = schedule.weekday.values.includes(weekday);
  if (schedule.day.any && schedule.weekday.any) return true;
  if (schedule.day.any) return dow;
  if (schedule.weekday.any) return dom;
  return dom || dow;
}

/** Next run times after `fromMs`. utc=true uses UTC wall-clock fields, otherwise the runtime's local zone. */
export function nextCronRuns(schedule: CronSchedule, fromMs: number, count: number, utc = false) {
  const date = new Date(fromMs);
  const get = {
    min: () => (utc ? date.getUTCMinutes() : date.getMinutes()),
    hour: () => (utc ? date.getUTCHours() : date.getHours()),
    day: () => (utc ? date.getUTCDate() : date.getDate()),
    wd: () => (utc ? date.getUTCDay() : date.getDay()),
    month: () => (utc ? date.getUTCMonth() : date.getMonth()) + 1,
  };
  if (utc) date.setUTCSeconds(0, 0);
  else date.setSeconds(0, 0);
  const addMinutes = (value: number) => date.setTime(date.getTime() + value * 60000);
  addMinutes(1);
  const out: number[] = [];
  for (let guard = 0; guard < 200000 && out.length < count; guard += 1) {
    if (!schedule.month.values.includes(get.month())) {
      if (utc) date.setUTCMonth(date.getUTCMonth() + 1, 1);
      else date.setMonth(date.getMonth() + 1, 1);
      if (utc) date.setUTCHours(0, 0, 0, 0);
      else date.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(schedule, get.day(), get.wd())) {
      if (utc) date.setUTCDate(date.getUTCDate() + 1);
      else date.setDate(date.getDate() + 1);
      if (utc) date.setUTCHours(0, 0, 0, 0);
      else date.setHours(0, 0, 0, 0);
      continue;
    }
    if (!schedule.hour.values.includes(get.hour())) {
      if (utc) date.setUTCHours(date.getUTCHours() + 1, 0, 0, 0);
      else date.setHours(date.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!schedule.minute.values.includes(get.min())) {
      addMinutes(1);
      continue;
    }
    out.push(date.getTime());
    addMinutes(1);
  }
  return out;
}

const pad2 = (value: number) => String(value).padStart(2, "0");

function listText(field: CronField, label: (value: number) => string, zh: boolean) {
  const values = field.values;
  const ranges: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    let end = index;
    while (end + 1 < values.length && values[end + 1] === values[end] + 1) end += 1;
    if (end - index >= 2) ranges.push(`${label(values[index])}${zh ? "至" : " through "}${label(values[end])}`);
    else for (let inner = index; inner <= end; inner += 1) ranges.push(label(values[inner]));
    index = end;
  }
  if (zh) return ranges.join("、");
  return ranges.length > 1 ? `${ranges.slice(0, -1).join(", ")} and ${ranges[ranges.length - 1]}` : ranges[0] ?? "";
}

function stepOf(field: CronField) {
  const match = field.raw.match(/^\*\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function describeCron(schedule: CronSchedule, zh = false) {
  const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const daysZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const { minute, hour, day, month, weekday } = schedule;
  let time: string;
  const minuteStep = stepOf(minute);
  const hourStep = stepOf(hour);
  if (minute.any && hour.any) time = zh ? "每分钟" : "Every minute";
  else if (minuteStep && hour.any) time = zh ? `每 ${minuteStep} 分钟` : `Every ${minuteStep} minutes`;
  else if (minute.values.length === 1 && hourStep) time = zh ? `每 ${hourStep} 小时的第 ${minute.values[0]} 分` : `At minute ${minute.values[0]} past every ${hourStep} hours`;
  else if (minute.values.length === 1 && hour.any) time = zh ? `每小时的第 ${minute.values[0]} 分` : `At minute ${minute.values[0]} past every hour`;
  else if (minute.values.length * hour.values.length <= 6) {
    const times = hour.values.flatMap((h) => minute.values.map((m) => `${pad2(h)}:${pad2(m)}`));
    time = zh ? `在 ${times.join("、")}` : `At ${times.length > 1 ? `${times.slice(0, -1).join(", ")} and ${times[times.length - 1]}` : times[0]}`;
  } else {
    time = zh
      ? `在 ${listText(hour, (v) => `${v} 点`, true)} 的第 ${listText(minute, String, true)} 分`
      : `At minute ${listText(minute, String, false)} past hour ${listText(hour, String, false)}`;
  }
  const parts = [time];
  if (!day.any) parts.push(zh ? `每月 ${listText(day, (v) => `${v} 日`, true)}` : `on day ${listText(day, String, false)} of the month`);
  if (!weekday.any) parts.push(zh ? `${!day.any ? "或" : ""}${listText(weekday, (v) => daysZh[v], true)}` : `${!day.any ? "or " : ""}on ${listText(weekday, (v) => daysEn[v], false)}`);
  if (!month.any) parts.push(zh ? `仅 ${listText(month, (v) => `${v} 月`, true)}` : `in ${listText(month, (v) => monthsEn[v - 1], false)}`);
  return zh ? parts.join("，") : parts.join(", ");
}
