import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function ascii(text: string) {
  return [...text].map((char) => (char.charCodeAt(0) <= 255 ? char : "?")).join("");
}

export async function textPdf(lines: string[], title = "") {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  lines.forEach((line, index) => {
    page.drawText(ascii(line), { x: 48, y: 740 - index * 16, size: 12, font, color: rgb(0, 0, 0) });
  });
  return doc.save();
}

async function load(bytes: Uint8Array) {
  return PDFDocument.load(bytes);
}

export async function withPageNumbers(bytes: Uint8Array) {
  const doc = await load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const width = page.getWidth();
    page.drawText(`${index + 1} / ${pages.length}`, { x: width / 2 - 18, y: 28, size: 10, font, color: rgb(0, 0, 0) });
  });
  return doc.save();
}

export async function withBates(bytes: Uint8Array, prefix = "ABC") {
  const doc = await load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, index) => {
    page.drawText(`${prefix}-${String(index + 1).padStart(4, "0")}`, { x: 48, y: 28, size: 10, font, color: rgb(0, 0, 0) });
  });
  return doc.save();
}

export async function withoutMetadata(bytes: Uint8Array) {
  const doc = await load(bytes);
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  return doc.save();
}

export async function unlockedPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.save();
}

export async function nUpPdf(bytes: Uint8Array, perSheet: 2 | 4) {
  const input = await load(bytes);
  const out = await PDFDocument.create();
  const pages = input.getPages();
  const width = 612;
  const height = 792;
  const slots =
    perSheet === 2
      ? [
          [24, height / 2 + 12, width - 48, height / 2 - 36],
          [24, 24, width - 48, height / 2 - 36],
        ]
      : [
          [18, height / 2 + 8, width / 2 - 28, height / 2 - 28],
          [width / 2 + 8, height / 2 + 8, width / 2 - 28, height / 2 - 28],
          [18, 18, width / 2 - 28, height / 2 - 28],
          [width / 2 + 8, 18, width / 2 - 28, height / 2 - 28],
        ];
  for (let index = 0; index < pages.length; index += perSheet) {
    const sheet = out.addPage([width, height]);
    for (let slot = 0; slot < perSheet && index + slot < pages.length; slot += 1) {
      const embedded = await out.embedPage(pages[index + slot]);
      const [x, y, w, h] = slots[slot];
      sheet.drawPage(embedded, { x, y, width: w, height: h });
    }
  }
  return out.save();
}

export async function bookletPdf(bytes: Uint8Array) {
  const input = await load(bytes);
  const source = input.getPages();
  const count = Math.ceil(source.length / 4) * 4;
  const out = await PDFDocument.create();
  for (let sheet = 0; sheet < count / 4; sheet += 1) {
    const order = [count - 1 - sheet * 2, sheet * 2, sheet * 2 + 1, count - 2 - sheet * 2];
    const page = out.addPage([792, 612]);
    for (let slot = 0; slot < 2; slot += 1) {
      const pageIndex = order[slot];
      if (pageIndex >= source.length) continue;
      const embedded = await out.embedPage(source[pageIndex]);
      page.drawPage(embedded, { x: slot * 396 + 12, y: 12, width: 372, height: 588 });
    }
  }
  return out.save();
}

export async function businessCards(bytes: Uint8Array) {
  const input = await load(bytes);
  const out = await PDFDocument.create();
  const sheet = out.addPage([612, 792]);
  const embedded = await out.embedPage(input.getPages()[0]);
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      sheet.drawPage(embedded, { x: 36 + col * 280, y: 36 + row * 148, width: 252, height: 144 });
    }
  }
  return out.save();
}
