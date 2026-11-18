import { getFreeTool, type FreeToolCategoryId, type FreeToolKind } from "./catalog.ts";

export type CardMark =
  | { t: "r"; x: number; y: number; w: number; h: number; f: string; rx?: number; s?: string; sw?: number; o?: number }
  | { t: "c"; x: number; y: number; r: number; f: string; s?: string; sw?: number; o?: number }
  | { t: "p"; d: string; f?: string; s?: string; w?: number; o?: number }
  | { t: "t"; x: number; y: number; v: string; z: number; f: string; w?: number; a?: "start" | "middle" | "end"; ff?: "serif" | "mono"; st?: "italic" };

export type CardCover = { background: string; marks: CardMark[] };

const INK = "#111111";
const PAPER = "#ffffff";
const CREAM = "#f4f2ec";
const PINK = "#f3b4a4";
const BLUE = "#7eb6ff";
const LIME = "#d4ff00";
const GREEN = "#3d8f6e";
const RED = "#ff5a4e";
const YELLOW = "#ffd84d";
const VIOLET = "#8c7bff";
const MINT = "#8fd9b6";
const ORANGE = "#ff9a4d";
const GRAY = "#bdb7aa";
const SKY = "#cfe3ff";
const WORD = "#3d6df2";
const CAD = "#2b6cb0";
const SCREEN = "#2fbf5a";

const BACKGROUNDS: Record<FreeToolCategoryId, string> = {
  image: "#fde4da",
  video: "#dce8ff",
  pdf: "#fbe3ea",
  diagrams: "#e8f6c8",
  games: "#ece2ff",
  devices: "#e3e7ee",
  everyday: "#fff0c2",
  data: "#d6f1e6",
  "3d": "#dceff6",
  craft: "#ffe7c7",
  codes: "#f1e9da",
};

const n = (value: number) => Math.round(value * 10) / 10;

function rect(x: number, y: number, w: number, h: number, f: string, rx = 0, s?: string, sw?: number, o?: number): CardMark {
  const mark: CardMark = { t: "r", x: n(x), y: n(y), w: n(w), h: n(h), f };
  if (rx) mark.rx = rx;
  if (s) mark.s = s;
  if (sw) mark.sw = sw;
  if (o !== undefined) mark.o = o;
  return mark;
}

function circle(x: number, y: number, r: number, f: string, s?: string, sw?: number, o?: number): CardMark {
  const mark: CardMark = { t: "c", x: n(x), y: n(y), r: n(r), f };
  if (s) mark.s = s;
  if (sw) mark.sw = sw;
  if (o !== undefined) mark.o = o;
  return mark;
}

function path(d: string, f?: string, s?: string, w?: number, o?: number): CardMark {
  const mark: CardMark = { t: "p", d };
  if (f) mark.f = f;
  if (s) mark.s = s;
  if (w) mark.w = w;
  if (o !== undefined) mark.o = o;
  return mark;
}

function line(d: string, s = INK, w = 4, o?: number): CardMark {
  return path(d, undefined, s, w, o);
}

function text(x: number, y: number, v: string, z: number, f = INK, options: { w?: number; a?: "start" | "middle" | "end"; ff?: "serif" | "mono"; st?: "italic" } = {}): CardMark {
  return { t: "t", x: n(x), y: n(y), v, z, f, ...options };
}

function hashSlug(slug: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function rngFor(slug: string) {
  let state = hashSlug(slug);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)) >>> 0;
    return (mixed ^ (mixed >>> 14)) >>> 0;
  };
}

/* Shared pieces ---------------------------------------------------------- */

function card(x: number, y: number, w: number, h: number, f = PAPER, rx = 10): CardMark[] {
  return [rect(x + 4, y + 4, w, h, INK, rx), rect(x, y, w, h, f, rx, INK, 3)];
}

function chip(label: string, y = 160, fill = INK, color = LIME): CardMark[] {
  const width = Math.max(40, Math.round(label.length * 8.6 + 22));
  return [rect(100 - width / 2, y, width, 26, fill, 13), text(100, y + 18, label, 14, color)];
}

function scenery(x: number, y: number, w: number, h: number, sky = SKY, sun = YELLOW, hill = GREEN): CardMark[] {
  const s = Math.min(w, h);
  return [
    rect(x, y, w, h, sky, 3),
    circle(x + w * 0.28, y + h * 0.32, s * 0.12, sun),
    path(`M${n(x)} ${n(y + h)} L${n(x + w * 0.34)} ${n(y + h * 0.52)} L${n(x + w * 0.52)} ${n(y + h * 0.74)} L${n(x + w * 0.72)} ${n(y + h * 0.44)} L${n(x + w)} ${n(y + h)} Z`, hill),
  ];
}

function photo(x: number, y: number, w: number, h: number, sky = SKY, sun = YELLOW, hill = GREEN): CardMark[] {
  return [...card(x, y, w, h, PAPER, 8), ...scenery(x + 6, y + 6, w - 12, h - 12, sky, sun, hill)];
}

function play(cx: number, cy: number, size: number, fill = LIME): CardMark {
  return path(`M${n(cx - size * 0.4)} ${n(cy - size * 0.5)} L${n(cx - size * 0.4)} ${n(cy + size * 0.5)} L${n(cx + size * 0.5)} ${n(cy)} Z`, fill);
}

function videoFrame(x: number, y: number, w: number, h: number, accent = LIME): CardMark[] {
  return [...card(x, y, w, h, INK, 10), play(x + w / 2, y + h / 2, Math.min(w, h) * 0.36, accent)];
}

const WAVE = [0.35, 0.7, 0.5, 0.95, 0.6, 0.3, 0.8, 0.55, 1, 0.45, 0.7, 0.4, 0.85, 0.5, 0.65];

function wave(x: number, cy: number, w: number, h: number, fill: string, count = 11, offset = 0): CardMark[] {
  const gap = 3;
  const bar = Math.max(3, (w - gap * (count - 1)) / count);
  return Array.from({ length: count }, (_, index) => {
    const height = Math.max(6, h * WAVE[(index + offset) % WAVE.length]);
    return rect(x + index * (bar + gap), cy - height / 2, bar, height, fill, Math.min(3, bar / 2));
  });
}

function textLines(x: number, y: number, w: number, rows: number, fill = GRAY, gap = 10, height = 5): CardMark[] {
  const widths = [1, 0.82, 0.94, 0.6, 0.88, 0.72];
  return Array.from({ length: rows }, (_, index) => rect(x, y + index * gap, w * widths[index % widths.length], height, fill, height / 2));
}

function page(x: number, y: number, w: number, h: number, rows = 5, fill = PAPER): CardMark[] {
  return [...card(x, y, w, h, fill, 6), ...textLines(x + 12, y + 16, w - 24, rows)];
}

function face(cx: number, cy: number, r: number, fill = PINK): CardMark[] {
  return [
    circle(cx + 3, cy + 3, r, INK),
    circle(cx, cy, r, fill, INK, 3),
    circle(cx - r * 0.35, cy - r * 0.15, r * 0.1, INK),
    circle(cx + r * 0.35, cy - r * 0.15, r * 0.1, INK),
    line(`M${n(cx - r * 0.38)} ${n(cy + r * 0.25)} Q${n(cx)} ${n(cy + r * 0.62)} ${n(cx + r * 0.38)} ${n(cy + r * 0.25)}`, INK, 3),
  ];
}

function person(cx: number, top: number, size: number, fill = PINK): CardMark[] {
  return [
    path(`M${n(cx - size * 0.62)} ${n(top + size * 1.3)} Q${n(cx - size * 0.62)} ${n(top + size * 0.72)} ${n(cx)} ${n(top + size * 0.72)} Q${n(cx + size * 0.62)} ${n(top + size * 0.72)} ${n(cx + size * 0.62)} ${n(top + size * 1.3)} Z`, fill, INK, 3),
    circle(cx, top + size * 0.32, size * 0.3, fill, INK, 3),
  ];
}

function arrowHead(fromX: number, fromY: number, toX: number, toY: number, color = INK, width = 5): CardMark {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 10;
  const left = [toX - size * Math.cos(angle - 0.55), toY - size * Math.sin(angle - 0.55)];
  const right = [toX - size * Math.cos(angle + 0.55), toY - size * Math.sin(angle + 0.55)];
  return line(`M${n(left[0])} ${n(left[1])} L${n(toX)} ${n(toY)} L${n(right[0])} ${n(right[1])}`, color, width);
}

function arrow(x1: number, y1: number, x2: number, y2: number, color = INK, width = 5): CardMark[] {
  return [line(`M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`, color, width), arrowHead(x1, y1, x2, y2, color, width)];
}

function curvedArrow(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, color = INK, width = 5): CardMark[] {
  return [line(`M${n(x1)} ${n(y1)} Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`, color, width), arrowHead(cx, cy, x2, y2, color, width)];
}

function magnifier(cx: number, cy: number, r: number, label?: string): CardMark[] {
  const marks: CardMark[] = [
    line(`M${n(cx + r * 0.7)} ${n(cy + r * 0.7)} L${n(cx + r * 1.45)} ${n(cy + r * 1.45)}`, INK, 10),
    circle(cx, cy, r, PAPER, INK, 6),
  ];
  if (label) marks.push(text(cx, cy + r * 0.3, label, Math.round(r * 0.8)));
  return marks;
}

function star(cx: number, cy: number, size: number, fill = LIME): CardMark {
  const s = size;
  return path(`M${cx} ${cy - s} L${n(cx + s * 0.25)} ${n(cy - s * 0.25)} L${cx + s} ${cy} L${n(cx + s * 0.25)} ${n(cy + s * 0.25)} L${cx} ${cy + s} L${n(cx - s * 0.25)} ${n(cy + s * 0.25)} L${cx - s} ${cy} L${n(cx - s * 0.25)} ${n(cy - s * 0.25)} Z`, fill, INK, 2);
}

function cube(cx: number, cy: number, s: number): CardMark[] {
  const dy = s * 0.58;
  return [
    path(`M${n(cx)} ${n(cy - dy)} L${n(cx + s)} ${n(cy)} L${n(cx)} ${n(cy + dy)} L${n(cx - s)} ${n(cy)} Z`, "#c9bfff", INK, 2.5),
    path(`M${n(cx - s)} ${n(cy)} L${n(cx)} ${n(cy + dy)} L${n(cx)} ${n(cy + dy + s)} L${n(cx - s)} ${n(cy + s)} Z`, VIOLET, INK, 2.5),
    path(`M${n(cx + s)} ${n(cy)} L${n(cx)} ${n(cy + dy)} L${n(cx)} ${n(cy + dy + s)} L${n(cx + s)} ${n(cy + s)} Z`, "#6b5be0", INK, 2.5),
  ];
}

function pin(cx: number, cy: number, s: number, fill = RED): CardMark[] {
  return [
    path(`M${n(cx)} ${n(cy + s)} C${n(cx - s * 0.9)} ${n(cy - s * 0.1)} ${n(cx - s * 0.7)} ${n(cy - s)} ${n(cx)} ${n(cy - s)} C${n(cx + s * 0.7)} ${n(cy - s)} ${n(cx + s * 0.9)} ${n(cy - s * 0.1)} ${n(cx)} ${n(cy + s)} Z`, fill, INK, 2.5),
    circle(cx, cy - s * 0.45, s * 0.25, PAPER),
  ];
}

function table(x: number, y: number, w: number, h: number, cols: number, rows: number, header = GREEN): CardMark[] {
  const marks: CardMark[] = [rect(x, y, w, h / rows, header, 2)];
  for (let col = 1; col < cols; col += 1) marks.push(rect(x + (w / cols) * col - 0.75, y, 1.5, h, INK));
  for (let row = 1; row < rows; row += 1) marks.push(rect(x, y + (h / rows) * row - 0.75, w, 1.5, INK));
  marks.push(rect(x, y, w, h, "none", 2, INK, 2));
  return marks;
}

function openPadlock(cx: number, cy: number): CardMark[] {
  return [
    line(`M${cx - 14} ${cy - 6} V${cy - 22} Q${cx - 14} ${cy - 38} ${cx} ${cy - 38} Q${cx + 14} ${cy - 38} ${cx + 14} ${cy - 30}`, INK, 6),
    ...card(cx - 24, cy - 6, 48, 40, YELLOW, 8),
    circle(cx, cy + 10, 5, INK),
    rect(cx - 2, cy + 12, 4, 10, INK, 2),
  ];
}

function crossTag(x: number, y: number, label: string): CardMark[] {
  return [
    ...card(x, y, 80, 54, PAPER, 10),
    circle(x + 16, y + 27, 5, INK),
    text(x + 50, y + 33, label, 15),
    line(`M${x - 4} ${y + 62} L${x + 86} ${y - 8}`, RED, 6),
  ];
}

function speaker(cx: number, cy: number, s: number, fill = INK): CardMark {
  return path(`M${n(cx - s)} ${n(cy - s * 0.4)} H${n(cx - s * 0.4)} L${n(cx + s * 0.4)} ${n(cy - s)} V${n(cy + s)} L${n(cx - s * 0.4)} ${n(cy + s * 0.4)} H${n(cx - s)} Z`, fill);
}

function mic(cx: number, top: number, s = 1, fill = INK): CardMark[] {
  return [
    rect(cx - 16 * s, top, 32 * s, 58 * s, fill, 16 * s),
    rect(cx - 9 * s, top + 14 * s, 18 * s, 3, PAPER, 1.5, undefined, undefined, 0.6),
    rect(cx - 9 * s, top + 24 * s, 18 * s, 3, PAPER, 1.5, undefined, undefined, 0.6),
    line(`M${n(cx - 26 * s)} ${n(top + 38 * s)} Q${n(cx - 26 * s)} ${n(top + 74 * s)} ${n(cx)} ${n(top + 74 * s)} Q${n(cx + 26 * s)} ${n(top + 74 * s)} ${n(cx + 26 * s)} ${n(top + 38 * s)}`, INK, 5),
    rect(cx - 3, top + 74 * s, 6, 16 * s, INK),
    rect(cx - 18 * s, top + 88 * s, 36 * s, 6, INK, 3),
  ];
}

