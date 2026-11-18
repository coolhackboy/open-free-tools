import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import {
  ActionButton,
  DropZone,
  Field,
  SelectInput,
  TextInput,
  ToolPanel,
  canvasToBlob,
  downloadBlob,
  downloadBytes,
  downloadText,
  fileToImage,
  sampleCanvas,
  tx,
} from "@/tools/controls";
import { Area, Check, CopyButton, Output, Segmented } from "@/tools/workspaces/devShared";
import { createZip } from "@/tools/lib/zip";
import { faviconHtml, icoFromPngs, webManifest } from "@/tools/lib/ico";
import { byteSize, cleanSvg } from "@/tools/lib/svgClean";

type Props = { tool: FreeTool; locale: string };

function bytesLabel(size: number) {
  return size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;
}

/* Favicon ---------------------------------------------------------------- */

const FAVICON_FILES: [string, number][] = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["favicon-48x48.png", 48],
  ["apple-touch-icon.png", 180],
  ["android-chrome-192x192.png", 192],
  ["android-chrome-512x512.png", 512],
];

function drawSource(canvas: HTMLCanvasElement, size: number, source: CanvasImageSource | null, text: { value: string; color: string; background: string; round: boolean }) {
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, size, size);
  if (source) {
    const width = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width;
    const height = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height;
    const side = Math.min(width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
    return;
  }
  context.fillStyle = text.background;
  if (text.round) {
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    const radius = size * 0.18;
    context.beginPath();
    context.roundRect(0, 0, size, size, radius);
    context.fill();
  }
  context.fillStyle = text.color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const chars = [...text.value].slice(0, 2).join("");
  context.font = `700 ${Math.round(size * (chars.length > 1 ? 0.5 : 0.66))}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  context.fillText(chars, size / 2, size * 0.54);
}

function FaviconTool({ locale }: { locale: string }) {
  const [source, setSource] = useState<"image" | "text">("text");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [letters, setLetters] = useState("P");
  const [color, setColor] = useState("#151900");
  const [background, setBackground] = useState("#d4ff00");
  const [round, setRound] = useState(false);
  const [name, setName] = useState("My site");
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (preview.current) drawSource(preview.current, 128, source === "image" ? image : null, { value: letters || " ", color, background, round });
  }, [source, image, letters, color, background, round]);

  async function build() {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      const files: { name: string; data: Uint8Array }[] = [];
      const icoParts: { size: number; data: Uint8Array }[] = [];
      for (const [file, size] of FAVICON_FILES) {
        drawSource(canvas, size, source === "image" ? image : null, { value: letters || " ", color, background, round });
        const data = new Uint8Array(await (await canvasToBlob(canvas, "image/png")).arrayBuffer());
        files.push({ name: file, data });
        if (size <= 48) icoParts.push({ size, data });
      }
      files.push({ name: "favicon.ico", data: icoFromPngs(icoParts) });
      files.push({ name: "site.webmanifest", data: new TextEncoder().encode(webManifest(name, background)) });
      files.push({ name: "favicon-html.txt", data: new TextEncoder().encode(faviconHtml(name, background)) });
      downloadBytes(createZip(files), "favicon.zip", "application/zip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Segmented label={tx(locale, "Source", "来源")} value={source} options={[["text", tx(locale, "Letter or emoji", "文字或 Emoji")], ["image", tx(locale, "Image", "图片")]]} onChange={setSource} />
      {source === "image" ? (
        <DropZone label={tx(locale, "Drop a square logo (PNG, SVG or JPG)", "拖入方形 Logo（PNG、SVG 或 JPG）")} accept="image/*" onFiles={async (files) => files[0] && setImage(await fileToImage(files[0]))} />
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={tx(locale, "Letters or emoji (1–2)", "文字或 Emoji（1–2 个）")}><TextInput value={letters} onChange={(event) => setLetters(event.target.value)} /></Field>
          <Field label={tx(locale, "Text color", "文字颜色")}><input type="color" className="h-10 w-20 rounded-md border border-input" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
          <Field label={tx(locale, "Background", "背景")}><input type="color" className="h-10 w-20 rounded-md border border-input" value={background} onChange={(event) => setBackground(event.target.value)} /></Field>
          <Check label={tx(locale, "Circle", "圆形")} checked={round} onChange={setRound} />
        </div>
      )}
      <Field label={tx(locale, "Site name (for the manifest)", "网站名称（用于 manifest）")}><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <div className="flex flex-wrap items-end gap-4">
        <canvas ref={preview} width={128} height={128} className="h-32 w-32 rounded-md border border-border bg-[length:16px_16px] [background-image:linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] [background-position:0_0,8px_8px]" aria-label={tx(locale, "Favicon preview", "图标预览")} />
        <ActionButton type="button" data-action="run" disabled={busy || (source === "image" && !image)} onClick={() => void build()}>{tx(locale, "Download favicon package (.zip)", "下载图标包（.zip）")}</ActionButton>
      </div>
      <p className="text-sm text-muted-foreground">{tx(locale, "Includes favicon.ico (16/32/48), PNG icons 16–512 px, apple-touch-icon, site.webmanifest and the HTML tags to paste into <head>.", "包含 favicon.ico（16/32/48）、16–512 px PNG 图标、apple-touch-icon、site.webmanifest，以及要粘贴到 <head> 的 HTML 代码。")}</p>
      <Output label={tx(locale, "HTML for <head>", "放进 <head> 的 HTML")} value={faviconHtml(name, background)} locale={locale} rows={7} />
    </>
  );
}

/* Image to Base64 -------------------------------------------------------- */

function ImageBase64Tool({ locale }: { locale: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [format, setFormat] = useState<"uri" | "raw" | "css" | "html">("uri");

  async function take(next: File) {
    setFile(next);
    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result));
    reader.readAsDataURL(next);
  }

  const raw = dataUrl.replace(/^data:[^,]*,/, "");
  const output = format === "raw" ? raw : format === "css" ? `background-image: url("${dataUrl}");` : format === "html" ? `<img src="${dataUrl}" alt="">` : dataUrl;

  return (
    <>
      <DropZone label={tx(locale, "Drop an image (PNG, JPG, SVG, WebP, GIF)", "拖入图片（PNG、JPG、SVG、WebP、GIF）")} accept="image/*" onFiles={(files) => files[0] && void take(files[0])} />
      {file && dataUrl ? (
        <>
          <Segmented label={tx(locale, "Output", "输出")} value={format} options={[["uri", "Data URI"], ["raw", "Base64"], ["css", "CSS"], ["html", "HTML <img>"]]} onChange={setFormat} />
          <p className="text-sm text-muted-foreground">{tx(locale, `${file.type || "file"} · ${bytesLabel(file.size)} → ${bytesLabel(output.length)} of text (Base64 adds about 33%).`, `${file.type || "文件"} · ${bytesLabel(file.size)} → ${bytesLabel(output.length)} 文本（Base64 约增加 33%）。`)}</p>
          <Field label={tx(locale, "Result", "结果")}><Area readOnly value={output} rows={8} className="break-all" data-output /></Field>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={output} locale={locale} />
            <ActionButton type="button" tone="quiet" onClick={() => downloadText(output, "image-base64.txt")}>{tx(locale, "Download .txt", "下载 .txt")}</ActionButton>
          </div>
          {file.size > 100 * 1024 ? <p className="text-xs text-muted-foreground">{tx(locale, "Tip: inline images over ~10 KB usually load faster as normal files.", "提示：超过约 10 KB 的图片，作为普通文件加载通常更快。")}</p> : null}
        </>
      ) : null}
    </>
  );
}

/* SVG optimizer ---------------------------------------------------------- */

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="120.000000" height="120.000000" viewBox="0 0 120.000000 120.000000" inkscape:version="1.3">
  <metadata><rdf:RDF><cc:Work rdf:about=""/></rdf:RDF></metadata>
  <defs></defs>
  <g inkscape:label="Layer 1" inkscape:groupmode="layer">
    <circle cx="60.0000001" cy="60.0000001" r="48.123456789" fill="#d4ff00" stroke="#111111" stroke-width="6.000000"/>
    <path d="M 38.4567891,62.1234567 L 54.9876543,78.3456789 L 84.1111111,44.2222222" fill="none" stroke="#111111" stroke-width="8.000000"/>
  </g>
</svg>`;

function SvgTool({ locale }: { locale: string }) {
  const [input, setInput] = useState(SAMPLE_SVG);
  const [name, setName] = useState("optimized.svg");
  const [precision, setPrecision] = useState(2);
  const [comments, setComments] = useState(true);
  const [metadata, setMetadata] = useState(true);
  const [editor, setEditor] = useState(true);
  const [scripts, setScripts] = useState(true);
  const result = (() => {
    try {
      return { svg: cleanSvg(input, { precision, removeComments: comments, removeMetadata: metadata, removeEditorData: editor, removeScripts: scripts }) };
    } catch (reason) {
      return { error: reason instanceof Error ? reason.message : String(reason) };
    }
  })();
  const before = byteSize(input);
  const after = result.svg ? byteSize(result.svg) : 0;
  return (
    <>
      <Field label={tx(locale, "Open an SVG file", "打开 SVG 文件")}>
        <input type="file" accept=".svg,image/svg+xml" className="text-sm" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setInput(await file.text());
          setName(file.name.replace(/\.svg$/i, "") + ".min.svg");
        }} />
      </Field>
      <Field label={tx(locale, "Or paste SVG code", "或粘贴 SVG 代码")}><Area value={input} onChange={(event) => setInput(event.target.value)} rows={8} /></Field>
      <div className="flex flex-wrap items-end gap-4">
        <Field label={tx(locale, "Decimal places", "保留小数位")}>
          <SelectInput value={precision} onChange={(event) => setPrecision(Number(event.target.value))}>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectInput>
        </Field>
        <Check label={tx(locale, "Comments", "注释")} checked={comments} onChange={setComments} />
        <Check label={tx(locale, "Metadata", "元数据")} checked={metadata} onChange={setMetadata} />
        <Check label={tx(locale, "Editor data (Inkscape, Illustrator, Sketch, Figma)", "编辑器数据（Inkscape、Illustrator、Sketch、Figma）")} checked={editor} onChange={setEditor} />
        <Check label={tx(locale, "Scripts and event handlers", "脚本和事件属性")} checked={scripts} onChange={setScripts} />
      </div>
      {result.error ? <p role="alert" className="text-sm font-medium text-red-600">{result.error}</p> : null}
      {result.svg ? (
        <>
          <p className="text-base font-semibold" role="status" data-result>{bytesLabel(before)} → {bytesLabel(after)} ({before ? Math.round((1 - after / before) * 100) : 0}% {tx(locale, "smaller", "更小")})</p>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rendered through <img>, so any script left in the SVG cannot run. */}
            <img alt={tx(locale, "Optimized SVG preview", "优化后预览")} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`} className="max-h-64 w-full rounded-md border border-border bg-background object-contain p-3" />
            <Area readOnly value={result.svg} rows={10} data-output />
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={result.svg} locale={locale} />
            <ActionButton type="button" onClick={() => downloadText(result.svg!, name, "image/svg+xml")}>{tx(locale, "Download SVG", "下载 SVG")}</ActionButton>
          </div>
        </>
      ) : null}
    </>
  );
}

/* Meme ------------------------------------------------------------------- */

function wrapLines(context: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

function MemeTool({ locale }: { locale: string }) {
  const [image, setImage] = useState<CanvasImageSource | null>(null);
  const [top, setTop] = useState("WHEN THE TOOL IS FREE");
  const [bottom, setBottom] = useState("AND RUNS IN YOUR BROWSER");
  const [size, setSize] = useState(9);
  const [upper, setUpper] = useState(true);
  const [fill, setFill] = useState("#ffffff");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const target = canvas.current;
    if (!target || !image) return;
    const width = (image as HTMLImageElement).naturalWidth || (image as HTMLCanvasElement).width;
    const height = (image as HTMLImageElement).naturalHeight || (image as HTMLCanvasElement).height;
    const scale = Math.min(1, 1600 / Math.max(width, height));
    target.width = Math.round(width * scale);
    target.height = Math.round(height * scale);
    const context = target.getContext("2d")!;
    context.drawImage(image, 0, 0, target.width, target.height);
    const fontSize = Math.round((target.width * size) / 100);
    context.font = `900 ${fontSize}px Impact, "Anton", "Arial Black", sans-serif`;
    context.textAlign = "center";
    context.lineJoin = "round";
    context.fillStyle = fill;
    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(2, fontSize / 8);
    const paint = (text: string, fromTop: boolean) => {
      const lines = wrapLines(context, upper ? text.toUpperCase() : text, target.width * 0.92);
      const lineHeight = fontSize * 1.1;
      lines.forEach((line, index) => {
        const y = fromTop ? fontSize * 0.2 + lineHeight * (index + 1) - fontSize * 0.15 : target.height - fontSize * 0.35 - lineHeight * (lines.length - 1 - index);
        context.strokeText(line, target.width / 2, y);
        context.fillText(line, target.width / 2, y);
      });
    };
    if (top.trim()) paint(top, true);
    if (bottom.trim()) paint(bottom, false);
  }, [image, top, bottom, size, upper, fill]);

  return (
    <>
      <DropZone label={tx(locale, "Drop a picture for your meme", "拖入一张图片做表情包")} accept="image/*" onFiles={async (files) => files[0] && setImage(await fileToImage(files[0]))} />
      <ActionButton type="button" tone="quiet" onClick={() => setImage(sampleCanvas())}>{tx(locale, "Use a sample picture", "使用示例图片")}</ActionButton>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx(locale, "Top text", "顶部文字")}><TextInput value={top} onChange={(event) => setTop(event.target.value)} /></Field>
        <Field label={tx(locale, "Bottom text", "底部文字")}><TextInput value={bottom} onChange={(event) => setBottom(event.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Field label={tx(locale, "Text size", "文字大小")}><input type="range" min={4} max={16} value={size} onChange={(event) => setSize(Number(event.target.value))} /></Field>
        <Field label={tx(locale, "Text color", "文字颜色")}><input type="color" className="h-10 w-20 rounded-md border border-input" value={fill} onChange={(event) => setFill(event.target.value)} /></Field>
        <Check label={tx(locale, "ALL CAPS", "全部大写")} checked={upper} onChange={setUpper} />
      </div>
      {image ? (
        <>
          <canvas ref={canvas} className="max-h-[520px] w-full rounded-md border border-border object-contain" aria-label={tx(locale, "Meme preview", "表情包预览")} />
          <ActionButton type="button" data-action="run" onClick={async () => canvas.current && downloadBlob(await canvasToBlob(canvas.current, "image/png"), "meme.png")}>{tx(locale, "Download PNG", "下载 PNG")}</ActionButton>
        </>
      ) : null}
    </>
  );
}

export function WebAssetTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  return (
    <ToolPanel>
      {mode === "favicon" ? <FaviconTool locale={locale} /> : null}
      {mode === "base64-image" ? <ImageBase64Tool locale={locale} /> : null}
      {mode === "svg" ? <SvgTool locale={locale} /> : null}
      {mode === "meme" ? <MemeTool locale={locale} /> : null}
    </ToolPanel>
  );
}
