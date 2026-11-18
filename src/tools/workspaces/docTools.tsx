import { useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { formatJson } from "@/tools/lib/jsonFormat";
import { stylesFor } from "@/tools/lib/fonts";
import {
  ActionButton,
  DropZone,
  Field,
  SelectInput,
  StatusLine,
  TextInput,
  ToolPanel,
  downloadBlob,
  downloadBytes,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjs;
}

export function PdfTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [text, setText] = useState(tx(locale, "Approved", "已确认"));
  const [pageNumber, setPageNumber] = useState(1);
  const [range, setRange] = useState("1-");
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  async function save(doc: PDFDocument, name: string) {
    const bytes = await doc.save();
    downloadBytes(bytes, name, "application/pdf");
    setStatus(tx(locale, "Downloaded.", "已下载。"));
  }

  async function run() {
    try {
      setStatus(tx(locale, "Working…", "处理中…"));
      if (mode === "merge") {
        const doc = await PDFDocument.create();
        for (const file of files) {
          const src = await PDFDocument.load(await file.arrayBuffer());
          const pages = await doc.copyPages(src, src.getPageIndices());
          pages.forEach((page) => doc.addPage(page));
        }
        await save(doc, "merged.pdf");
        return;
      }
      if (mode === "from-image") {
        const doc = await PDFDocument.create();
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const image = file.type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          const page = doc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        await save(doc, "images.pdf");
        return;
      }
      const source = files[0];
      if (!source) return;
      if (mode === "to-image") {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument({ data: await source.arrayBuffer() }).promise;
        const format = tool.preset.format === "png" ? "image/png" : "image/jpeg";
        for (let index = 1; index <= doc.numPages; index += 1) {
          const page = await doc.getPage(index);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, 0.9));
          if (blob) downloadBlob(blob, `page-${index}.${format === "image/png" ? "png" : "jpg"}`);
        }
        setStatus(tx(locale, "Pages downloaded.", "页面已下载。"));
        return;
      }
      if (mode === "compress") {
        const pdfjs = await loadPdfjs();
        const rendered = await pdfjs.getDocument({ data: await source.arrayBuffer() }).promise;
        const doc = await PDFDocument.create();
        for (let index = 1; index <= rendered.numPages; index += 1) {
          const page = await rendered.getPage(index);
          const viewport = page.getViewport({ scale: 1 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.62));
          if (!blob) continue;
          const image = await doc.embedJpg(await blob.arrayBuffer());
          const next = doc.addPage([viewport.width, viewport.height]);
          next.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
        }
        await save(doc, "compressed.pdf");
        return;
      }
      const doc = await PDFDocument.load(await source.arrayBuffer());
      if (mode === "rotate") {
        doc.getPages().forEach((page) => page.setRotation(degrees(((page.getRotation().angle ?? 0) + 90) % 360)));
        await save(doc, "rotated.pdf");
        return;
      }
      if (mode === "split") {
        const indexes = range === "1-"
          ? doc.getPageIndices()
          : range.split(",").flatMap((part) => {
              const [from, to] = part.split("-").map((value) => Number(value));
              if (!to) return [from - 1];
              return Array.from({ length: to - from + 1 }, (_, offset) => from - 1 + offset);
            });
        for (const index of indexes) {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(doc, [index]);
          single.addPage(page);
          const bytes = await single.save();
          downloadBytes(bytes, `page-${index + 1}.pdf`, "application/pdf");
        }
        setStatus(tx(locale, "Pages downloaded.", "页面已下载。"));
        return;
      }
      const page = doc.getPage(Math.max(0, Math.min(doc.getPageCount() - 1, pageNumber - 1)));
      const font = await doc.embedFont(StandardFonts.Helvetica);
      if (mode === "edit" || mode === "sign") {
        if (text) page.drawText(text, { x: 48, y: page.getHeight() - 72, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
        const signature = signatureRef.current;
        if (signature) {
          const png = await new Promise<Blob | null>((resolve) => signature.toBlob(resolve, "image/png"));
          if (png && png.size > 800) {
            const image = await doc.embedPng(await png.arrayBuffer());
            page.drawImage(image, { x: 48, y: 48, width: 180, height: 60 });
          }
        }
      }
      await save(doc, mode === "sign" ? "signed.pdf" : "edited.pdf");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not process that PDF");
    }
  }

  return (
    <ToolPanel>
      <DropZone
        label={mode === "from-image" ? tx(locale, "Drop images", "拖入图片") : tx(locale, "Drop PDFs", "拖入 PDF")}
        accept={mode === "from-image" ? tool.preset.accept || "image/*" : "application/pdf"}
        multiple={mode === "merge" || mode === "from-image"}
        onFiles={setFiles}
      />
      <div className="flex flex-wrap gap-3">
        {mode === "edit" || mode === "sign" ? <Field label={tx(locale, "Text", "文字")}><TextInput value={text} onChange={(event) => setText(event.target.value)} /></Field> : null}
        {mode === "edit" || mode === "sign" ? <Field label={tx(locale, "Page", "页码")}><TextInput type="number" min={1} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value))} /></Field> : null}
        {mode === "split" ? <Field label={tx(locale, "Pages", "页码")}><TextInput value={range} onChange={(event) => setRange(event.target.value)} /></Field> : null}
        <ActionButton type="button" onClick={() => void run()} disabled={!files.length}>{tx(locale, "Run", "开始")}</ActionButton>
      </div>
      {mode === "edit" || mode === "sign" ? (
        <canvas
          ref={signatureRef}
          width={360}
          height={120}
          className="w-full max-w-md rounded-md border border-input bg-white"
          onPointerDown={(event) => {
            drawing.current = true;
            const canvas = signatureRef.current;
            const context = canvas?.getContext("2d");
            if (!canvas || !context) return;
            const rect = canvas.getBoundingClientRect();
            context.beginPath();
            context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            const canvas = signatureRef.current;
            const context = canvas?.getContext("2d");
            if (!canvas || !context) return;
            const rect = canvas.getBoundingClientRect();
            context.lineTo(((event.clientX - rect.left) / rect.width) * canvas.width, ((event.clientY - rect.top) / rect.height) * canvas.height);
            context.stroke();
          }}
          onPointerUp={() => { drawing.current = false; }}
        />
      ) : null}
      <StatusLine>{status}</StatusLine>
      <p className="text-sm text-muted-foreground">{files.map((file) => file.name).join(", ")}</p>
    </ToolPanel>
  );
}