function gauge(cx: number, cy: number, r: number, angle: number, segments: string[]): CardMark[] {
  const marks: CardMark[] = [];
  const step = Math.PI / segments.length;
  segments.forEach((color, index) => {
    const a1 = Math.PI + step * index;
    const a2 = a1 + step;
    marks.push(line(`M${n(cx + r * Math.cos(a1))} ${n(cy + r * Math.sin(a1))} A${r} ${r} 0 0 1 ${n(cx + r * Math.cos(a2))} ${n(cy + r * Math.sin(a2))}`, color, 14));
  });
  const a = Math.PI + (Math.PI * angle);
  marks.push(line(`M${cx} ${cy} L${n(cx + (r - 14) * Math.cos(a))} ${n(cy + (r - 14) * Math.sin(a))}`, INK, 6));
  marks.push(circle(cx, cy, 9, INK));
  return marks;
}

function clockHands(cx: number, cy: number, r: number, hour: number, minute: number): CardMark[] {
  const h = (hour / 12) * Math.PI * 2 - Math.PI / 2;
  const m = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  return [
    line(`M${cx} ${cy} L${n(cx + r * 0.5 * Math.cos(h))} ${n(cy + r * 0.5 * Math.sin(h))}`, INK, 6),
    line(`M${cx} ${cy} L${n(cx + r * 0.78 * Math.cos(m))} ${n(cy + r * 0.78 * Math.sin(m))}`, RED, 4),
    circle(cx, cy, 5, INK),
  ];
}

function wedge(cx: number, cy: number, r: number, from: number, to: number, fill: string): CardMark {
  const a1 = (from / 360) * Math.PI * 2 - Math.PI / 2;
  const a2 = (to / 360) * Math.PI * 2 - Math.PI / 2;
  const large = to - from > 180 ? 1 : 0;
  return path(`M${cx} ${cy} L${n(cx + r * Math.cos(a1))} ${n(cy + r * Math.sin(a1))} A${r} ${r} 0 ${large} 1 ${n(cx + r * Math.cos(a2))} ${n(cy + r * Math.sin(a2))} Z`, fill, INK, 2.5);
}

function pixelGrid(x: number, y: number, cell: number, rows: string[], palette: Record<string, string>, outline = true): CardMark[] {
  const marks: CardMark[] = [];
  rows.forEach((row, rowIndex) => {
    [...row].forEach((key, colIndex) => {
      const color = palette[key];
      if (!color) return;
      marks.push(rect(x + colIndex * cell, y + rowIndex * cell, cell, cell, color, 0, outline ? INK : undefined, outline ? 1.5 : undefined));
    });
  });
  return marks;
}

const HEART = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];

/* File formats ----------------------------------------------------------- */

type Family = "image" | "vector" | "gif" | "video" | "audio" | "doc" | "text" | "word" | "sheet" | "slides" | "code" | "mesh" | "cad" | "geo" | "medical" | "bank";

const FORMATS: Record<string, [string, Family]> = {
  png: ["PNG", "image"],
  jpg: ["JPG", "image"],
  image: ["IMG", "image"],
  svg: ["SVG", "vector"],
  gif: ["GIF", "gif"],
  video: ["VIDEO", "video"],
  mp4: ["MP4", "video"],
  mp3: ["MP3", "audio"],
  audio: ["AUDIO", "audio"],
  speech: ["VOICE", "audio"],
  text: ["TXT", "text"],
  pdf: ["PDF", "doc"],
  word: ["DOC", "word"],
  docx: ["DOCX", "word"],
  excel: ["XLS", "sheet"],
  xlsx: ["XLSX", "sheet"],
  csv: ["CSV", "sheet"],
  qbo: ["QBO", "sheet"],
  parquet: ["PARQUET", "sheet"],
  sqlite: ["SQLITE", "sheet"],
  ppt: ["PPT", "slides"],
  pptx: ["PPTX", "slides"],
  html: ["HTML", "code"],
  json: ["JSON", "code"],
  glb: ["GLB", "mesh"],
  gltf: ["GLTF", "mesh"],
  stl: ["STL", "mesh"],
  "3mf": ["3MF", "mesh"],
  obj: ["OBJ", "mesh"],
  fbx: ["FBX", "mesh"],
  step: ["STEP", "mesh"],
  dxf: ["DXF", "cad"],
  kml: ["KML", "geo"],
  geojson: ["GEOJSON", "geo"],
  gpx: ["GPX", "geo"],
  shapefile: ["SHP", "geo"],
  dicom: ["DICOM", "medical"],
  statement: ["BANK", "bank"],
};

const BANDS: Record<Family, [string, string]> = {
  image: [BLUE, INK],
  vector: [LIME, INK],
  gif: [PINK, INK],
  video: [INK, LIME],
  audio: [GREEN, PAPER],
  doc: [RED, PAPER],
  text: [GRAY, INK],
  word: [WORD, PAPER],
  sheet: [MINT, INK],
  slides: [ORANGE, INK],
  code: [INK, LIME],
  mesh: [VIOLET, PAPER],
  cad: [CAD, PAPER],
  geo: [YELLOW, INK],
  medical: ["#4b5563", PAPER],
  bank: [RED, PAPER],
};

function familyGlyph(family: Family, x: number, y: number, w: number, h: number): CardMark[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h);
  switch (family) {
    case "image":
      return scenery(x, y, w, h);
    case "vector":
      return [
        line(`M${n(x + 2)} ${n(y + h - 2)} C${n(x + w * 0.2)} ${n(y)} ${n(x + w * 0.8)} ${n(y + h)} ${n(x + w - 2)} ${n(y + 2)}`, INK, 3),
        rect(x - 2, y + h - 6, 8, 8, LIME, 0, INK, 2),
        rect(x + w - 6, y - 2, 8, 8, LIME, 0, INK, 2),
      ];
    case "gif":
      return [
        rect(x, y + 8, w * 0.6, h - 8, PINK, 3, INK, 2),
        rect(x + w * 0.2, y + 4, w * 0.6, h - 8, BLUE, 3, INK, 2),
        rect(x + w * 0.4, y, w * 0.6, h - 8, LIME, 3, INK, 2),
      ];
    case "video":
      return [rect(x, y, w, h, INK, 4), play(cx, cy, s * 0.6, LIME)];
    case "audio":
      return wave(x, cy, w, h, GREEN, 7);
    case "doc":
    case "text":
    case "word":
      return textLines(x, y + 2, w, Math.max(2, Math.floor(h / 9)), family === "word" ? WORD : family === "doc" ? GRAY : INK, 9, 4);
    case "bank":
      return [
        text(x + 2, y + h * 0.6, "$", Math.round(s * 0.7), RED, { a: "start" }),
        ...textLines(x + w * 0.42, y + 3, w * 0.58, Math.max(2, Math.floor(h / 9)), GRAY, 9, 4),
      ];
    case "sheet":
      return table(x, y, w, h, 3, 3);
    case "slides":
      return [rect(x, y, w, h, CREAM, 3, INK, 2), rect(x + w * 0.15, y + h * 0.55, w * 0.18, h * 0.3, ORANGE), rect(x + w * 0.42, y + h * 0.35, w * 0.18, h * 0.5, ORANGE), rect(x + w * 0.69, y + h * 0.2, w * 0.18, h * 0.65, ORANGE)];
    case "code":
      return [text(cx, cy + s * 0.2, "{ }", Math.round(s * 0.6), INK, { ff: "mono" })];
    case "mesh":
      return cube(cx, y + h * 0.28, s * 0.34);
    case "cad":
      return [
        circle(cx, cy, s * 0.36, "none", CAD, 3),
        line(`M${n(x)} ${n(cy)} H${n(x + w)} M${n(cx)} ${n(y)} V${n(y + h)}`, CAD, 2),
        rect(cx - s * 0.18, cy - s * 0.18, s * 0.36, s * 0.36, "none", 0, INK, 2),
      ];
    case "geo":
      return [line(`M${n(x + 2)} ${n(y + h - 4)} C${n(x + w * 0.3)} ${n(y + h * 0.3)} ${n(x + w * 0.6)} ${n(y + h)} ${n(x + w - 6)} ${n(y + h * 0.3)}`, GREEN, 3), ...pin(x + w - 8, y + h * 0.36, s * 0.32)];
    case "medical":
      return [
        rect(x, y, w, h, INK, 3),
        rect(cx - 1.5, y + 3, 3, h - 6, PAPER),
        ...[0.3, 0.5, 0.7].map((step) => line(`M${n(cx - w * 0.32)} ${n(y + h * step + 3)} Q${n(cx)} ${n(y + h * step - 5)} ${n(cx + w * 0.32)} ${n(y + h * step + 3)}`, PAPER, 2)),
      ];
  }
}

function fileCard(x: number, y: number, w: number, h: number, label: string, family: Family): CardMark[] {
  const fold = 13;
  const body = (dx: number, dy: number) =>
    `M${x + dx} ${y + dy + 6} Q${x + dx} ${y + dy} ${x + dx + 6} ${y + dy} H${x + dx + w - fold} L${x + dx + w} ${y + dy + fold} V${y + dy + h - 6} Q${x + dx + w} ${y + dy + h} ${x + dx + w - 6} ${y + dy + h} H${x + dx + 6} Q${x + dx} ${y + dy + h} ${x + dx} ${y + dy + h - 6} Z`;
  const [band, ink] = BANDS[family];
  const size = Math.min(13, Math.floor((w - 16) / (label.length * 0.68)));
  return [
    path(body(4, 4), INK),
    path(body(0, 0), PAPER, INK, 3),
    path(`M${x + w - fold} ${y} V${y + fold} H${x + w} Z`, CREAM, INK, 3),
    ...familyGlyph(family, x + 9, y + fold + 4, w - 18 - (fold / 2), h - fold - 34),
    rect(x + 7, y + h - 27, w - 14, 20, band, 5),
    text(x + w / 2, y + h - 12.5, label, size, ink),
  ];
}

function format(token: string): [string, Family] | undefined {
  return FORMATS[token];
}

function conversion(from: [string, Family], to: [string, Family], swap = false): CardMark[] {
  const marks = [...fileCard(18, 56, 66, 88, from[0], from[1]), ...fileCard(116, 56, 66, 88, to[0], to[1])];
  if (swap) marks.push(...arrow(90, 88, 110, 88), ...arrow(110, 112, 90, 112));
  else marks.push(...arrow(90, 100, 110, 100));
  return marks;
}

function viewer(item: [string, Family]): CardMark[] {
  return [
    ...fileCard(30, 26, 96, 124, item[0], item[1]),
    circle(156, 122, 26, INK),
    path("M134 122 Q156 104 178 122 Q156 140 134 122 Z", PAPER),
    circle(156, 122, 8, LIME),
    circle(156, 122, 3.5, INK),
  ];
}

function compressFile(big: string, small: string, family: Family, saved: string): CardMark[] {
  return [...fileCard(18, 36, 76, 104, big, family), ...arrow(100, 104, 118, 104), ...fileCard(124, 72, 58, 68, small, family), ...chip(saved, 160)];
}

/* Scenes ----------------------------------------------------------------- */

type Scene = (rng: () => number) => CardMark[];

