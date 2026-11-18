import { createStoredZip } from "./zip.ts";
import { unzip } from "./unzip.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function xml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function zipText(entries: Record<string, string>) {
  return createStoredZip(Object.entries(entries).map(([name, text]) => ({ name, data: encoder.encode(text) })));
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value !== ""));
}

export function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value))
        .join(","),
    )
    .join("\n");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

export async function rowsToXlsx(rows: string[][]) {
  const sheet = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, column) => {
          const ref = `${columnName(column)}${rowIndex + 1}`;
          if (value !== "" && /^-?\d+(\.\d+)?$/.test(value)) return `<c r="${ref}"><v>${value}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return zipText({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
  });
}

export async function xlsxToRows(data: Uint8Array): Promise<string[][]> {
  const files = await unzip(data);
  const sheet = decoder.decode(files.get("xl/worksheets/sheet1.xml") ?? new Uint8Array());
  const shared = decoder.decode(files.get("xl/sharedStrings.xml") ?? new Uint8Array());
  const strings = [...shared.matchAll(/<si[\s\S]*?<\/si>/g)].map((item) =>
    [...item[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""),
  );
  const rows: string[][] = [];
  for (const match of sheet.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const ref = match[1].match(/r="([A-Z]+)(\d+)"/);
    if (!ref) continue;
    const column = ref[1].split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const rowIndex = Number(ref[2]) - 1;
    const inline = match[2].match(/<t[^>]*>([\s\S]*?)<\/t>/);
    const value = match[2].match(/<v>([\s\S]*?)<\/v>/);
    let text = inline?.[1] ?? "";
    if (!inline && value) text = match[1].includes('t="s"') ? strings[Number(value[1])] ?? "" : value[1];
    rows[rowIndex] ||= [];
    rows[rowIndex][column] = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  return rows.filter(Boolean).map((row) => Array.from(row, (cell) => cell ?? ""));
}

export async function textToDocx(paragraphs: string[]) {
  const body = paragraphs.map((line) => `<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join("");
  return zipText({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  });
}

export async function docxToText(data: Uint8Array) {
  const files = await unzip(data);
  const xmlText = decoder.decode(files.get("word/document.xml") ?? new Uint8Array());
  return xmlText
    .split(/<\/w:p>/)
    .map((part) =>
      [...part.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((item) => item[1])
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<"),
    )
    .filter(Boolean)
    .join("\n");
}

export async function textToPptx(slides: { title: string; body: string }[]) {
  const entries: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    "ppt/presentation.xml": `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("")}</Relationships>`,
    "ppt/slideMasters/slideMaster1.xml": `<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldMaster>`,
    "ppt/slideLayouts/slideLayout1.xml": `<?xml version="1.0" encoding="UTF-8"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>`,
  };
  slides.forEach((slide, index) => {
    const shape = (id: number, y: number, text: string) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="${y}"/><a:ext cx="8229600" cy="1200000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${xml(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
    entries[`ppt/slides/slide${index + 1}.xml`] = `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shape(2, 400000, slide.title)}${shape(3, 1800000, slide.body)}</p:spTree></p:cSld></p:sld>`;
  });
  return zipText(entries);
}

export function diffLines(left: string, right: string) {
  const a = left.split(/\r?\n/);
  const b = right.split(/\r?\n/);
  const rows: string[] = [];
  let changes = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i] === b[i]) rows.push(`  ${a[i] ?? ""}`);
    else {
      changes += 1;
      if (a[i] !== undefined) rows.push(`- ${a[i]}`);
      if (b[i] !== undefined) rows.push(`+ ${b[i]}`);
    }
  }
  return { text: rows.join("\n"), changes };
}

export function grammarNotes(text: string) {
  const notes: string[] = [];
  if (/  +/.test(text)) notes.push("There is a double space.");
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1]) notes.push(`Repeated word “${words[i]}”.`);
  }
  const trimmed = text.trim();
  if (trimmed && trimmed[0] === trimmed[0].toLowerCase() && /[a-z]/.test(trimmed[0])) notes.push("The first word should be capitalized.");
  if (/\ba apple\b/i.test(text)) notes.push("Use “an” before apple.");
  if (/\ba hour\b/i.test(text)) notes.push("Use “an” before hour.");
  if (/\s,/.test(text)) notes.push("Remove the space before the comma.");
  if (/\bi\b/.test(text)) notes.push("Capitalize the pronoun I.");
  return notes;
}

export type StatementRow = { date: string; description: string; amount: string };

export function parseStatement(text: string): StatementRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(-?\d+(?:\.\d{1,2})?)$/);
      if (!match) return [];
      return [{ date: match[1], description: match[2], amount: match[3] }];
    });
}

export function statementCsv(rows: StatementRow[]) {
  return toCsv([["date", "description", "amount"], ...rows.map((row) => [row.date, row.description, row.amount])]);
}

export function statementQbo(rows: StatementRow[]) {
  const items = rows
    .map((row) => {
      const digits = row.date.replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
      const type = Number(row.amount) < 0 ? "DEBIT" : "CREDIT";
      return `<STMTTRN><TRNTYPE>${type}</TRNTYPE><DTPOSTED>${digits}</DTPOSTED><TRNAMT>${row.amount}</TRNAMT><NAME>${xml(row.description)}</NAME></STMTTRN>`;
    })
    .join("");
  return `OFXHEADER:100\nDATA:OFXSGML\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>${items}</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
}

export function htmlToLines(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function jsonToRows(text: string): string[][] {
  const data = JSON.parse(text) as unknown;
  const list = Array.isArray(data) ? data : [data];
  const objects = list.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  const keys = [...new Set(objects.flatMap((item) => Object.keys(item)))];
  return [keys, ...objects.map((item) => keys.map((key) => String(item[key] ?? "")))];
}