/** Escape the characters that are special in the Wi-Fi QR format: backslash ; , : and double quote. */
const BACKSLASH = String.fromCharCode(92);
const WIFI_SPECIAL = new Set([BACKSLASH, ";", ",", ":", '"']);
const wifiEscape = (value: string) => [...value].map((char) => (WIFI_SPECIAL.has(char) ? BACKSLASH + char : char)).join("");

export function QrTool({ locale }: Props) {
  const [kind, setKind] = useState("url");
  const [value, setValue] = useState("https://example.com");
  const [ssid, setSsid] = useState("Acme Guest");
  const [password, setPassword] = useState("secret");
  const [name, setName] = useState("Ada");
  const [color, setColor] = useState("#111111");
  const svgRef = useRef<SVGSVGElement>(null);
  const payload = kind === "wifi"
    ? `WIFI:T:WPA;S:${wifiEscape(ssid)};P:${wifiEscape(password)};;`
    : kind === "contact"
      ? ["BEGIN:VCARD", "VERSION:3.0", `FN:${name}`, "END:VCARD"].join(String.fromCharCode(10))
      : value;
  return (
    <ToolPanel>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-4">
          <Field label={tx(locale, "Type", "类型")}>
            <SelectInput value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="url">URL</option>
              <option value="wifi">Wi-Fi</option>
              <option value="contact">{tx(locale, "Contact", "联系人")}</option>
              <option value="text">{tx(locale, "Text", "文本")}</option>
            </SelectInput>
          </Field>
          {kind === "wifi" ? (
            <div className="flex flex-wrap gap-3">
              <Field label={tx(locale, "Network name (SSID)", "网络名称（SSID）")}><TextInput value={ssid} onChange={(event) => setSsid(event.target.value)} /></Field>
              <Field label={tx(locale, "Password", "密码")}><TextInput value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            </div>
          ) : null}
          {kind === "contact" ? <Field label={tx(locale, "Name", "姓名")}><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field> : null}
          {kind === "url" || kind === "text" ? <Field label={tx(locale, "Content", "内容")}><TextInput value={value} onChange={(event) => setValue(event.target.value)} /></Field> : null}
          <Field label={tx(locale, "Color", "颜色")}><TextInput type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border border-line bg-white p-2 shadow-sm">
            <QRCodeCanvas id="oft-qr" value={payload} size={240} fgColor={color} includeMargin={false} marginSize={2} aria-label={tx(locale, "QR code preview", "二维码预览")} />
          </div>
          <QRCodeSVG ref={svgRef} value={payload} size={240} fgColor={color} marginSize={2} className="hidden" aria-hidden="true" />
          <div className="flex gap-2">
            <ActionButton type="button" onClick={() => {
              const canvas = document.getElementById("oft-qr") as HTMLCanvasElement | null;
              canvas?.toBlob((blob) => { if (blob) downloadBlob(blob, "qr.png"); });
            }}>PNG</ActionButton>
            <ActionButton type="button" tone="quiet" onClick={() => {
              const svg = svgRef.current;
              if (!svg) return;
              const markup = new XMLSerializer().serializeToString(svg).replace(' class="hidden"', "").replace(' aria-hidden="true"', "");
              downloadBlob(new Blob([markup], { type: "image/svg+xml" }), "qr.svg");
            }}>SVG</ActionButton>
          </div>
        </div>
      </div>
    </ToolPanel>
  );
}

const WORDS = "river amber cedar maple orbit linen cedar quiet north silver paper lantern meadow cedar comet harbor violet cedar".split(" ");
const MORE_WORDS = ["anchor", "bridge", "cinder", "delta", "ember", "falcon", "garden", "harbor", "ivory", "juniper", "kettle", "lantern", "marble", "nectar", "olive", "pebble", "quartz", "ripple", "saffron", "timber", "umber", "velvet", "willow", "yarrow"];