const SCENES: Record<string, Scene> = {
  vectorizer: () => [
    ...pixelGrid(22, 64, 12, ["01110", "11111", "11111", "11111", "01110"], { "1": LIME }),
    ...arrow(90, 94, 110, 94),
    circle(150, 98, 30, INK),
    circle(146, 94, 30, LIME, INK, 3),
    line("M122 64 H170", INK, 2),
    circle(122, 64, 4, INK),
    circle(170, 64, 4, INK),
    ...[[146, 64], [176, 94], [146, 124], [116, 94]].map(([x, y]) => rect(x - 5, y - 5, 10, 10, PAPER, 0, INK, 2.5)),
    ...chip("SVG"),
  ],
  "image-converter": () => conversion(["JPG", "image"], ["PNG", "image"], true),
  "photo-editor": () => [
    ...photo(28, 22, 144, 92, "#ffd1a8", "#ff8a5b", "#7a4b9a"),
    ...[[130, 84, PINK], [150, 52, BLUE], [170, 104, LIME]].flatMap(([y, k, color]) => [
      rect(36, Number(y), 128, 8, PAPER, 4, INK, 2.5),
      rect(36, Number(y), Number(k), 8, String(color), 4),
      circle(36 + Number(k), Number(y) + 4, 9, PAPER, INK, 3),
    ]),
  ],
  "image-editor": () => [
    ...photo(28, 24, 144, 110),
    rect(52, 90, 96, 32, PAPER, 6, INK, 3),
    text(100, 114, "Aa", 22),
    ...[[52, 90], [148, 90], [52, 122], [148, 122]].map(([x, y]) => rect(x - 4, y - 4, 8, 8, LIME, 0, INK, 2)),
    ...[PINK, BLUE, LIME, YELLOW].map((color, index) => circle(64 + index * 24, 160, 9, color, INK, 2.5)),
  ],
  "image-cropper": () => [
    ...photo(24, 24, 152, 120),
    rect(30, 30, 140, 16, INK, 0, undefined, undefined, 0.45),
    rect(30, 122, 140, 16, INK, 0, undefined, undefined, 0.45),
    rect(30, 46, 32, 76, INK, 0, undefined, undefined, 0.45),
    rect(138, 46, 32, 76, INK, 0, undefined, undefined, 0.45),
    rect(62, 46, 76, 76, "none", 0, PAPER, 3),
    line("M62 60 V46 H76 M124 46 H138 V60 M62 108 V122 H76 M124 122 H138 V108", LIME, 6),
    ...chip("1:1"),
  ],
  "exif-remover": () => [...photo(22, 24, 116, 92), ...crossTag(98, 96, "EXIF")],
  "image-compressor": () => compressFile("8 MB", "1 MB", "image", "−80%"),
  "image-resizer": () => [
    rect(26, 28, 148, 116, "none", 10, INK, 3),
    ...photo(26, 86, 66, 58),
    ...arrow(100, 80, 158, 42),
    ...chip("1080 px"),
  ],
  "image-upscaler": () => [
    rect(26, 72, 52, 52, INK, 4),
    ...pixelGrid(22, 68, 13, ["SSSS", "SYSS", "SGGS", "GGGG"], { S: SKY, Y: YELLOW, G: GREEN }),
    ...arrow(84, 98, 102, 98),
    ...photo(106, 40, 76, 104),
    ...chip("4×"),
  ],
  "image-eraser": () => [
    ...photo(24, 26, 152, 114),
    circle(92, 92, 22, PINK, INK, 3),
    line("M60 112 C76 84 96 116 118 88", CREAM, 26),
    path("M120 98 L146 72 L166 92 L140 118 Z", PINK, INK, 3),
    path("M120 98 L134 84 L154 104 L140 118 Z", PAPER, INK, 3),
  ],
  "segment-anything": () => [
    ...photo(24, 26, 152, 116),
    path("M72 134 C66 98 82 70 106 70 C130 70 142 98 136 134 Z", PINK, LIME, 5),
    circle(126, 92, 9, "none", INK, 2.5),
    path("M126 92 L126 124 L134 116 L140 130 L147 127 L141 113 L152 113 Z", PAPER, INK, 3),
  ],
  "background-remover": () => {
    const marks: CardMark[] = [...card(24, 26, 152, 112, PAPER, 8)];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        if ((row + col) % 2) marks.push(rect(30 + col * 14, 32 + row * 14, 14, 14, "#e7e2d8"));
      }
    }
    marks.push(...person(100, 46, 58, PINK), ...chip("PNG"));
    return marks;
  },
  "image-colorizer": () => [
    ...card(24, 26, 152, 116, PAPER, 8),
    rect(30, 32, 70, 104, "#dedede"),
    rect(100, 32, 70, 104, SKY),
    circle(62, 60, 12, "#a8a8a8"),
    circle(146, 58, 12, YELLOW),
    path("M30 136 L74 84 L100 110 L100 136 Z", "#7a7a7a"),
    path("M100 110 L126 78 L170 136 L100 136 Z", GREEN),
    rect(98, 32, 4, 104, PAPER),
    circle(100, 84, 13, PAPER, INK, 3),
    line("M95 79 L91 84 L95 89 M105 79 L109 84 L105 89", INK, 2.5),
  ],
  "face-enhancer": () => [
    ...pixelGrid(20, 72, 13, ["0PP0", "PIIP", "PPPP", "0PP0"], { P: PINK, I: "#b9877a" }),
    ...arrow(80, 98, 100, 98),
    ...face(146, 98, 34),
    star(182, 60, 9),
    star(112, 58, 6),
    ...chip("HD"),
  ],
  "face-swapper": () => [
    ...face(60, 100, 30, PINK),
    ...face(140, 100, 30, YELLOW),
    ...curvedArrow(62, 58, 100, 30, 138, 58),
    ...curvedArrow(138, 142, 100, 170, 62, 142),
  ],
  "ai-image-detector": () => [...photo(22, 26, 124, 98), ...magnifier(126, 108, 26, "AI"), ...chip("92%")],
  "ai-generated-image-checker": () => [
    ...photo(22, 26, 124, 98),
    path("M144 92 L172 102 V124 Q172 146 144 156 Q116 146 116 124 V102 Z", LIME, INK, 3),
    line("M130 124 L140 134 L158 114", INK, 5),
    ...chip("C2PA", 164),
  ],
  "photo-collage-maker": () => [...photo(22, 26, 92, 124), ...photo(120, 26, 58, 58), ...photo(120, 92, 58, 58, "#ffd1a8", "#ff8a5b", "#7a4b9a")],
  "heart-photo-collage": () => [
    path("M104 166 C44 126 34 76 70 62 C88 55 100 66 104 76 C108 66 120 55 138 62 C174 76 164 126 104 166 Z", INK),
    path("M100 162 C40 122 30 72 66 58 C84 51 96 62 100 72 C104 62 116 51 134 58 C170 72 160 122 100 162 Z", PINK, INK, 3),
    ...scenery(62, 74, 34, 28),
    ...scenery(104, 74, 34, 28, "#ffd1a8", "#ff8a5b", "#7a4b9a"),
    ...scenery(82, 108, 36, 28),
  ],
  "instagram-story-collage": () => [
    ...card(64, 16, 72, 136, INK, 14),
    ...scenery(71, 28, 58, 34),
    ...scenery(71, 66, 58, 34, "#ffd1a8", "#ff8a5b", "#7a4b9a"),
    ...scenery(71, 104, 58, 34, MINT, PAPER, GREEN),
    ...chip("9:16", 164),
  ],
  "photo-grid-maker": () => [
    ...card(31, 18, 138, 138, PAPER, 8),
    ...Array.from({ length: 9 }, (_, index) => scenery(37 + (index % 3) * 43, 24 + Math.floor(index / 3) * 43, 39, 39, index % 2 ? SKY : "#ffd1a8")).flat(),
    ...chip("3×3", 164),
  ],
  "logo-maker": () => [
    ...card(26, 32, 148, 104, PAPER, 14),
    circle(70, 84, 26, LIME, INK, 3),
    path("M58 96 L70 70 L82 96 Z", INK),
    rect(108, 72, 50, 12, INK, 3),
    rect(108, 92, 34, 8, GRAY, 3),
    ...chip("SVG"),
  ],
  "passport-photo-maker": () => [
    ...card(60, 20, 80, 108, PAPER, 6),
    rect(66, 26, 68, 96, "#eef2f7", 3),
    ...person(100, 42, 50, PINK),
    rect(66, 26, 68, 96, "none", 3, INK, 2),
    ...chip("35×45 mm", 152),
  ],
  "visa-photo-maker": () => [
    ...card(54, 22, 92, 92, PAPER, 6),
    rect(60, 28, 80, 80, "#eef2f7", 3),
    ...person(100, 36, 52, YELLOW),
    rect(60, 28, 80, 80, "none", 3, INK, 2),
    ...chip("2×2 in", 140),
  ],
  "mockup-generator": () => [
    ...card(20, 40, 120, 80, INK, 8),
    rect(28, 48, 104, 64, LIME, 3),
    circle(62, 80, 15, PINK, INK, 2.5),
    rect(86, 70, 36, 8, INK, 3),
    rect(86, 86, 24, 6, INK, 3),
    path("M10 124 H150 L142 138 H18 Z", GRAY, INK, 3),
    ...card(140, 62, 44, 84, INK, 10),
    rect(145, 72, 34, 62, LIME, 3),
    circle(162, 98, 9, PINK, INK, 2),
  ],
  "add-watermark": () => [
    ...photo(24, 26, 152, 116),
    text(100, 104, "©", 52, PAPER),
    text(52, 62, "©", 16, PAPER),
    text(152, 132, "©", 16, PAPER),
  ],
  "app-store-screenshot-generator": () =>
    [24, 106].flatMap((x, index) => [
      ...card(x, 22, 70, 136, index ? PINK : BLUE, 10),
      rect(x + 10, 32, 50, 6, INK, 3),
      rect(x + 18, 44, 34, 5, INK, 2.5),
      rect(x + 12, 58, 46, 92, INK, 9),
      rect(x + 16, 66, 38, 76, PAPER, 3),
      rect(x + 20, 72, 30, 16, index ? LIME : YELLOW, 2),
      ...textLines(x + 20, 96, 30, 4, GRAY, 9, 4),
    ]),
  "image-to-text": () => conversion(["IMG", "image"], ["TXT", "text"]),

  "video-compressor": () => compressFile("1 GB", "90MB", "video", "−90%"),
  "video-editor": () => [
    ...videoFrame(24, 20, 152, 80),
    ...card(24, 110, 152, 52, PAPER, 8),
    rect(30, 116, 44, 16, PINK, 3),
    rect(78, 116, 58, 16, BLUE, 3),
    rect(140, 116, 30, 16, LIME, 3),
    ...wave(30, 147, 140, 14, GREEN, 20),
    rect(106, 104, 4, 62, RED, 2),
    circle(108, 104, 6, RED),
  ],
  "video-converter": () => conversion(["MP4", "video"], ["WEBM", "video"], true),
  "lut-generator": () => [
    ...photo(24, 22, 152, 96, "#ffd1a8", "#ff8a5b", "#7a4b9a"),
    rect(24, 126, 48, 16, ORANGE, 4, INK, 2.5),
    rect(76, 126, 48, 16, VIOLET, 4, INK, 2.5),
    rect(128, 126, 48, 16, MINT, 4, INK, 2.5),
    ...chip(".cube", 160),
  ],
  "video-upscaler": () => [...videoFrame(20, 80, 52, 34), ...arrow(80, 98, 98, 98), ...videoFrame(104, 56, 78, 84), ...chip("4K")],
  "media-merger": () => [
    ...videoFrame(20, 30, 66, 44, PINK),
    text(100, 62, "+", 28),
    ...videoFrame(114, 30, 66, 44, BLUE),
    ...arrow(100, 84, 100, 106),
    ...card(20, 114, 160, 42, INK, 8),
    rect(26, 120, 72, 30, PINK, 4),
    rect(102, 120, 72, 30, BLUE, 4),
  ],
  "audio-converter": () => conversion(["MP3", "audio"], ["WAV", "audio"], true),
  "audio-trimmer": () => [
    ...card(20, 36, 160, 104, PAPER, 10),
    rect(62, 42, 76, 92, LIME, 4, undefined, undefined, 0.7),
    ...wave(28, 88, 144, 72, GREEN, 15),
    rect(58, 40, 8, 96, INK, 4),
    rect(134, 40, 8, 96, INK, 4),
    ...chip("MP3"),
  ],
  "music-maker": () => {
    const lit = ["10001000", "00100010", "01010101", "11111111"];
    const colors = [PINK, BLUE, YELLOW, LIME];
    const marks: CardMark[] = [...card(20, 28, 160, 112, INK, 10)];
    lit.forEach((row, rowIndex) => {
      [...row].forEach((on, col) => marks.push(rect(30 + col * 18.4, 38 + rowIndex * 24.5, 14, 19, on === "1" ? colors[rowIndex] : "#2b2b2b", 3)));
    });
    marks.push(rect(84, 32, 3, 104, PAPER, 1.5, undefined, undefined, 0.8));
    return marks;
  },
  "sheet-music-maker": () => [
    ...card(24, 28, 152, 120, PAPER, 8),
    ...[0, 1, 2, 3, 4].map((row) => rect(36, 56 + row * 9, 128, 2, INK)),
    ...[[64, 83], [92, 74], [120, 65], [148, 79]].flatMap(([x, y]) => [circle(x, y, 6, INK), rect(x + 4.5, y - 30, 2.5, 30, INK)]),
    path("M68 53 L152 49 L152 55 L68 59 Z", INK),
    ...textLines(36, 116, 128, 2, GRAY, 12, 6),
  ],
  "online-piano": () => {
    const marks: CardMark[] = [...card(24, 40, 152, 108, INK, 8)];
    for (let index = 0; index < 7; index += 1) marks.push(rect(30 + index * 20.3, 46, 18, 96, index === 2 ? LIME : PAPER, 3));
    for (const index of [0, 1, 3, 4, 5]) marks.push(rect(30 + index * 20.3 + 12, 46, 13, 58, INK, 2));
    return marks;
  },
  "online-guitar": () => {
    const marks: CardMark[] = [...card(36, 22, 128, 140, PAPER, 10), rect(52, 40, 96, 6, INK, 2)];
    for (let string = 0; string < 6; string += 1) marks.push(rect(52 + string * 19, 40, 2, 108, INK));
    for (let fret = 1; fret < 5; fret += 1) marks.push(rect(52, 40 + fret * 27, 97, 2, GRAY));
    marks.push(circle(72, 80, 8, LIME, INK, 2.5), circle(110, 107, 8, PINK, INK, 2.5), circle(129, 107, 8, PINK, INK, 2.5), circle(91, 53, 8, BLUE, INK, 2.5));
    return marks;
  },
  "gif-maker": () => [...photo(18, 50, 56, 46), ...photo(28, 70, 56, 46), ...photo(38, 90, 56, 46, "#ffd1a8", "#ff8a5b", "#7a4b9a"), ...arrow(102, 100, 120, 100), ...fileCard(126, 56, 58, 84, "GIF", "gif")],
  "subtitle-generator": () => [...videoFrame(22, 24, 156, 104), rect(44, 100, 112, 9, PAPER, 3), rect(62, 113, 76, 9, PAPER, 3), ...chip("SRT", 156)],
  "add-subtitles-to-video": () => [
    ...card(22, 24, 156, 104, INK, 10),
    ...person(100, 44, 46, PINK),
    rect(40, 98, 120, 16, LIME, 4),
    rect(136, 34, 34, 20, PAPER, 4),
    text(153, 49, "CC", 12),
    ...chip("MP4", 156),
  ],
  "ai-music-detector": () => [...card(20, 30, 128, 92, PAPER, 10), ...wave(30, 76, 108, 60, GREEN, 13), ...magnifier(134, 110, 24, "AI"), ...chip("AI?", 164)],
  "ai-song-checker": () => [
    circle(64, 120, 16, INK),
    circle(118, 108, 16, INK),
    rect(74, 48, 7, 72, INK),
    rect(128, 36, 7, 72, INK),
    path("M74 48 L135 36 L135 52 L74 64 Z", INK),
    path("M152 98 L176 106 V124 Q176 142 152 150 Q128 142 128 124 V106 Z", LIME, INK, 3),
    line("M140 124 L149 133 L164 116", INK, 4.5),
    ...chip("AI ✓", 164),
  ],
  "screen-recorder": () => [
    ...card(22, 28, 156, 100, INK, 10),
    rect(30, 36, 140, 84, SKY, 4),
    rect(40, 48, 76, 52, PAPER, 4, INK, 2),
    rect(40, 48, 76, 10, INK, 2),
    rect(88, 128, 24, 16, INK),
    rect(64, 144, 72, 8, INK, 4),
    rect(122, 46, 42, 20, PAPER, 10, INK, 2),
    circle(133, 56, 5, RED),
    text(151, 60, "REC", 9),
  ],
  "green-screen-video": () => [...card(24, 26, 152, 120, SCREEN, 10), ...person(100, 48, 66, PINK)],
  "chroma-key": () => [
    ...card(24, 26, 152, 120, PAPER, 10),
    rect(30, 32, 70, 108, SCREEN),
    ...scenery(100, 32, 70, 108),
    ...person(100, 52, 62, PINK),
  ],
  "voice-recorder": () => [...mic(92, 30), circle(150, 48, 10, RED), ...wave(132, 96, 40, 40, GREEN, 5), ...chip("WAV")],
  teleprompter: () => [
    ...card(24, 22, 152, 132, INK, 10),
    ...[0, 1, 2, 3, 4, 5].map((row) => rect(40, 40 + row * 18, [104, 88, 112, 96, 72, 100][row], 7, row === 2 ? LIME : PAPER, 3, undefined, undefined, row === 2 ? undefined : 0.75)),
    path("M30 82 L36 76 V88 Z", LIME),
    path("M170 82 L164 76 V88 Z", LIME),
  ],
  "trim-video": () => {
    const marks: CardMark[] = [...card(16, 56, 168, 66, INK, 6)];
    for (let index = 0; index < 10; index += 1) {
      marks.push(rect(22 + index * 16.5, 61, 8, 5, PAPER, 1));
      marks.push(rect(22 + index * 16.5, 112, 8, 5, PAPER, 1));
    }
    [PINK, BLUE, YELLOW, MINT, ORANGE].forEach((color, index) => marks.push(rect(22 + index * 32, 70, 28, 38, color, 3)));
    marks.push(rect(22, 70, 38, 38, INK, 0, undefined, undefined, 0.55), rect(144, 70, 34, 38, INK, 0, undefined, undefined, 0.55));
    marks.push(line("M66 48 H58 V130 H66 M134 48 H142 V130 H134", LIME, 6), ...chip("00:15", 152));
    return marks;
  },
  "crop-video": () => [
    ...card(16, 40, 168, 96, INK, 10),
    ...scenery(22, 46, 156, 84),
    rect(22, 46, 56, 84, INK, 0, undefined, undefined, 0.55),
    rect(122, 46, 56, 84, INK, 0, undefined, undefined, 0.55),
    rect(78, 46, 44, 84, "none", 0, LIME, 4),
    ...chip("9:16", 150),
  ],
  "video-speed-changer": () => [...gauge(100, 126, 66, 0.78, [MINT, YELLOW, ORANGE, RED]), play(100, 98, 24, INK), ...chip("2×", 148)],
  "remove-audio-from-video": () => [
    ...videoFrame(20, 28, 116, 80),
    circle(146, 122, 34, INK),
    circle(142, 118, 34, PAPER, INK, 3),
    speaker(132, 118, 16),
    line("M148 108 L164 128 M164 108 L148 128", RED, 5),
  ],
  "boomerang-gif-maker": () => [
    ...photo(46, 52, 108, 76),
    ...curvedArrow(56, 42, 100, 18, 144, 42),
    ...curvedArrow(144, 140, 100, 164, 56, 140),
    ...chip("GIF", 168, INK, LIME),
  ],
  "slideshow-maker": () => [
    ...card(22, 26, 156, 100, INK, 10),
    ...scenery(52, 36, 96, 80),
    path("M36 76 L44 68 V84 Z", PAPER),
    path("M164 76 L156 68 V84 Z", PAPER),
    circle(84, 146, 6, INK),
    circle(100, 146, 6, LIME, INK, 2),
    circle(116, 146, 6, INK),
  ],

  tuner: () => [...gauge(100, 124, 66, 0.5, [RED, YELLOW, LIME, YELLOW, RED]), text(100, 106, "A", 22, INK), ...chip("440 Hz", 146)],
  metronome: () => [
    path("M76 152 L92 40 H112 L128 152 Z", INK),
    path("M72 148 L88 36 H108 L124 148 Z", ORANGE, INK, 3),
    line("M98 132 L124 56", INK, 5),
    circle(116, 80, 8, PAPER, INK, 3),
    rect(64, 140, 68, 12, INK, 4),
    ...chip("120 BPM", 162),
  ],
  "white-noise": () => [
    circle(70, 62, 26, YELLOW, INK, 3),
    circle(82, 54, 24, BACKGROUNDS.video),
    ...[[104, BLUE], [126, PAPER], [148, GREEN]].map(([y, color]) => line(`M24 ${y} Q44 ${Number(y) - 12} 64 ${y} T104 ${y} T144 ${y} T184 ${y}`, String(color), 7)),
  ],
  "noise-remover": () => [
    ...card(16, 50, 76, 84, PAPER, 8),
    line("M24 92 L30 76 L34 104 L40 70 L45 110 L50 82 L55 98 L60 66 L66 112 L71 84 L76 100 L84 90", GRAY, 3),
    ...arrow(96, 92, 110, 92),
    ...card(114, 50, 70, 84, PAPER, 8),
    line("M120 92 Q132 64 144 92 T168 92 T180 92", GREEN, 4),
  ],
  "vocal-remover": () => [
    ...wave(24, 52, 152, 44, INK, 19),
    ...arrow(70, 82, 56, 100),
    ...arrow(130, 82, 144, 100),
    ...card(18, 104, 76, 56, PINK, 10),
    rect(46, 114, 20, 32, INK, 10),
    line("M40 132 Q40 150 56 150 Q72 150 72 132", INK, 3),
    ...card(106, 104, 76, 56, BLUE, 10),
    circle(134, 142, 8, INK),
    rect(140, 116, 4, 26, INK),
    path("M140 116 L156 112 V120 L144 124 Z", INK),
  ],
  "text-to-speech": () => [
    ...page(20, 40, 76, 100, 6),
    ...arrow(102, 90, 118, 90),
    speaker(140, 90, 18),
    line("M162 76 Q170 90 162 104", GREEN, 5),
    line("M172 66 Q186 90 172 114", GREEN, 5),
    ...chip("MP3", 156),
  ],
  "loudness-meter": () => {
    const marks: CardMark[] = [...card(52, 22, 96, 128, INK, 10)];
    for (const x of [66, 108]) {
      [MINT, MINT, MINT, MINT, YELLOW, YELLOW, RED].forEach((color, index) => marks.push(rect(x, 132 - index * 15, 26, 11, index < (x === 66 ? 6 : 5) ? color : "#333333", 2)));
    }
    marks.push(rect(58, 58, 84, 3, PAPER), ...chip("LUFS", 160));
    return marks;
  },
  "lufs-meter": () => [
    ...card(28, 34, 144, 104, PAPER, 14),
    text(100, 96, "−14", 44),
    text(100, 120, "LUFS", 14, GREEN),
    ...gauge(100, 160, 18, 0.7, [MINT, YELLOW, RED]),
  ],
  "normalize-audio": () => [
    ...card(20, 36, 160, 104, PAPER, 10),
    rect(28, 56, 144, 2.5, RED),
    rect(28, 118, 144, 2.5, RED),
    ...Array.from({ length: 14 }, (_, index) => rect(32 + index * 10, 60, 6, 56, GREEN, 3)),
    ...chip("0 dB"),
  ],

  "pdf-editor": () => [
    ...fileCard(40, 24, 96, 128, "PDF", "doc"),
    path("M118 140 L162 96 L176 110 L132 154 L114 158 Z", YELLOW, INK, 3),
    path("M114 158 L118 140 L132 154 Z", INK),
  ],
  "merge-pdf": () => [
    ...fileCard(16, 24, 54, 70, "PDF", "doc"),
    ...fileCard(16, 106, 54, 70, "PDF", "doc"),
    ...curvedArrow(76, 58, 100, 60, 108, 92),
    ...curvedArrow(76, 140, 100, 138, 108, 108),
    ...fileCard(116, 56, 68, 92, "PDF", "doc"),
  ],
  "compress-pdf": () => compressFile("12 MB", "2 MB", "doc", "−80%"),
  "split-pdf": () => [
    ...fileCard(18, 46, 74, 100, "PDF", "doc"),
    line("M14 96 H98", RED, 3),
    ...arrow(100, 72, 116, 60),
    ...arrow(100, 120, 116, 132),
    ...fileCard(122, 22, 60, 72, "P1", "doc"),
    ...fileCard(122, 104, 60, 72, "P2", "doc"),
  ],
  "rotate-pdf": () => [...fileCard(46, 34, 80, 108, "PDF", "doc"), line("M144 52 A56 56 0 0 1 144 132", INK, 6), arrowHead(152, 110, 144, 132), ...chip("90°", 160)],
  "sign-pdf": () => [
    ...fileCard(40, 22, 104, 132, "PDF", "doc"),
    line("M54 116 C62 92 72 130 82 108 S98 94 104 118 S122 102 132 110", WORD, 4),
    rect(52, 124, 84, 2, GRAY),
    path("M150 70 L178 98 L170 106 L142 78 Z", INK),
    path("M142 78 L136 64 L150 70 Z", YELLOW, INK, 2),
  ],
  "add-page-numbers-to-pdf": () =>
    [0, 1, 2].flatMap((index) => [
      ...page(22 + index * 44, 42 - index * 8, 64, 92, 4),
      circle(54 + index * 44, 118 - index * 8, 10, index === 2 ? LIME : PAPER, INK, 2.5),
      text(54 + index * 44, 123 - index * 8, String(index + 1), 13),
    ]),
  "bates-numbering": () => [...page(44, 22, 112, 128, 7), rect(96, 126, 52, 16, YELLOW, 3, INK, 2), text(122, 138, "ABC0001", 9), ...chip("ABC-000123", 162)],
  "black-out-text-in-pdf": () => [
    ...card(40, 22, 120, 136, PAPER, 6),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((row) => rect(54, 40 + row * 14, [92, 76, 88, 60, 92, 70, 84, 52][row], row % 3 === 1 ? 10 : 5, row % 3 === 1 ? INK : GRAY, 2)),
  ],
  "redact-pdf": () => [
    ...page(36, 22, 112, 136, 8),
    rect(48, 46, 70, 12, INK, 2),
    rect(48, 86, 54, 12, INK, 2),
    rect(46, 104, 88, 16, "none", 2, RED, 3),
    path("M138 128 L168 98 L180 110 L150 140 Z", RED, INK, 3),
  ],
  "remove-metadata-from-pdf": () => [...fileCard(24, 24, 86, 112, "PDF", "doc"), ...crossTag(100, 104, "META")],
  "unlock-pdf": () => [...fileCard(24, 24, 86, 116, "PDF", "doc"), ...openPadlock(144, 118)],
  "pdf-reader": () => viewer(["PDF", "doc"]),
  "compare-pdf": () => compareDocs("PDF", "PDF"),
  "document-compare": () => compareDocs("DOC", "PDF"),
  "compare-word-documents": () => compareDocs("DOCX", "DOCX"),
  "document-translator": () => [
    ...card(18, 40, 70, 96, PAPER, 6),
    text(53, 100, "A", 44, INK, { ff: "serif" }),
    ...arrow(94, 88, 108, 88),
    ...card(114, 40, 70, 96, PAPER, 6),
    text(149, 102, "文", 40, RED),
  ],
  "pdf-imposition": () => [
    ...card(26, 24, 148, 116, PAPER, 4),
    ...[0, 1, 2, 3].flatMap((index) => [
      rect(38 + (index % 2) * 64, 34 + Math.floor(index / 2) * 52, 60, 46, CREAM, 2, INK, 2),
      text(68 + (index % 2) * 64, 64 + Math.floor(index / 2) * 52, ["8", "1", "2", "7"][index], 16),
    ]),
    line("M20 30 H30 M20 134 H30 M170 30 H180 M170 134 H180 M32 18 V28 M168 18 V28 M32 136 V146 M168 136 V146", INK, 2),
  ],
  "pdf-booklet-maker": () => [
    path("M34 54 Q66 44 104 56 V152 Q66 142 34 152 Z", INK),
    path("M104 56 Q142 44 174 54 V152 Q142 142 104 152 Z", INK),
    path("M30 50 Q62 40 100 52 V148 Q62 138 30 148 Z", PAPER, INK, 3),
    path("M100 52 Q138 40 170 50 V148 Q138 138 100 148 Z", PAPER, INK, 3),
    ...textLines(42, 70, 46, 5, GRAY, 12, 5),
    ...textLines(112, 70, 46, 5, GRAY, 12, 5),
  ],
  "n-up-pdf": () => [
    ...card(34, 20, 132, 132, PAPER, 4),
    ...[0, 1, 2, 3].flatMap((index) => [
      rect(44 + (index % 2) * 58, 30 + Math.floor(index / 2) * 58, 54, 54, CREAM, 2, INK, 2),
      text(71 + (index % 2) * 58, 63 + Math.floor(index / 2) * 58, String(index + 1), 18),
    ]),
    ...chip("4-up", 162),
  ],
  "business-card-imposition": () => [
    ...card(30, 18, 140, 136, PAPER, 4),
    ...Array.from({ length: 8 }, (_, index) => {
      const x = 40 + (index % 2) * 62;
      const y = 26 + Math.floor(index / 2) * 31;
      return [rect(x, y, 58, 27, CREAM, 2, INK, 1.5), circle(x + 11, y + 13.5, 6, index % 3 ? BLUE : LIME), rect(x + 22, y + 9, 28, 4, INK, 2), rect(x + 22, y + 16, 18, 3, GRAY, 1.5)];
    }).flat(),
    ...chip("8-up", 164),
  ],
  ocr: () => [
    ...card(26, 24, 148, 116, PAPER, 8),
    text(100, 92, "Abc", 40, INK, { ff: "serif" }),
    rect(32, 96, 136, 4, LIME),
    rect(32, 100, 136, 18, LIME, 0, undefined, undefined, 0.35),
    line("M34 44 V32 H46 M154 32 H166 V44 M34 120 V132 H46 M154 132 H166 V120", INK, 4),
    ...chip("OCR"),
  ],
  "bank-statement-converter": () => [
    ...fileCard(16, 40, 76, 104, "BANK", "bank"),
    ...arrow(98, 92, 114, 92),
    ...fileCard(120, 24, 62, 74, "CSV", "sheet"),
    ...fileCard(120, 104, 62, 74, "XLSX", "sheet"),
  ],

  whiteboard: () => [
    ...card(18, 22, 164, 124, PAPER, 8),
    rect(30, 36, 40, 36, YELLOW, 3, INK, 2),
    rect(30, 84, 40, 36, PINK, 3, INK, 2),
    rect(96, 36, 64, 24, "none", 6, INK, 3),
    ...arrow(128, 62, 128, 78, INK, 3),
    path("M128 84 L150 100 L128 116 L106 100 Z", "none", INK, 3),
    line("M84 136 C96 120 110 140 124 128 S150 120 164 132", BLUE, 4),
  ],
  "mind-map": () => [
    ...[[46, 46], [154, 40], [46, 138], [154, 144]].map(([x, y]) => line(`M100 94 Q${(100 + x) / 2} ${y} ${x} ${y}`, INK, 3)),
    ...[[46, 46, PINK], [154, 40, BLUE], [46, 138, YELLOW], [154, 144, MINT]].flatMap(([x, y, color]) => [rect(Number(x) - 26, Number(y) - 11, 52, 22, String(color), 11, INK, 2.5)]),
    rect(68, 78, 64, 32, LIME, 16, INK, 3),
    rect(84, 91, 32, 6, INK, 3),
  ],
  "gantt-chart-maker": () => [
    ...card(18, 26, 164, 126, PAPER, 8),
    rect(18, 26, 164, 18, INK, 8),
    ...[0, 1, 2, 3].map((row) => rect(26, 56 + row * 22, 30, 6, GRAY, 3)),
    rect(64, 52, 52, 13, PINK, 6, INK, 2),
    rect(88, 74, 60, 13, BLUE, 6, INK, 2),
    rect(118, 96, 50, 13, LIME, 6, INK, 2),
    rect(74, 118, 38, 13, YELLOW, 6, INK, 2),
    rect(132, 44, 3, 104, RED),
  ],
  "gantt-chart-template": () =>
    [0, 1, 2].flatMap((index) => {
      const x = 22 + index * 28;
      const y = 22 + index * 20;
      return [
        ...card(x, y, 100, 100, index === 2 ? PAPER : CREAM, 8),
        rect(x, y, 100, 14, INK, 8),
        rect(x + 22, y + 28, 36, 10, PINK, 5),
        rect(x + 40, y + 46, 44, 10, BLUE, 5),
        rect(x + 58, y + 64, 30, 10, LIME, 5),
      ];
    }),
  "project-timeline-maker": () => [
    rect(20, 96, 160, 6, INK, 3),
    ...[[40, PINK, 62], [80, BLUE, 124], [120, LIME, 62], [160, YELLOW, 124]].flatMap(([x, color, y]) => [
      rect(Number(x) - 1.5, Math.min(Number(y), 99), 3, Math.abs(99 - Number(y)), INK),
      rect(Number(x) - 22, Number(y) - (Number(y) < 99 ? 22 : 0), 44, 22, String(color), 6, INK, 2.5),
      circle(Number(x), 99, 9, PAPER, INK, 3),
    ]),
  ],

  "2048": () => {
    const marks: CardMark[] = [...card(28, 20, 144, 144, "#bbada0", 12)];
    const values = ["2", "", "4", "8", "16", "", "", "64", "2048"];
    const colors: Record<string, string> = { "2": CREAM, "4": "#ede0c8", "8": ORANGE, "16": "#f59563", "64": RED, "2048": LIME };
    values.forEach((value, index) => {
      const x = 36 + (index % 3) * 44;
      const y = 28 + Math.floor(index / 3) * 44;
      marks.push(rect(x, y, 40, 40, value ? colors[value] : "#cdc1b4", 6));
      if (value) marks.push(text(x + 20, y + 27, value, value.length > 2 ? 12 : 18, INK));
    });
    return marks;
  },
  "block-puzzle": () => {
    const marks: CardMark[] = [...card(30, 20, 140, 140, PAPER, 8)];
    for (let index = 1; index < 7; index += 1) marks.push(rect(30 + index * 20, 22, 1.5, 136, CREAM), rect(32, 20 + index * 20, 136, 1.5, CREAM));
    const cells: Array<[number, number, string]> = [
      [0, 6, PINK], [1, 6, PINK], [2, 6, PINK], [1, 5, PINK],
      [3, 6, BLUE], [3, 5, BLUE], [3, 4, BLUE], [4, 6, BLUE],
      [5, 5, LIME], [6, 5, LIME], [5, 6, LIME], [6, 6, LIME],
      [2, 1, YELLOW], [2, 2, YELLOW], [2, 3, YELLOW], [2, 4, YELLOW],
    ];
    cells.forEach(([col, row, color]) => marks.push(rect(31 + col * 20, 21 + row * 20, 18.5, 18.5, color, 3, INK, 2)));
    return marks;
  },
  chess: () => {
    const marks: CardMark[] = [...card(28, 20, 144, 144, PAPER, 4)];
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) if ((row + col) % 2) marks.push(rect(28 + col * 24, 20 + row * 24, 24, 24, GREEN));
    }
    marks.push(text(88, 96, "♞", 40, INK), text(136, 70, "♛", 30, RED), text(64, 142, "♚", 30, INK));
    return marks;
  },
  minesweeper: () => {
    const marks: CardMark[] = [...card(30, 20, 140, 140, "#c9c4b8", 6)];
    const grid = ["11 F ", "1 21 ", "  1M1", "  111", "     "];
    grid.forEach((row, rowIndex) => {
      [...row].forEach((cell, col) => {
        const x = 36 + col * 26;
        const y = 26 + rowIndex * 26;
        marks.push(rect(x, y, 24, 24, cell === " " ? PAPER : CREAM, 3, INK, 1.5));
        if (cell === "1" || cell === "2") marks.push(text(x + 12, y + 18, cell, 15, cell === "1" ? WORD : GREEN));
        if (cell === "F") marks.push(rect(x + 9, y + 5, 2.5, 15, INK), path(`M${x + 11} ${y + 5} L${x + 20} ${y + 9} L${x + 11} ${y + 13} Z`, RED));
        if (cell === "M") marks.push(circle(x + 12, y + 12, 7, INK), circle(x + 10, y + 10, 2, PAPER));
      });
    });
    return marks;
  },
  "periodic-table": () => {
    const marks: CardMark[] = [];
    const layout = ["X    X", "XX  XX", "XXXXXX", "XXXXXX"];
    const colors = [PINK, YELLOW, BLUE, MINT, VIOLET, ORANGE];
    layout.forEach((row, rowIndex) => {
      [...row].forEach((cell, col) => {
        if (cell === "X") marks.push(rect(22 + col * 26, 22 + rowIndex * 26, 22, 22, colors[col], 3, INK, 1.5));
      });
    });
    marks.push(...card(98, 106, 72, 64, LIME, 6), text(134, 146, "Fe", 26), text(108, 122, "26", 10, INK, { a: "start" }));
    return marks;
  },
  "snake-game": () => [
    ...card(26, 20, 148, 148, "#1d2b22", 10),
    line("M48 142 H98 V92 H138", LIME, 16),
    circle(138, 92, 10, LIME),
    circle(141, 88, 2.5, INK),
    circle(140, 52, 9, RED),
    path("M140 43 Q146 36 152 40 Q146 46 140 43 Z", GREEN),
  ],
  solitaire: () => [
    ...card(26, 46, 64, 92, PAPER, 8),
    text(40, 68, "A", 18, INK),
    text(58, 112, "♠", 34, INK),
    ...card(70, 60, 64, 92, PAPER, 8),
    text(84, 82, "K", 18, RED),
    text(102, 126, "♥", 34, RED),
    ...card(122, 20, 54, 76, BLUE, 8),
    rect(130, 28, 38, 60, "none", 4, PAPER, 2),
  ],
  sudoku: () => {
    const marks: CardMark[] = [...card(28, 20, 144, 144, PAPER, 4)];
    for (let index = 1; index < 9; index += 1) {
      const bold = index % 3 === 0;
      marks.push(rect(28 + index * 16 - (bold ? 1.25 : 0.5), 20, bold ? 2.5 : 1, 144, bold ? INK : GRAY));
      marks.push(rect(28, 20 + index * 16 - (bold ? 1.25 : 0.5), 144, bold ? 2.5 : 1, bold ? INK : GRAY));
    }
    const digits: Array<[number, number, string]> = [[0, 0, "5"], [1, 1, "3"], [4, 0, "7"], [2, 3, "6"], [6, 2, "1"], [5, 4, "9"], [3, 6, "8"], [7, 5, "2"], [8, 8, "4"], [1, 7, "9"]];
    marks.push(rect(28 + 4 * 16, 20 + 4 * 16, 16, 16, LIME));
    digits.forEach(([col, row, value]) => marks.push(text(36 + col * 16, 33 + row * 16, value, 12, row === 4 && col === 5 ? GREEN : INK)));
    return marks;
  },
  "typing-test": () => [
    ...card(20, 30, 160, 34, PAPER, 8),
    text(32, 53, "the quick", 15, INK, { a: "start", ff: "mono" }),
    rect(122, 38, 3, 20, RED),
    ...card(20, 78, 160, 64, INK, 8),
    ...Array.from({ length: 14 }, (_, index) => rect(28 + (index % 7) * 21.5, 86 + Math.floor(index / 7) * 22, 17, 17, index === 4 ? LIME : PAPER, 3)),
    rect(56, 130, 88, 6, PAPER, 3),
    ...chip("WPM", 156),
  ],

  "keyboard-test": () => [
    ...card(14, 50, 172, 92, INK, 10),
    ...Array.from({ length: 24 }, (_, index) => {
      const row = Math.floor(index / 8);
      return rect(24 + (index % 8) * 19.5 + row * 4, 60 + row * 22, 15, 16, [3, 10, 17].includes(index) ? LIME : PAPER, 3);
    }),
    rect(54, 126, 92, 9, PAPER, 3),
  ],
  "mouse-test": () => [
    ...card(74, 36, 52, 96, PAPER, 26),
    rect(99, 36, 2, 38, INK),
    rect(96, 48, 8, 16, INK, 4),
    circle(64, 42, 10, "none", LIME, 4),
    circle(64, 42, 20, "none", LIME, 3, 0.6),
    ...chip("CPS", 152),
  ],
  "screen-test": () => [
    ...card(20, 30, 160, 100, INK, 10),
    rect(28, 38, 48, 84, RED),
    rect(76, 38, 48, 84, SCREEN),
    rect(124, 38, 48, 84, WORD),
    rect(97, 74, 6, 6, INK),
    circle(100, 77, 13, "none", PAPER, 3),
    rect(88, 130, 24, 14, INK),
    rect(66, 144, 68, 8, INK, 4),
  ],
  "speaker-test": () =>
    [[24, "L"], [118, "R"]].flatMap(([x, label]) => [
      ...card(Number(x), 34, 58, 104, INK, 10),
      circle(Number(x) + 29, 66, 16, GRAY, PAPER, 3),
      circle(Number(x) + 29, 108, 20, GRAY, PAPER, 3),
      circle(Number(x) + 29, 108, 7, INK),
      rect(Number(x) + 9, 152, 40, 26, label === "L" ? LIME : PINK, 13, INK, 2.5),
      text(Number(x) + 29, 170, String(label), 15),
    ]),
  "mic-test": () => [...mic(70, 30), ...[0, 1, 2, 3, 4, 5].map((index) => rect(118 + index * 10, 128 - index * 14, 7, 14 + index * 14, index > 3 ? YELLOW : GREEN, 2))],
  "webcam-test": () => [
    circle(104, 82, 50, INK),
    circle(100, 78, 50, "#2b2b2b", INK, 3),
    circle(100, 78, 30, CAD, PAPER, 4),
    circle(100, 78, 14, INK),
    circle(94, 72, 5, PAPER),
    circle(140, 42, 5, SCREEN),
    path("M80 128 L100 120 L120 128 V150 H80 Z", INK),
    rect(60, 150, 80, 8, INK, 4),
  ],

  "age-calculator": () => [
    ...card(44, 92, 112, 60, PINK, 10),
    path("M44 104 Q58 116 72 104 T100 104 T128 104 T156 104 V98 Q156 92 150 92 H50 Q44 92 44 98 Z", PAPER, INK, 3),
    ...[70, 100, 130].flatMap((x) => [rect(x - 4, 60, 8, 32, [BLUE, LIME, YELLOW][(x - 70) / 30], 2, INK, 2), path(`M${x} 42 Q${x + 8} 52 ${x} 58 Q${x - 8} 52 ${x} 42 Z`, ORANGE, INK, 2)]),
  ],
  "bmi-calculator": () => [...gauge(100, 120, 66, 0.42, [BLUE, MINT, YELLOW, RED]), ...chip("22.5", 144)],
  "countdown-timer": () => [...card(26, 38, 148, 88, INK, 12), text(100, 96, "00:10", 34, LIME, { ff: "mono" }), rect(26, 140, 148, 10, PAPER, 5, INK, 2), rect(26, 140, 40, 10, LIME, 5)],
  "date-calculator": () => [
    ...card(30, 26, 140, 124, PAPER, 10),
    rect(30, 26, 140, 26, RED, 10),
    rect(30, 40, 140, 12, RED),
    rect(56, 18, 6, 18, INK, 3),
    rect(138, 18, 6, 18, INK, 3),
    ...Array.from({ length: 20 }, (_, index) => circle(46 + (index % 5) * 27, 68 + Math.floor(index / 5) * 20, 3.5, GRAY)),
    rect(73, 82, 81, 12, LIME, 6),
    circle(73, 88, 9, INK),
    circle(154, 88, 9, INK),
    ...chip("+30 d", 162),
  ],
  "dice-roller": () => [
    ...card(30, 52, 68, 68, PAPER, 14),
    ...[[46, 68], [82, 68], [64, 86], [46, 104], [82, 104]].map(([x, y]) => circle(x, y, 6, INK)),
    ...card(104, 70, 68, 68, RED, 14),
    ...[[120, 86], [138, 104], [156, 122]].map(([x, y]) => circle(x, y, 6, PAPER)),
  ],
  "flip-a-coin": () => [
    circle(104, 102, 54, INK),
    circle(100, 98, 54, YELLOW, INK, 3),
    circle(100, 98, 42, "none", INK, 2),
    text(100, 114, "1", 44),
    line("M36 44 Q52 26 70 34", INK, 3),
    line("M130 34 Q148 26 164 44", INK, 3),
  ],
  "gpa-calculator": () => [
    ...page(36, 20, 128, 132, 0),
    ...["A", "A−", "B+"].flatMap((grade, index) => [rect(50, 40 + index * 26, 56, 8, GRAY, 4), text(140, 49 + index * 26, grade, 16, index ? INK : GREEN)]),
    ...chip("3.8", 160),
  ],
  "loan-calculator": () => [
    ...card(22, 72, 104, 58, MINT, 6),
    circle(74, 101, 16, PAPER, INK, 2.5),
    text(74, 107, "$", 18),
    circle(148, 64, 28, LIME, INK, 3),
    text(148, 73, "%", 26),
    ...chip("APR", 152),
  ],
  "mortgage-calculator": () => [
    path("M30 86 L90 40 L150 86 Z", INK),
    path("M26 82 L86 36 L146 82 Z", RED, INK, 3),
    ...card(38, 82, 96, 70, PAPER, 4),
    rect(74, 112, 24, 40, BLUE, 2, INK, 2),
    rect(50, 96, 18, 16, SKY, 2, INK, 2),
    circle(154, 120, 24, LIME, INK, 3),
    text(154, 128, "%", 22),
  ],
  "percentage-calculator": () => [circle(88, 90, 52, INK), circle(84, 86, 52, PAPER, INK, 3), wedge(84, 86, 52, 0, 90, LIME), ...chip("25%", 152)],
  "scientific-calculator": () => [
    ...card(52, 18, 96, 148, INK, 12),
    rect(60, 28, 80, 28, LIME, 4),
    text(132, 49, "3.1416", 14, INK, { a: "end", ff: "mono" }),
    ...Array.from({ length: 16 }, (_, index) => rect(62 + (index % 4) * 19.5, 66 + Math.floor(index / 4) * 23, 15, 18, index % 4 === 3 ? ORANGE : PAPER, 4)),
  ],
  "random-number-generator": () => [...card(36, 40, 128, 88, PAPER, 14), text(100, 102, "42", 50), ...chip("1–100", 146)],
  "spin-the-wheel": () => [
    circle(104, 98, 62, INK),
    ...[PINK, BLUE, LIME, YELLOW, MINT, ORANGE].map((color, index) => wedge(100, 94, 62, index * 60, index * 60 + 60, color)),
    circle(100, 94, 10, PAPER, INK, 3),
    path("M90 22 H110 L100 40 Z", INK),
  ],
  "online-timer": () => [rect(92, 22, 16, 12, INK, 3), circle(104, 98, 58, INK), circle(100, 94, 58, PAPER, INK, 3), wedge(100, 94, 50, 0, 120, LIME), ...chip("05:00", 160)],
  "pomodoro-timer": () => [
    circle(104, 104, 56, INK),
    circle(100, 100, 56, RED, INK, 3),
    path("M100 46 L86 34 L100 40 L110 28 L106 42 L120 40 Z", GREEN, INK, 2.5),
    text(100, 110, "25:00", 22, PAPER, { ff: "mono" }),
  ],
  stopwatch: () => [rect(92, 22, 16, 14, INK, 3), rect(140, 40, 14, 10, INK, 3), circle(104, 104, 56, INK), circle(100, 100, 56, PAPER, INK, 4), circle(100, 124, 12, "none", GRAY, 2), ...clockHands(100, 100, 50, 2, 40)],
  "world-clock": () => [
    circle(84, 92, 52, INK),
    circle(80, 88, 52, BLUE, INK, 3),
    path("M50 64 Q70 54 82 72 Q76 92 60 96 Q46 86 50 64 Z", GREEN),
    path("M92 104 Q112 96 118 116 Q104 134 92 124 Z", GREEN),
    line("M28 88 H132 M80 36 V140", PAPER, 2, 0.6),
    circle(140, 132, 28, PAPER, INK, 3),
    ...clockHands(140, 132, 22, 3, 15),
    ...chip("UTC", 168),
  ],

  "data-explorer": () => [
    ...card(16, 22, 110, 104, PAPER, 8),
    ...table(24, 32, 94, 84, 3, 5),
    ...card(96, 86, 88, 76, INK, 8),
    rect(108, 132, 12, 20, LIME, 2),
    rect(126, 116, 12, 36, PINK, 2),
    rect(144, 104, 12, 48, BLUE, 2),
    rect(162, 96, 12, 56, YELLOW, 2),
  ],
  "gis-viewer": () => [
    ...card(20, 24, 160, 120, "#cde9dc", 10),
    path("M26 60 Q60 40 92 56 T150 50 Q170 80 150 110 T90 128 Q50 136 30 110 Z", MINT, INK, 2),
    line("M26 100 C70 80 110 120 174 70", PAPER, 6),
    line("M60 30 L120 140", PAPER, 4),
    ...pin(122, 82, 18),
  ],
  "dicom-viewer": () => [
    ...card(36, 20, 128, 132, INK, 8),
    rect(98, 32, 4, 108, PAPER),
    ...[48, 66, 84, 102].map((y) => line(`M58 ${y + 10} Q100 ${y - 8} 142 ${y + 10}`, PAPER, 3)),
    circle(100, 42, 10, "none", PAPER, 3),
  ],
  "dicom-anonymizer": () => [
    ...card(36, 20, 128, 132, INK, 8),
    rect(98, 32, 4, 80, PAPER),
    ...[44, 62, 80].map((y) => line(`M58 ${y + 10} Q100 ${y - 8} 142 ${y + 10}`, PAPER, 3)),
    rect(46, 118, 108, 22, PAPER, 4),
    rect(52, 124, 60, 10, INK, 2),
    text(132, 134, "***", 14),
  ],

  "3d-model-viewer": () => [
    ...cube(100, 78, 38),
    line("M30 104 A72 26 0 0 0 170 104", INK, 4),
    arrowHead(150, 124, 170, 104),
    line("M170 88 A72 26 0 0 0 30 88", INK, 4, 0.35),
  ],
  "lithophane-maker": () => [
    line("M100 14 V30 M60 24 L70 38 M140 24 L130 38", YELLOW, 5),
    ...card(52, 40, 96, 116, "#fff6d6", 6),
    ...scenery(60, 48, 80, 100, "#f1ece0", "#ffffff", "#a39a86"),
    rect(40, 152, 120, 10, INK, 5),
  ],

  "sticker-maker": () => [
    circle(104, 94, 60, INK),
    circle(100, 90, 60, PAPER, INK, 3),
    circle(100, 90, 48, PINK),
    star(100, 90, 26, LIME),
    path("M140 128 Q150 140 160 132 L148 116 Z", CREAM, INK, 2.5),
  ],
  "print-then-cut": () => [
    ...card(28, 18, 144, 144, PAPER, 4),
    rect(36, 26, 12, 12, INK),
    line("M152 26 H164 V38 M36 154 V142 M36 154 H48", INK, 3),
    ...[[72, 68, PINK], [128, 68, BLUE], [72, 120, LIME], [128, 120, YELLOW]].flatMap(([x, y, color]) => [circle(Number(x), Number(y), 22, "none", RED, 2), circle(Number(x), Number(y), 16, String(color), INK, 2)]),
  ],
  "perler-bead-pattern-maker": () =>
    HEART.flatMap((row, rowIndex) =>
      [...row].flatMap((cell, col) => {
        const x = 34 + col * 22;
        const y = 36 + rowIndex * 22;
        return [circle(x, y, 10, cell === "1" ? (rowIndex < 2 ? PINK : RED) : PAPER, INK, 2), circle(x, y, 3.5, BACKGROUNDS.craft)];
      }),
    ),
  "pixel-art-converter": () => [
    ...photo(14, 60, 60, 60),
    ...arrow(80, 90, 96, 90),
    ...pixelGrid(102, 52, 11, ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"], { "1": RED }),
  ],
  "cross-stitch-pattern-generator": () => {
    const marks: CardMark[] = [...card(30, 22, 140, 140, PAPER, 4)];
    for (let index = 1; index < 7; index += 1) marks.push(rect(30 + index * 20, 22, 1, 140, GRAY), rect(30, 22 + index * 20, 140, 1, GRAY));
    HEART.forEach((row, rowIndex) => [...row].forEach((cell, col) => {
      if (cell !== "1") return;
      const x = 34 + col * 20;
      const y = 34 + rowIndex * 20;
      marks.push(line(`M${x} ${y} L${x + 12} ${y + 12} M${x + 12} ${y} L${x} ${y + 12}`, rowIndex < 2 ? RED : PINK, 3));
    }));
    return marks;
  },
  "diamond-painting-pattern-generator": () => {
    const marks: CardMark[] = [];
    const colors = [BLUE, VIOLET, PINK, LIME];
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const cx = 40 + col * 24;
        const cy = 40 + row * 22;
        marks.push(path(`M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z`, colors[(row + col) % 4], INK, 1.5));
      }
    }
    marks.push(...chip("A·B·C·D", 166));
    return marks;
  },
  "knitting-chart-generator": () => {
    const marks: CardMark[] = [];
    const colors = [RED, PAPER, RED, BLUE, PAPER, BLUE];
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const x = 30 + col * 20;
        const y = 28 + row * 22;
        marks.push(line(`M${x} ${y} L${x + 10} ${y + 16} L${x + 20} ${y}`, (row + col) % 5 === 0 ? LIME : colors[row], 6));
      }
    }
    return marks;
  },
  "quilt-pattern-generator": () => {
    const marks: CardMark[] = [...card(28, 20, 144, 144, PAPER, 4)];
    const colors = [PINK, BLUE, YELLOW, MINT];
    for (let index = 0; index < 9; index += 1) {
      const x = 28 + (index % 3) * 48;
      const y = 20 + Math.floor(index / 3) * 48;
      const flip = index % 2 === 0;
      marks.push(path(flip ? `M${x} ${y} H${x + 48} V${y + 48} Z` : `M${x} ${y + 48} H${x + 48} V${y} Z`, colors[index % 4], INK, 1.5));
    }
    return marks;
  },
  "laser-engraving": () => [
    rect(84, 18, 32, 22, INK, 4),
    line("M100 40 V96", RED, 4),
    circle(100, 98, 8, RED, undefined, undefined, 0.45),
    circle(100, 98, 3.5, YELLOW),
    ...card(22, 92, 156, 68, "#e8c39e", 8),
    ...[0, 1, 2, 3].map((row) => rect(34, 104 + row * 12, [60, 100, 80, 120][row], 5, "#8a5a33", 2.5)),
  ],
  "dither-image": () => {
    const marks: CardMark[] = [...card(24, 22, 152, 124, PAPER, 8)];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 9; col += 1) marks.push(circle(38 + col * 16, 36 + row * 16, Math.max(1.2, 7.2 - col * 0.72), INK));
    }
    marks.push(...chip("1-bit", 160));
    return marks;
  },

  "qr-code-generator": (rng) => qrCode(rng),
  "barcode-generator": (rng) => barcode(rng, "5 901234 123457", "CODE128"),
  "upc-barcode-generator": (rng) => barcode(rng, "0 36000 29145 2", "UPC-A"),
  "ean-13-barcode-generator": (rng) => barcode(rng, "4 006381 333931", "EAN-13"),
  "password-generator": () => [
    ...card(20, 58, 160, 46, PAPER, 12),
    ...[0, 1, 2, 3, 4, 5, 6].map((index) => circle(42 + index * 18, 81, 6, index === 5 ? GREEN : INK)),
    rect(20, 120, 160, 12, PAPER, 6, INK, 2.5),
    rect(20, 120, 120, 12, GREEN, 6),
    ...chip("16+", 150),
  ],
  "font-generator": () => [
    ...card(24, 26, 152, 120, PAPER, 12),
    text(70, 98, "Aa", 48, INK, { ff: "serif", st: "italic" }),
    text(140, 80, "Aa", 26, WORD, { w: 900 }),
    text(140, 118, "Aa", 22, RED, { ff: "mono" }),
  ],
  "cursive-font-generator": () => [...card(24, 26, 152, 120, PAPER, 12), text(100, 110, "Aa", 72, INK, { ff: "serif", st: "italic", w: 400 }), line("M50 126 C80 116 120 136 154 120", PINK, 4)],
  "bold-text-generator": () => [text(104, 130, "B", 112, INK, { w: 900 }), text(100, 126, "B", 112, LIME, { w: 900 })],
  "word-counter": () => [...page(24, 24, 112, 132, 9), ...card(104, 110, 76, 44, LIME, 10), text(142, 139, "1,234", 17)],
  "json-formatter": () => [
    ...card(22, 22, 156, 132, INK, 12),
    text(36, 48, "{", 20, LIME, { a: "start", ff: "mono" }),
    ...[[54, 66, PINK, 44], [54, 86, BLUE, 60], [70, 106, YELLOW, 52], [54, 126, MINT, 36]].map(([x, y, color, w]) => rect(Number(x), Number(y) - 7, Number(w), 7, String(color), 3.5)),
    text(36, 146, "}", 20, LIME, { a: "start", ff: "mono" }),
  ],
  "grammar-checker": () => [
    ...card(20, 34, 160, 92, PAPER, 10),
    rect(34, 52, 60, 8, INK, 4),
    rect(100, 52, 64, 8, INK, 4),
    line("M100 66 L104 70 L108 66 L112 70 L116 66 L120 70 L124 66 L128 70 L132 66 L136 70 L140 66 L144 70 L148 66 L152 70 L156 66 L160 70 L164 66", RED, 2.5),
    rect(34, 80, 100, 8, INK, 4),
    rect(34, 102, 76, 8, GRAY, 4),
    circle(154, 136, 22, GREEN, INK, 3),
    line("M144 136 L151 143 L164 128", PAPER, 4.5),
  ],
  "diff-checker": () => [
    ...card(16, 28, 168, 124, PAPER, 10),
    rect(99, 34, 2, 112, GRAY),
    ...[0, 1, 2, 3, 4].flatMap((row) => {
      const y = 44 + row * 20;
      const marks: CardMark[] = [];
      if (row === 1) marks.push(rect(22, y - 5, 72, 16, PINK, 3));
      if (row === 3) marks.push(rect(106, y - 5, 72, 16, MINT, 3));
      marks.push(rect(30, y, [52, 40, 56, 44, 30][row], 6, INK, 3), rect(114, y, [52, 40, 56, 50, 30][row], 6, INK, 3));
      return marks;
    }),
    text(26, 70, "−", 12, RED, { a: "start" }),
    text(110, 110, "+", 12, GREEN, { a: "start" }),
  ],
  ...BATCH_2026_10_SCENES(),
};

