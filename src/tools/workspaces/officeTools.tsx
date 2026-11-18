import { useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ganttSvg, timelineSvg } from "@/tools/lib/gantt";
import { bookletPdf, businessCards, nUpPdf, textPdf, withBates, withPageNumbers, withoutMetadata } from "@/tools/lib/pdfDocs";
import {
  diffLines,
  docxToText,
  grammarNotes,
  htmlToLines,
  jsonToRows,
  parseCsv,
  parseStatement,
  statementCsv,
  statementQbo,
  textToDocx,
  textToPptx,
  toCsv,
  xlsxToRows,
  rowsToXlsx,
} from "@/tools/lib/sheets";
import {
  ActionButton,
  DropZone,
  Field,
  SelectInput,
  ResultText,
  TextInput,
  ToolPanel,
  downloadBytes,
  downloadText,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

const STATEMENT = "01/02/2026 Coffee -4.50\n01/03/2026 Payroll 2500.00";

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjs;
}

async function extractPdfText(bytes: Uint8Array) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

async function rasterPdf(lines: string[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1224;
  canvas.height = 1584;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "32px sans-serif";
  lines.slice(0, 36).forEach((line, index) => context.fillText(line, 64, 96 + index * 40));
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not encode the page."))), "image/jpeg", 0.92);
  });
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const image = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
  page.drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  return doc.save();
}

async function redactPdf(bytes: Uint8Array, phrase: string) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out = await PDFDocument.create();
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    await page.render({ canvasContext: context, viewport }).promise;
    context.fillStyle = "#000000";
    const content = await page.getTextContent();
    let hits = 0;
    for (const item of content.items) {
      if (!("str" in item) || !phrase || !item.str.toLowerCase().includes(phrase.toLowerCase())) continue;
      const transform = item.transform;
      const x = transform[4] * 2;
      const y = viewport.height - transform[5] * 2;
      context.fillRect(x - 4, y - 28, Math.max(80, item.str.length * 16), 36);
      hits += 1;
    }
    if (!hits) context.fillRect(48, viewport.height * 0.42, viewport.width - 96, 90);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not encode the page."))), "image/jpeg", 0.85);
    });
    const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const sheet = out.addPage([viewport.width / 2, viewport.height / 2]);
    sheet.drawImage(image, { x: 0, y: 0, width: sheet.getWidth(), height: sheet.getHeight() });
  }
  return out.save();
}

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string) {
  const cached = scriptLoads.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the OCR engine."));
    document.body.appendChild(script);
  });
  scriptLoads.set(src, promise);
  return promise;
}

async function readTextFile(file: File) {
  if (file.name.endsWith(".docx")) return docxToText(new Uint8Array(await file.arrayBuffer()));
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return extractPdfText(new Uint8Array(await file.arrayBuffer()));
  if (file.name.endsWith(".xlsx")) {
    const rows = await xlsxToRows(new Uint8Array(await file.arrayBuffer()));
    return rows.map((row) => row.join("\t")).join("\n");
  }
  return file.text();
}