export function PasswordTool({ locale }: Props) {
  const [length, setLength] = useState(16);
  const [symbols, setSymbols] = useState(true);
  const [passphrase, setPassphrase] = useState(false);
  const [value, setValue] = useState("");
  function generate() {
    if (passphrase) {
      const bank = [...new Set([...WORDS, ...MORE_WORDS])];
      const bytes = new Uint32Array(4);
      crypto.getRandomValues(bytes);
      setValue(Array.from(bytes, (item) => bank[item % bank.length]).join("-"));
      return;
    }
    const alphabet = `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789${symbols ? "!@#$%&*?" : ""}`;
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    setValue(Array.from(bytes, (item) => alphabet[item % alphabet.length]).join(""));
  }
  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Length", "长度")}><TextInput type="number" min={8} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={symbols} onChange={(event) => setSymbols(event.target.checked)} />{tx(locale, "Symbols", "符号")}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={passphrase} onChange={(event) => setPassphrase(event.target.checked)} />{tx(locale, "Passphrase", "口令词")}</label>
      </div>
      <ActionButton type="button" onClick={generate}>{tx(locale, "Generate", "生成")}</ActionButton>
      {value ? <p className="break-all rounded-md border border-border bg-muted p-3 font-mono text-sm">{value}</p> : <p className="text-sm text-muted-foreground">{tx(locale, "Nothing is stored. Generate when you are ready to copy.", "不会保存。准备复制时再生成。")}</p>}
      {value ? <ActionButton type="button" tone="quiet" onClick={() => void navigator.clipboard.writeText(value)}>{tx(locale, "Copy", "复制")}</ActionButton> : null}
    </ToolPanel>
  );
}

export function FontTool({ tool, locale }: Props) {
  const [text, setText] = useState("Acme");
  const styles = stylesFor(tool.preset.group || "all");
  return (
    <ToolPanel>
      <Field label={tx(locale, "Text", "文字")}><TextInput value={text} onChange={(event) => setText(event.target.value)} /></Field>
      <ul className="space-y-2">
        {styles.map((style) => {
          const output = style.apply(text);
          return (
            <li key={style.id}>
              <button type="button" className="w-full rounded-md border border-border px-3 py-2 text-left" onClick={() => void navigator.clipboard.writeText(output)}>
                <span className="block text-xs text-muted-foreground">{locale === "zh" ? style.labelZh : style.label}</span>
                <span className="text-xl">{output}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </ToolPanel>
  );
}

export function WordTool({ locale }: Props) {
  const [text, setText] = useState("");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.split(/[.!?。！？]+/).filter((part) => part.trim()).length;
  const minutes = Math.max(1, Math.round(words / 200)) || 0;
  const limits = [
    ["X", 280],
    ["Instagram", 2200],
    [tx(locale, "Meta description", "摘要"), 160],
  ] as const;
  return (
    <ToolPanel>
      <textarea className="min-h-48 w-full rounded-md border border-input bg-background p-3 text-sm" value={text} onChange={(event) => setText(event.target.value)} />
      <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div><dt>{tx(locale, "Words", "词")}</dt><dd className="text-xl font-semibold">{words}</dd></div>
        <div><dt>{tx(locale, "Characters", "字符")}</dt><dd className="text-xl font-semibold">{text.length}</dd></div>
        <div><dt>{tx(locale, "Sentences", "句子")}</dt><dd className="text-xl font-semibold">{sentences}</dd></div>
        <div><dt>{tx(locale, "Reading", "阅读")}</dt><dd className="text-xl font-semibold">{text.trim() ? minutes : 0}m</dd></div>
      </dl>
      <ul className="text-sm">
        {limits.map(([label, limit]) => <li key={label}>{label}: {text.length}/{limit}</li>)}
      </ul>
    </ToolPanel>
  );
}

export function JsonTool({ locale }: Props) {
  const [text, setText] = useState('{\n  "name": "Acme",\n  "id": 9007199254740993\n}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  function run(options: { minify?: boolean; sort?: boolean }) {
    const result = formatJson(text, options);
    if (!result.ok) {
      setError(`${result.message} (${result.line}:${result.column})`);
      setOutput("");
      return;
    }
    setError("");
    setOutput(result.text);
  }
  return (
    <ToolPanel>
      <textarea className="min-h-40 w-full rounded-md border border-input bg-background p-3 font-mono text-sm" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        <ActionButton type="button" onClick={() => run({})}>{tx(locale, "Beautify", "美化")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => run({ minify: true })}>{tx(locale, "Minify", "压缩")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => run({ sort: true })}>{tx(locale, "Sort keys", "键排序")}</ActionButton>
        {output ? <ActionButton type="button" tone="quiet" onClick={() => void navigator.clipboard.writeText(output)}>{tx(locale, "Copy", "复制")}</ActionButton> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {output ? <pre className="overflow-auto rounded-md bg-muted p-3 text-sm">{output}</pre> : null}
    </ToolPanel>
  );
}