/* 2026-10 batch ------------------------------------------------------------ */

function codeWindow(x: number, y: number, w: number, h: number, fill = INK): CardMark[] {
  return [...card(x, y, w, h, fill, 12), circle(x + 14, y + 13, 3.5, RED), circle(x + 25, y + 13, 3.5, YELLOW), circle(x + 36, y + 13, 3.5, SCREEN)];
}

function swapText(left: string, right: string, label: string, leftFill = PAPER, rightFill = LIME, size = 20): CardMark[] {
  return [
    ...card(16, 48, 72, 72, leftFill, 12),
    text(52, 92, left, size, INK, { ff: "mono" }),
    ...arrow(92, 84, 110, 84),
    ...card(114, 48, 72, 72, rightFill, 12),
    text(150, 92, right, size, INK, { ff: "mono" }),
    ...chip(label, 150),
  ];
}

function hexRows(rng: () => number, x: number, y: number, rows: number, color = LIME): CardMark[] {
  return Array.from({ length: rows }, (_, row) => text(x, y + row * 16, Array.from({ length: 12 }, () => "0123456789abcdef"[rng() % 16]).join(""), 12, color, { a: "start", ff: "mono" }));
}

function uuidBar(y: number, colors: string[]): CardMark[] {
  const widths = [40, 20, 20, 20, 52];
  let x = 26;
  return widths.flatMap((width, index) => {
    const marks = [rect(x, y, width, 10, colors[index % colors.length], 5)];
    x += width + 4;
    return marks;
  });
}