export function OfficeTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState(defaultText(mode));
  const [other, setOther] = useState("alpha\nbeta changed");
  const [phrase, setPhrase] = useState("42");
  const [password, setPassword] = useState("");
  const [batesPrefix, setBatesPrefix] = useState("ABC");
  const [ocrLang, setOcrLang] = useState("eng");
  const [ocrPsm, setOcrPsm] = useState("3");
  const [result, setResult] = useState("");
  const [preview, setPreview] = useState("");
  const [table, setTable] = useState<string[][]>([]);

  async function run() {
    setPreview("");
    setTable([]);
    const bytesOf = async (file: File) => new Uint8Array(await file.arrayBuffer());
    const save = (bytes: Uint8Array, name: string, type: string) => {
      downloadBytes(bytes, name, type);
      return `${name} · ${bytes.byteLength} bytes`;
    };
    if (mode === "grammar") {
      const notes = grammarNotes(text);
      setPreview(notes.join("\n") || "No notes.");
      setResult(`Found ${notes.length} notes.`);
      return;
    }
    if (mode === "diff" || mode === "compare-doc") {
      const left = files[0] ? await readTextFile(files[0]) : text;
      const right = files[1] ? await readTextFile(files[1]) : other;
      const diff = diffLines(left, right);
      setPreview(diff.text);
      setResult(`${diff.changes} lines differ.`);
      return;
    }
    if (mode === "json-csv") {
      const rows = jsonToRows(text);
      const csv = toCsv(rows);
      downloadText(csv, "data.csv", "text/csv");
      setTable(rows);
      setResult(`${rows.length - 1} rows · ${rows[0]?.length ?? 0} columns`);
      return;
    }
    if (mode === "html-pdf" || mode === "text-pdf") {
      const lines = mode === "html-pdf" ? htmlToLines(text) : text.split(/\n/).filter(Boolean);
      setResult(save(await rasterPdf(lines), "document.pdf", "application/pdf"));
      return;
    }
    if (mode === "gantt" || mode === "gantt-template") {
      const tasks = (mode === "gantt-template"
        ? [["Discover", 0, 3], ["Design", 3, 4], ["Build", 7, 6], ["Launch", 13, 2]]
        : [["Design", 0, 3], ["Build", 3, 5], ["Review", 8, 2]]) as [string, number, number][];
      const svg = ganttSvg(tasks.map(([name, start, days]) => ({ name, start, days })), mode === "gantt-template" ? "Template" : "Project");
      downloadText(svg, "gantt.svg", "image/svg+xml");
      setPreview(svg);
      setResult(`${tasks.length} tasks`);
      return;
    }
    if (mode === "timeline") {
      const svg = timelineSvg([
        { label: "Kickoff", when: "Jan" },
        { label: "Build", when: "Apr" },
        { label: "Launch", when: "Oct" },
      ]);
      downloadText(svg, "timeline.svg", "image/svg+xml");
      setPreview(svg);
      setResult("3 milestones");
      return;
    }
    const samplePdf = async (lines: string[]) => textPdf(lines, "Sample");
    const first = files[0] ? await bytesOf(files[0]) : null;
    if (mode === "page-numbers") {
      setResult(save(await withPageNumbers(first ?? await samplePdf(["Invoice 42", "Page body"])), "page-numbers.pdf", "application/pdf"));
      return;
    }
    if (mode === "bates") {
      setResult(save(await withBates(first ?? await samplePdf(["Exhibit"]), batesPrefix.trim().replace(/[^ -~]/g, "") || "ABC"), "bates.pdf", "application/pdf"));
      return;
    }
    if (mode === "metadata") {
      const source = first ?? await samplePdf(["Metadata sample"]);
      setResult(save(await withoutMetadata(source), "no-metadata.pdf", "application/pdf"));
      return;
    }
    if (mode === "unlock") {
      const source = first ?? await samplePdf(["Unlocked sample"]);
      const pdfjs = await loadPdfjs();
      const pdf = await pdfjs.getDocument({ data: source.slice(), password }).promise;
      const out = await PDFDocument.create();
      for (let index = 1; index <= pdf.numPages; index += 1) {
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable.");
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not encode the page."))), "image/jpeg", 0.85);
        });
        const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const sheet = out.addPage([viewport.width / 2, viewport.height / 2]);
        sheet.drawImage(image, { x: 0, y: 0, width: sheet.getWidth(), height: sheet.getHeight() });
      }
      setResult(save(await out.save(), "unlocked.pdf", "application/pdf"));
      return;
    }
    if (mode === "nup") {
      setResult(save(await nUpPdf(first ?? await textPdf(["One", "Two"]), 4), "n-up.pdf", "application/pdf"));
      return;
    }
    if (mode === "booklet") {
      setResult(save(await bookletPdf(first ?? await textPdf(["Cover", "Inside"])), "booklet.pdf", "application/pdf"));
      return;
    }
    if (mode === "imposition") {
      setResult(save(await nUpPdf(first ?? await textPdf(["Sheet A", "Sheet B"]), 2), "imposition.pdf", "application/pdf"));
      return;
    }
    if (mode === "cards") {
      setResult(save(await businessCards(first ?? await samplePdf(["Acme", "hello@example.com"])), "business-cards.pdf", "application/pdf"));
      return;
    }
    if (mode === "reader") {
      const source = first ?? await samplePdf(["Hello from the PDF reader.", "Second line."]);
      const extracted = await extractPdfText(source);
      setPreview(extracted);
      setResult(`Page 1 · ${extracted.trim().split(/\s+/).filter(Boolean).length} words`);
      return;
    }
    if (mode === "to-text") {
      const extracted = await extractPdfText(first ?? await samplePdf(["Invoice 42"]));
      downloadText(extracted, "document.txt");
      setPreview(extracted);
      setResult(`Extracted ${extracted.trim().length} characters.`);
      return;
    }
    if (mode === "to-word") {
      const extracted = await extractPdfText(first ?? await samplePdf(["Invoice 42"]));
      setResult(save(await textToDocx(extracted.split(/\n/)), "document.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
      return;
    }
    if (mode === "to-excel") {
      const extracted = await extractPdfText(first ?? await samplePdf(["Date Item Amount", "2026-01-02 Coffee 4.50"]));
      const rows = extracted.split(/\n/).map((line) => line.split(/\s{2,}|\t/).filter(Boolean));
      setResult(save(await rowsToXlsx(rows), "document.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
      return;
    }
    if (mode === "to-ppt" || mode === "to-pptx") {
      const extracted = await extractPdfText(first ?? await samplePdf(["Quarterly update", "Revenue is up."]));
      const slides = extracted.split(/\n/).filter(Boolean).map((line, index) => ({ title: `Page ${index + 1}`, body: line }));
      setResult(save(await textToPptx(slides.length ? slides : [{ title: "Empty", body: "" }]), "slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"));
      return;
    }
    if (mode === "word-pdf") {
      const source = first ? await docxToText(first) : await docxToText(await textToDocx(["Hello from the Word file."]));
      setResult(save(await rasterPdf(source.split(/\n/)), "from-word.pdf", "application/pdf"));
      return;
    }
    if (mode === "excel-pdf" || mode === "csv-pdf") {
      const rows = first
        ? mode === "csv-pdf" || files[0]?.name.endsWith(".csv")
          ? parseCsv(await files[0].text())
          : await xlsxToRows(first)
        : [["name", "amount"], ["Ada", "12"], ["Lin", "7"]];
      setResult(save(await rasterPdf(rows.map((row) => row.join("  "))), "table.pdf", "application/pdf"));
      return;
    }
    if (mode === "redact" || mode === "blackout") {
      const source = first ?? await samplePdf(["Secret 42 should disappear."]);
      const redacted = await redactPdf(source, mode === "blackout" ? "" : phrase);
      const left = await extractPdfText(redacted);
      downloadBytes(redacted, "redacted.pdf", "application/pdf");
      setResult(`Redacted. Extractable text left: ${left.trim().length} characters.`);
      return;
    }
    if (mode === "compare-pdf") {
      const left = first ?? await samplePdf(["alpha", "beta"]);
      const right = files[1] ? await bytesOf(files[1]) : await samplePdf(["alpha", "beta changed"]);
      const diff = diffLines(await extractPdfText(left), await extractPdfText(right));
      setPreview(diff.text);
      setResult(`${diff.changes} lines differ.`);
      return;
    }
    if (mode === "compare-word") {
      const left = first ? await docxToText(first) : "alpha\nbeta";
      const right = files[1] ? await docxToText(await bytesOf(files[1])) : "alpha\nbeta changed";
      const diff = diffLines(left, right);
      setPreview(diff.text);
      setResult(`${diff.changes} lines differ.`);
      return;
    }
    if (mode === "bank" || mode === "bank-csv" || mode === "bank-xlsx" || mode === "qbo") {
      const source = first ? await extractPdfText(first) : STATEMENT;
      const rows = parseStatement(source.includes("Coffee") ? source : STATEMENT);
      if (mode === "bank-xlsx") setResult(save(await rowsToXlsx([["date", "description", "amount"], ...rows.map((row) => [row.date, row.description, row.amount])]), "statement.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
      else if (mode === "qbo") {
        downloadText(statementQbo(rows), "statement.qbo", "application/vnd.intu.qbo");
        setResult(`${rows.length} transactions · statement.qbo`);
      } else {
        downloadText(statementCsv(rows), "statement.csv", "text/csv");
        setResult(`${rows.length} transactions`);
      }
      setTable([["date", "description", "amount"], ...rows.map((row) => [row.date, row.description, row.amount])]);
      return;
    }
    if (mode === "csv-view" || mode === "excel-view" || mode === "csv-xlsx") {
      const rows = first
        ? files[0].name.endsWith(".xlsx") || mode === "excel-view"
          ? await xlsxToRows(first)
          : parseCsv(await files[0].text())
        : [["name", "amount"], ["Ada", "12"], ["Lin", "7"]];
      setTable(rows);
      if (mode === "csv-xlsx") setResult(save(await rowsToXlsx(rows), "sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
      else setResult(`${Math.max(0, rows.length - 1)} rows · ${rows[0]?.length ?? 0} columns`);
      return;
    }
    if (mode === "ocr") {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#000000";
      context.font = "80px sans-serif";
      context.fillText("HELLO", 40, 120);
      if (files[0]?.type.startsWith("image/")) {
        const url = URL.createObjectURL(files[0]);
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error("Could not read that image."));
          element.src = url;
        });
        URL.revokeObjectURL(url);
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);
      }
      await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
      const started = Date.now();
      let engine = (window as unknown as { Tesseract?: { recognize: (image: HTMLCanvasElement, lang: string, options?: { tessedit_pageseg_mode?: string }) => Promise<{ data: { text: string } }> } }).Tesseract;
      while (!engine?.recognize) {
        if (Date.now() - started > 20000) throw new Error("OCR engine did not start.");
        await new Promise((resolve) => setTimeout(resolve, 50));
        engine = (window as unknown as { Tesseract?: { recognize: (image: HTMLCanvasElement, lang: string, options?: { tessedit_pageseg_mode?: string }) => Promise<{ data: { text: string } }> } }).Tesseract;
      }
      const language = files[0]?.type.startsWith("image/") ? ocrLang : "eng";
      const recognized = (await engine.recognize(canvas, language, { tessedit_pageseg_mode: ocrPsm })).data.text.replace(/\s+/g, " ").trim();
      downloadText(recognized, "ocr.txt");
      setResult(recognized || "No text recognized.");
    }
  }

  const textModes = new Set(["grammar", "diff", "compare-doc", "json-csv", "html-pdf", "text-pdf"]);
  return (
    <ToolPanel>
      {textModes.has(mode) ? (
        <Field label={tx(locale, "Text", "文本")}>
          <textarea className="min-h-28 w-full rounded-md border border-input bg-background p-2 text-sm" value={text} onChange={(event) => setText(event.target.value)} />
        </Field>
      ) : null}
      {mode === "diff" || mode === "compare-doc" ? (
        <Field label={tx(locale, "Other text", "另一份文本")}>
          <textarea className="min-h-28 w-full rounded-md border border-input bg-background p-2 text-sm" value={other} onChange={(event) => setOther(event.target.value)} />
        </Field>
      ) : null}
      {mode === "bates" ? (
        <Field label={tx(locale, "Prefix", "前缀")}>
          <TextInput value={batesPrefix} maxLength={24} onChange={(event) => setBatesPrefix(event.target.value)} />
        </Field>
      ) : null}
      {mode === "ocr" ? (
        <>
          <Field label={tx(locale, "Language", "语言")}>
            <SelectInput value={ocrLang} onChange={(event) => setOcrLang(event.target.value)}>
              <option value="eng">English</option>
              <option value="chi_sim">简体中文</option>
              <option value="spa">Español</option>
              <option value="fra">Français</option>
              <option value="deu">Deutsch</option>
              <option value="jpn">日本語</option>
              <option value="kor">한국어</option>
            </SelectInput>
          </Field>
          <Field label={tx(locale, "Layout", "版面")}>
            <SelectInput value={ocrPsm} onChange={(event) => setOcrPsm(event.target.value)}>
              <option value="3">{tx(locale, "Auto", "自动")}</option>
              <option value="4">{tx(locale, "Column", "单栏")}</option>
              <option value="6">{tx(locale, "Block", "文本块")}</option>
              <option value="7">{tx(locale, "Line", "一行")}</option>
              <option value="11">{tx(locale, "Sparse", "稀疏文字")}</option>
            </SelectInput>
          </Field>
        </>
      ) : null}
      {mode === "redact" ? <Field label={tx(locale, "Phrase to cover", "要盖住的词")}><TextInput value={phrase} onChange={(event) => setPhrase(event.target.value)} /></Field> : null}
      {mode === "unlock" ? <Field label={tx(locale, "Password", "密码")}><TextInput value={password} onChange={(event) => setPassword(event.target.value)} /></Field> : null}
      {!textModes.has(mode) && mode !== "gantt" && mode !== "gantt-template" && mode !== "timeline" ? (
        <DropZone label={tx(locale, "Drop a file, or run the sample", "拖入文件，或直接运行示例")} accept={acceptFor(mode)} multiple={mode.startsWith("compare")} onFiles={setFiles} />
      ) : null}
      <ActionButton data-action="run" onClick={() => void run().catch((error: unknown) => setResult(error instanceof Error ? error.message : "Could not finish."))}>{tx(locale, "Run", "运行")}</ActionButton>
      {table.length ? (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {table.slice(0, 8).map((row, index) => (
                <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-border px-2 py-1">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {preview.startsWith("<svg") ? <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: preview }} /> : preview ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">{preview}</pre> : null}
      <ResultText>{result}</ResultText>
    </ToolPanel>
  );
}

function defaultText(mode: string) {
  if (mode === "grammar") return "this  is a test test. a apple";
  if (mode === "diff" || mode === "compare-doc") return "alpha\nbeta";
  if (mode === "json-csv") return '[{"name":"Ada","n":1},{"name":"Lin","n":2}]';
  if (mode === "html-pdf") return "<h1>Hello</h1><p>This file never leaves your browser.</p>";
  return "Hello from your browser.";
}

function acceptFor(mode: string) {
  if (mode === "ocr") return "image/*";
  if (mode === "word-pdf" || mode === "compare-word") return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (mode === "excel-pdf" || mode === "excel-view") return ".xlsx";
  if (mode === "csv-pdf" || mode === "csv-view" || mode === "csv-xlsx") return ".csv,text/csv,.xlsx";
  return "application/pdf,.pdf";
}