function ruler(x: number, y: number, w: number, label: string, fill = YELLOW): CardMark[] {
  const marks: CardMark[] = [...card(x, y, w, 34, fill, 6)];
  for (let tick = 0; tick <= 10; tick += 1) marks.push(rect(x + 8 + ((w - 16) / 10) * tick, y, 2, tick % 5 === 0 ? 16 : 9, INK));
  marks.push(text(x + w / 2, y + 28, label, 11, INK, { ff: "mono" }));
  return marks;
}

function swatchRow(y: number, colors: string[], h = 70): CardMark[] {
  const width = 160 / colors.length;
  return [...card(20, y, 160, h, PAPER, 10), ...colors.map((color, index) => rect(20 + index * width, y, width, h, color, index === 0 ? 10 : 0))];
}

function receipt(x: number, y: number): CardMark[] {
  return [path(`M${x} ${y} H${x + 70} V${y + 100} L${x + 60} ${y + 92} L${x + 50} ${y + 100} L${x + 40} ${y + 92} L${x + 30} ${y + 100} L${x + 20} ${y + 92} L${x + 10} ${y + 100} L${x} ${y + 92} Z`, PAPER, INK, 3), ...textLines(x + 10, y + 14, 50, 5, GRAY, 13, 5)];
}

function controller(cx: number, cy: number): CardMark[] {
  return [
    path(`M${cx - 60} ${cy - 18} Q${cx - 70} ${cy + 40} ${cx - 48} ${cy + 40} Q${cx - 36} ${cy + 40} ${cx - 26} ${cy + 18} H${cx + 26} Q${cx + 36} ${cy + 40} ${cx + 48} ${cy + 40} Q${cx + 70} ${cy + 40} ${cx + 60} ${cy - 18} Q${cx + 54} ${cy - 30} ${cx + 36} ${cy - 30} H${cx - 36} Q${cx - 54} ${cy - 30} ${cx - 60} ${cy - 18} Z`, VIOLET, INK, 3),
    rect(cx - 42, cy - 8, 22, 7, INK, 2),
    rect(cx - 34.5, cy - 15.5, 7, 22, INK, 2),
    circle(cx + 36, cy - 14, 5, LIME, INK, 2),
    circle(cx + 46, cy - 4, 5, RED, INK, 2),
    circle(cx + 26, cy - 4, 5, BLUE, INK, 2),
    circle(cx + 36, cy + 6, 5, YELLOW, INK, 2),
    circle(cx - 14, cy + 12, 8, INK),
    circle(cx + 14, cy + 12, 8, INK),
  ];
}

function BATCH_2026_10_SCENES(): Record<string, Scene> {
  return {
    "base64-encoder": () => swapText("Aa", "QWE=", "ENCODE"),
    "base64-decode": () => swapText("QWE=", "Aa", "DECODE", LIME, PAPER),
    "url-encoder": () => [...codeWindow(18, 34, 164, 92, PAPER), text(100, 96, "a%20b", 26, WORD, { ff: "mono" }), ...chip("URL ENCODE", 150)],
    "url-decode": () => [...codeWindow(18, 34, 164, 92, PAPER), text(64, 96, "%20", 20, RED, { ff: "mono" }), ...arrow(96, 89, 116, 89), rect(128, 82, 34, 14, LIME, 4, INK, 2), ...chip("URL DECODE", 150)],
    "html-entity-encoder": () => [...codeWindow(18, 30, 164, 100), text(62, 96, "<", 40, PINK, { ff: "mono" }), ...arrow(84, 84, 104, 84, LIME), text(144, 92, "&lt;", 22, LIME, { ff: "mono" }), ...chip("&amp;", 150)],
    "uuid-generator": () => [...card(18, 30, 164, 106, PAPER, 12), ...uuidBar(48, [VIOLET, BLUE, LIME, PINK, YELLOW]), ...uuidBar(72, [INK, GRAY]), ...uuidBar(96, [GRAY, INK]), ...chip("UUID v4", 150)],
    "guid-generator": () => [...card(18, 30, 164, 106, PAPER, 12), text(24, 92, "{", 40, INK, { a: "start", ff: "mono" }), text(176, 92, "}", 40, INK, { a: "end", ff: "mono" }), ...uuidBar(64, [WORD, BLUE, SKY, BLUE, WORD]).map((mark) => (mark.t === "r" ? { ...mark, x: mark.x + 4, w: mark.w * 0.9 } : mark)), ...uuidBar(90, [GRAY]).map((mark) => (mark.t === "r" ? { ...mark, x: mark.x + 4, w: mark.w * 0.9 } : mark)), ...chip("GUID", 150)],
    "hash-generator": (rng) => [...codeWindow(18, 26, 164, 112), text(48, 92, "#", 54, LIME), ...hexRows(rng, 76, 62, 4), ...chip("SHA · MD5", 152)],
    "md5-generator": (rng) => [...codeWindow(18, 26, 164, 112), ...hexRows(rng, 32, 56, 5, PINK), ...chip("MD5", 152)],
    "sha256-generator": (rng) => [...codeWindow(18, 26, 164, 112), ...hexRows(rng, 32, 56, 5, MINT), ...chip("SHA-256", 152)],
    "jwt-decoder": () => [...codeWindow(14, 34, 172, 92), rect(28, 76, 40, 14, RED, 4), text(74, 89, ".", 22, PAPER), rect(80, 76, 50, 14, VIOLET, 4), text(136, 89, ".", 22, PAPER), rect(142, 76, 30, 14, BLUE, 4), ...chip("JWT", 150)],
    "regex-tester": () => [...card(18, 30, 164, 104, PAPER, 12), text(100, 70, "/a.+z/g", 20, INK, { ff: "mono" }), rect(30, 92, 52, 14, LIME, 3), rect(96, 92, 34, 14, LIME, 3), ...textLines(30, 96, 140, 1, GRAY, 10, 6), ...chip(".*", 150)],
    "case-converter": () => [text(58, 104, "aA", 50, INK, { ff: "serif" }), ...curvedArrow(92, 70, 112, 48, 132, 70), text(150, 104, "Aa", 50, WORD, { w: 900 }), ...chip("Title Case", 150)],
    "uppercase-converter": () => swapText("abc", "ABC", "UPPERCASE", PAPER, YELLOW, 22),
    "lorem-ipsum-generator": () => [...page(30, 22, 140, 128, 7), text(100, 48, "Lorem ipsum", 16, INK, { ff: "serif", st: "italic" }), ...chip("¶ × 3", 152)],
    "remove-duplicate-lines": () => [...card(24, 24, 152, 124, PAPER, 10), ...[0, 1, 2, 3, 4].map((row) => rect(40, 42 + row * 20, [80, 64, 80, 96, 64][row], 8, row === 2 || row === 4 ? GRAY : INK, 4)), line("M34 66 H136 M34 126 H120", RED, 4), ...chip("−2 lines", 156)],
    "sort-lines-alphabetically": () => [...card(24, 24, 116, 124, PAPER, 10), ...[0, 1, 2, 3, 4].map((row) => text(40, 50 + row * 20, "ABCDE"[row], 14, INK, { a: "start", ff: "mono" })), ...[0, 1, 2, 3, 4].map((row) => rect(58, 42 + row * 20, 40 + row * 10, 8, GRAY, 4)), ...arrow(160, 40, 160, 136), ...chip("A → Z", 156)],
    "unix-timestamp-converter": () => [circle(62, 82, 42, PAPER, INK, 4), ...clockHands(62, 82, 42, 10, 10), ...card(108, 62, 76, 40, LIME, 8), text(146, 87, "1767…", 14, INK, { ff: "mono" }), ...chip("UNIX TIME", 150)],
    "epoch-converter": () => [...card(20, 34, 160, 94, INK, 12), text(100, 80, "1970-01-01", 18, LIME, { ff: "mono" }), text(100, 108, "00:00:00Z", 14, PAPER, { ff: "mono" }), ...chip("EPOCH", 150)],
    "cron-expression-generator": () => [...card(18, 24, 164, 92, PAPER, 10), text(100, 64, "*/15 9-17 * * 1-5", 13, INK, { ff: "mono" }), ...[0, 1, 2, 3, 4, 5, 6].map((day) => rect(30 + day * 20, 82, 16, 16, day > 0 && day < 6 ? LIME : CREAM, 3, INK, 1.5)), ...chip("CRON", 140)],
    "number-base-converter": () => [text(50, 100, "10", 44, INK, { ff: "mono" }), ...arrow(84, 76, 116, 76), ...arrow(116, 96, 84, 96), text(150, 100, "16", 44, WORD, { ff: "mono" }), ...chip("BASE 2–36", 150)],
    "binary-to-decimal": () => swapText("1010", "10", "BIN → DEC", CREAM, MINT, 18),
    "hex-to-decimal": () => swapText("FF", "255", "HEX → DEC", SKY, MINT, 22),
    "yaml-to-json": () => conversion(["YAML", "code"], ["JSON", "code"]),
    "json-to-yaml": () => conversion(["JSON", "code"], ["YAML", "code"]),
    "markdown-preview": () => [...card(18, 30, 72, 108, PAPER, 10), text(54, 92, "M↓", 26, INK, { w: 900 }), ...card(102, 30, 80, 108, PAPER, 10), rect(112, 44, 50, 9, INK, 4), ...textLines(112, 64, 60, 5, GRAY, 12, 5), ...chip("PREVIEW", 150)],
    "markdown-to-html": () => conversion(["MD", "text"], ["HTML", "code"]),
    "sql-formatter": () => [...codeWindow(18, 26, 164, 116), text(32, 56, "SELECT", 13, PINK, { a: "start", ff: "mono" }), rect(48, 64, 70, 7, PAPER, 3.5), text(32, 90, "FROM", 13, PINK, { a: "start", ff: "mono" }), rect(48, 98, 56, 7, PAPER, 3.5), text(32, 124, "WHERE", 13, PINK, { a: "start", ff: "mono" }), ...chip("SQL", 152)],
    "unit-converter": () => [...ruler(20, 40, 160, "m · ft · in"), ...card(40, 92, 120, 46, PAPER, 10), text(100, 122, "1 = 3.28", 18, INK, { ff: "mono" }), ...chip("UNITS", 152)],
    "kg-to-lbs": () => [path("M62 60 H138 L156 136 H44 Z", INK), circle(100, 52, 12, "none", INK, 5), text(100, 116, "kg", 26, LIME, { w: 900 }), ...chip("kg → lbs", 150)],
    "cm-to-inches": () => [...ruler(20, 48, 160, "cm", YELLOW), ...ruler(20, 96, 160, "in", SKY), ...chip("cm → in", 150)],
    "celsius-to-fahrenheit": () => [rect(88, 26, 24, 96, PAPER, 12, INK, 3), rect(94, 60, 12, 64, RED, 6), circle(100, 128, 18, RED, INK, 3), text(52, 80, "°C", 24, INK), text(152, 80, "°F", 24, RED), ...chip("°C → °F", 156)],
    "km-to-miles": () => [path("M70 150 L90 40 H110 L130 150 Z", GRAY, INK, 3), line("M100 54 V70 M100 88 V104 M100 122 V138", PAPER, 4), ...card(122, 40, 64, 40, SCREEN, 8), text(154, 66, "km→mi", 12, PAPER), ...chip("10 km", 156)],
    "tip-calculator": () => [...receipt(24, 30), circle(140, 92, 34, YELLOW, INK, 3), text(140, 104, "%", 34, INK, { w: 900 }), ...chip("TIP 18%", 152)],
    "discount-calculator": () => [path("M34 64 L84 30 H170 V110 H84 Z", PINK, INK, 3), circle(70, 70, 7, PAPER, INK, 2), text(128, 82, "−25%", 26, INK, { w: 900 }), ...chip("SALE", 140)],
    "compound-interest-calculator": () => [...card(20, 26, 160, 110, PAPER, 10), ...[0, 1, 2, 3, 4, 5].map((index) => rect(34 + index * 24, 122 - (index + 1) ** 1.7 * 5, 16, (index + 1) ** 1.7 * 5, index === 5 ? LIME : MINT, 3, INK, 1.5)), line("M34 118 Q120 110 170 40", GREEN, 3), ...chip("7% / yr", 150)],
    "calorie-calculator": () => [path("M100 30 C130 60 140 80 130 110 C122 136 78 136 70 110 C62 88 80 74 88 56 C96 70 104 74 108 66 C110 54 104 42 100 30 Z", ORANGE, INK, 3), path("M100 90 C110 100 112 112 104 120 C96 126 86 120 88 110 C90 102 96 98 100 90 Z", YELLOW), ...chip("2,000 kcal", 150)],
    "salary-calculator": () => [...card(22, 46, 156, 76, MINT, 10), circle(100, 84, 22, PAPER, INK, 3), text(100, 93, "$", 24, GREEN, { w: 900 }), text(38, 66, "/yr", 12, INK, { a: "start", ff: "mono" }), ...chip("SALARY", 150)],
    "roman-numeral-converter": () => [rect(30, 40, 140, 12, CREAM, 2, INK, 2.5), rect(30, 116, 140, 12, CREAM, 2, INK, 2.5), text(100, 102, "MMXXVI", 30, INK, { ff: "serif", w: 700 }), ...chip("2026", 150)],
    "bmr-calculator": () => [...person(64, 34, 70, MINT), ...gauge(140, 104, 34, 0.55, [MINT, YELLOW, ORANGE]), ...chip("BMR", 150)],
    "hourly-to-salary-calculator": () => [circle(60, 84, 38, PAPER, INK, 4), ...clockHands(60, 84, 38, 3, 0), ...arrow(104, 84, 124, 84), ...card(130, 60, 52, 48, MINT, 8), text(156, 92, "$", 24, GREEN, { w: 900 }), ...chip("$25/h → /yr", 150)],
    "color-palette-generator": () => [...swatchRow(34, ["#ff5a4e", "#ffd84d", "#8fd9b6", "#7eb6ff", "#8c7bff"], 92), ...chip("PALETTE", 148)],
    "color-converter": () => [...card(20, 30, 70, 100, "#3d6df2", 12), ...textLines(104, 46, 70, 3, INK, 26, 8), text(104, 42, "HEX", 9, INK, { a: "start" }), text(104, 68, "RGB", 9, INK, { a: "start" }), text(104, 94, "HSL", 9, INK, { a: "start" }), ...chip("HEX · RGB · HSL", 150)],
    "hex-to-rgb": () => swapText("#1E90FF", "rgb", "HEX → RGB", PAPER, "#1e90ff", 13),
    "rgb-to-hex": () => swapText("rgb", "#FF5A4E", "RGB → HEX", "#ff5a4e", PAPER, 13),
    "favicon-generator": () => [...card(16, 40, 168, 90, PAPER, 10), rect(16, 40, 168, 26, CREAM, 10), rect(26, 46, 74, 20, PAPER, 6, INK, 2), rect(32, 50, 12, 12, LIME, 3, INK, 1.5), rect(50, 53, 40, 6, GRAY, 3), ...chip("favicon.ico", 148)],
    "image-to-base64": () => [...photo(18, 44, 72, 72), ...arrow(94, 80, 112, 80), ...codeWindow(116, 44, 68, 72), text(150, 92, "data:", 11, LIME, { ff: "mono" }), ...chip("BASE64", 148)],
    "svg-optimizer": () => compressFile("12 KB", "4 KB", "vector", "SVG −66%"),
    "meme-generator": () => [...photo(26, 22, 148, 120, "#ffd1a8", "#ff8a5b", "#7a4b9a"), text(100, 48, "TOP TEXT", 18, PAPER, { w: 900 }), text(100, 132, "BOTTOM TEXT", 16, PAPER, { w: 900 }), ...chip("MEME", 154)],
    "tic-tac-toe": () => [line("M80 30 V146 M120 30 V146 M42 70 H158 M42 108 H158", INK, 5), line("M50 38 L72 62 M72 38 L50 62 M128 116 L150 140 M150 116 L128 140", RED, 6), circle(100, 89, 12, "none", WORD, 6), circle(61, 127, 12, "none", WORD, 6)],
    "memory-game": () => [...[0, 1, 2, 3].flatMap((index) => card(22 + index * 40, 40, 32, 44, index === 1 ? PAPER : VIOLET, 6)), ...[0, 1, 2, 3].flatMap((index) => card(22 + index * 40, 96, 32, 44, index === 2 ? PAPER : VIOLET, 6)), star(78, 62, 10, YELLOW), star(118, 118, 10, YELLOW)],
    "reaction-time-test": () => [circle(100, 82, 54, SCREEN, INK, 4), text(100, 92, "CLICK!", 22, PAPER, { w: 900 }), ...chip("215 ms", 152)],
    "color-blind-test": (rng) => {
      const marks: CardMark[] = [circle(100, 84, 62, CREAM, INK, 3)];
      for (let index = 0; index < 70; index += 1) {
        const angle = (rng() % 360) * (Math.PI / 180);
        const distance = Math.sqrt((rng() % 1000) / 1000) * 54;
        const x = 100 + Math.cos(angle) * distance;
        const y = 84 + Math.sin(angle) * distance;
        const inFigure = Math.abs(x - 100) < 18 && Math.abs(y - 84) < 32;
        marks.push(circle(x, y, 3 + (rng() % 4), inFigure ? ORANGE : "#9aa84f"));
      }
      return marks;
    },
    "gamepad-tester": () => [...controller(100, 84), ...chip("GAMEPAD", 150)],
    "what-is-my-ip": () => [circle(76, 82, 46, SKY, INK, 4), line("M30 82 H122 M76 36 V128", INK, 2.5), path("M76 36 Q46 82 76 128 Q106 82 76 36 Z", "none", INK, 2.5), ...card(118, 60, 66, 40, LIME, 8), text(151, 87, "IP", 20, INK, { w: 900 }), ...chip("203.0.113.7", 150)],
    "internet-speed-test": () => [...gauge(100, 116, 70, 0.78, [RED, YELLOW, SCREEN, LIME]), text(100, 104, "Mbps", 13, INK), ...chip("SPEED", 146)],
    "dns-lookup": () => [...card(70, 26, 60, 34, INK, 8), text(100, 48, "DNS", 13, LIME, { w: 900 }), line("M100 60 V76 M44 76 H156 M44 76 V92 M100 76 V92 M156 76 V92", INK, 3), ...card(22, 92, 44, 30, PAPER, 6), text(44, 112, "A", 13), ...card(78, 92, 44, 30, PAPER, 6), text(100, 112, "MX", 13), ...card(134, 92, 44, 30, PAPER, 6), text(156, 112, "TXT", 12), ...chip("example.com", 146)],
    "currency-converter": () => [circle(58, 84, 36, YELLOW, INK, 3), text(58, 98, "$", 36, INK, { w: 900 }), ...arrow(98, 72, 118, 72), ...arrow(118, 96, 98, 96), circle(142, 84, 36, MINT, INK, 3), text(142, 98, "€", 34, INK, { w: 900 }), ...chip("USD → EUR", 146)],
  };
}

function compareDocs(left: string, right: string): CardMark[] {
  return [
    ...card(18, 26, 76, 112, PAPER, 8),
    ...card(106, 26, 76, 112, PAPER, 8),
    ...textLines(28, 42, 56, 7, GRAY, 13, 5),
    ...textLines(116, 42, 56, 7, GRAY, 13, 5),
    rect(24, 64, 64, 11, PINK, 3),
    rect(112, 90, 64, 11, MINT, 3),
    ...chip(`${left} ⇄ ${right}`, 154),
  ];
}

function qrCode(rng: () => number): CardMark[] {
  const cell = 9;
  const size = 15;
  const origin = 100 - (cell * size) / 2;
  const marks: CardMark[] = [...card(origin - 10, origin - 10, cell * size + 20, cell * size + 20, PAPER, 10)];
  const finder = (col: number, row: number) => (col < 5 && row < 5) || (col >= size - 5 && row < 5) || (col < 5 && row >= size - 5);
  for (const [col, row] of [[0, 0], [size - 5, 0], [0, size - 5]] as const) {
    marks.push(rect(origin + col * cell, origin + row * cell, cell * 5, cell * 5, INK, 4));
    marks.push(rect(origin + col * cell + cell * 0.8, origin + row * cell + cell * 0.8, cell * 3.4, cell * 3.4, PAPER, 2));
    marks.push(rect(origin + col * cell + cell * 1.5, origin + row * cell + cell * 1.5, cell * 2, cell * 2, INK, 2));
  }
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const center = col >= 6 && col <= 8 && row >= 6 && row <= 8;
      if (finder(col, row) || center || rng() % 2) continue;
      marks.push(rect(origin + col * cell, origin + row * cell, cell - 1, cell - 1, INK, 1.5));
    }
  }
  marks.push(rect(origin + 6 * cell, origin + 6 * cell, cell * 3, cell * 3, LIME, 4, INK, 2));
  return marks;
}

function barcode(rng: () => number, digits: string, label: string): CardMark[] {
  const marks: CardMark[] = [...card(22, 30, 156, 104, PAPER, 10)];
  let cursor = 36;
  while (cursor < 162) {
    const width = 2 + (rng() % 3) * 2;
    marks.push(rect(cursor, 42, width, 62, INK));
    cursor += width + 2 + (rng() % 2) * 2;
  }
  marks.push(text(100, 122, digits, 12, INK, { ff: "mono" }), ...chip(label, 152));
  return marks;
}

function sceneFor(kind: FreeToolKind, slug: string): CardMark[] {
  const scene = SCENES[slug];
  if (scene) return scene(rngFor(slug));
  const [left, right] = slug.split("-to-");
  if (right) {
    const from = format(left.split("-").pop() ?? left);
    const to = format(right.split("-")[0]);
    if (from && to) return conversion(from, to);
  }
  if (slug.endsWith("-viewer")) {
    const item = format(slug.replace(/-viewer$/, ""));
    if (item) return viewer(item);
  }
  return fallback(kind);
}

function fallback(kind: FreeToolKind): CardMark[] {
  return [...card(46, 36, 108, 108, PAPER, 16), text(100, 104, kind.slice(0, 2).toUpperCase(), 34)];
}

export function coverFor(kind: FreeToolKind, slug: string): CardCover {
  const category = getFreeTool(slug)?.category;
  return { background: category ? BACKGROUNDS[category] : CREAM, marks: sceneFor(kind, slug) };
}

export function marksForCard(kind: FreeToolKind, slug: string): CardMark[] {
  return sceneFor(kind, slug);
}

export function serializeCardMarks(marks: CardMark[]): string {
  return marks
    .map((mark) => {
      if (mark.t === "c") return `c,${mark.x},${mark.y},${mark.r},${mark.f},${mark.s ?? ""},${mark.sw ?? ""},${mark.o ?? ""}`;
      if (mark.t === "p") return `p,${mark.d},${mark.f ?? ""},${mark.s ?? ""},${mark.w ?? ""},${mark.o ?? ""}`;
      if (mark.t === "t") return `t,${mark.x},${mark.y},${mark.z},${mark.f},${mark.ff ?? ""},${mark.st ?? ""},${mark.v}`;
      return `r,${mark.x},${mark.y},${mark.w},${mark.h},${mark.rx ?? ""},${mark.f},${mark.s ?? ""},${mark.sw ?? ""},${mark.o ?? ""}`;
    })
    .join("|");
}
