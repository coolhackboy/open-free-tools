import { useMemo, useRef, useState } from "react";
import { GIFEncoder, applyPalette, quantize } from "gifenc/dist/gifenc.esm.js";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { readJpegExif, readPngText, stripJpegMetadata, stripPngMetadata, type ExifTag } from "@/tools/lib/exif";
import { UPSCALE_BYTES, formatModelBytes, runUpscale, type LocalModelEvent, type UpscaleQuality } from "@/tools/lib/modelWorker";
import {
  encodeBmp,
  enhancePixels,
  floydSteinberg,
  unsharp,
  vectorizeRgba,
} from "@/tools/lib/pixels";
import {
  ActionButton,
  DropZone,
  Field,
  PreviewImage,
  ResultList,
  SelectInput,
  StatusLine,
  TextInput,
  ToolPanel,
  reportModelProgress,
  canvasFromImage,
  canvasToBlob,
  downloadBlob,
  downloadText,
  fileToImage,
  imageDataOf,
  putImageData,
  sampleCanvas,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };
type ResultFile = { name: string; blob: Blob };

const LOOKS = [
  "Original", "Bright", "Contrast", "Mono", "Sepia", "Warm", "Cool", "Fade", "Vivid", "Matte",
  "Noir", "Chrome", "Invert", "Vintage", "Pastel", "Punch", "Soft", "Sharp", "Film", "Teal",
  "Emerald", "Rose", "Night", "Silver", "Golden", "Dust", "Low key", "High key", "Poster", "Comic", "Dream",
];

function applyChannel(value: number, look: string) {
  const v = value / 255;
  if (look === "Bright") return Math.min(255, value * 1.15);
  if (look === "Contrast") return Math.min(255, Math.max(0, (v - 0.5) * 1.35 + 0.5) * 255);
  if (look === "Fade") return value * 0.85 + 30;
  if (look === "High key") return value * 0.7 + 70;
  if (look === "Low key") return value * 0.75;
  return value;
}

function applyLook(data: Uint8ClampedArray, look: string) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (look === "Mono" || look === "Noir" || look === "Silver") {
      r = g = b = look === "Noir" ? gray * 0.85 : gray;
    } else if (look === "Sepia" || look === "Vintage" || look === "Golden") {
      r = gray * 1.07;
      g = gray * 0.84;
      b = gray * 0.58;
    } else if (look === "Warm" || look === "Rose") {
      r *= look === "Rose" ? 1.15 : 1.08;
      b *= 0.9;
    } else if (look === "Cool" || look === "Teal" || look === "Night") {
      r *= look === "Night" ? 0.7 : 0.92;
      b *= look === "Night" ? 1.2 : 1.12;
      g *= look === "Teal" ? 1.05 : 1;
    } else if (look === "Emerald") {
      g *= 1.15;
      r *= 0.9;
    } else if (look === "Invert") {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    } else if (look === "Chrome") {
      r = g = b = gray > 140 ? 230 : gray > 70 ? 120 : 30;
    } else if (look === "Poster") {
      r = Math.round(r / 64) * 64;
      g = Math.round(g / 64) * 64;
      b = Math.round(b / 64) * 64;
    } else if (look === "Pastel" || look === "Dream") {
      r = r * 0.75 + 60;
      g = g * 0.75 + 60;
      b = b * 0.75 + 70;
    } else if (look === "Dust") {
      r = r * 0.9 + 20;
      g = g * 0.88 + 16;
      b = b * 0.8 + 10;
    }
    data[i] = Math.max(0, Math.min(255, applyChannel(r, look)));
    data[i + 1] = Math.max(0, Math.min(255, applyChannel(g, look)));
    data[i + 2] = Math.max(0, Math.min(255, applyChannel(b, look)));
  }
}

async function readFileImage(file: Blob, maxEdge = 4096) {
  const image = await fileToImage(file);
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  return canvasFromImage(image, image.width * scale, image.height * scale);
}

function modelStatus(locale: string, event: LocalModelEvent) {
  if (event.type === "infer") return reportModelProgress(event, tx(locale, "Inferring…", "推理中…"));
  const pct = event.total > 0 ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : 0;
  return reportModelProgress(event, tx(locale, `Downloading model ${pct}%`, `正在下载模型 ${pct}%`));
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/bmp") return "bmp";
  return "jpg";
}

async function exportCanvas(canvas: HTMLCanvasElement, type: string, quality: number, name: string): Promise<ResultFile> {
  if (type === "image/bmp") {
    const data = imageDataOf(canvas);
    return { name, blob: new Blob([encodeBmp(data.data, canvas.width, canvas.height).buffer as ArrayBuffer], { type }) };
  }
  if (type === "image/gif") {
    const data = imageDataOf(canvas);
    const gif = GIFEncoder();
    const palette = quantize(data.data, 256);
    const index = applyPalette(data.data, palette);
    gif.writeFrame(index, canvas.width, canvas.height, { palette });
    gif.finish();
    return { name, blob: new Blob([gif.bytes().buffer as ArrayBuffer], { type: "image/gif" }) };
  }
  return { name, blob: await canvasToBlob(canvas, type, quality) };
}

export function ImageTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState(mode === "compress" ? "image/jpeg" : "image/png");
  const [quality, setQuality] = useState(0.82);
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const percent = 50;
  const [scale, setScale] = useState(2);
  const [upscaleQuality, setUpscaleQuality] = useState<UpscaleQuality>("fast");
  const [watermark, setWatermark] = useState("Acme");
  const [opacity, setOpacity] = useState(0.45);
  const [dpi, setDpi] = useState(300);
  const [sizeMm, setSizeMm] = useState(100);
  const [tags, setTags] = useState<ExifTag[]>([]);
  const [results, setResults] = useState<ResultFile[]>([]);
  const [status, setStatus] = useState("");

  async function run(nextFiles = files) {
    try {
      setStatus(tx(locale, "Working…", "处理中…"));
      const outputs: ResultFile[] = [];
      let lastSize = "";
      for (const file of nextFiles) {
        if (mode === "exif") {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const found = file.type === "image/png" ? readPngText(bytes) : readJpegExif(bytes);
          setTags(found);
          const stripped = file.type === "image/png" ? stripPngMetadata(bytes) : stripJpegMetadata(bytes);
          outputs.push({
            name: file.name.replace(/\.\w+$/, "") + "-clean" + (file.type === "image/png" ? ".png" : ".jpg"),
            blob: new Blob([stripped.buffer as ArrayBuffer], { type: file.type || "image/jpeg" }),
          });
          continue;
        }
        const base = await readFileImage(file, mode === "upscale" ? 2048 : 4096);
        let canvas = base;
        if (mode === "resize") canvas = canvasFromImage(base, width, height);
        if (mode === "percent") canvas = canvasFromImage(base, base.width * percent / 100, base.height * percent / 100);
        if (mode === "upscale") {
          const chosen = scale === 3 || scale === 4 ? scale : 2;
          const source = imageDataOf(base);
          const enlarged = await runUpscale(source.data, base.width, base.height, chosen, (event) => setStatus(modelStatus(locale, event)), upscaleQuality);
          canvas = document.createElement("canvas");
          canvas.width = enlarged.width;
          canvas.height = enlarged.height;
          const pixels = new Uint8ClampedArray(enlarged.width * enlarged.height * 4);
          pixels.set(enlarged.rgba);
          putImageData(canvas, new ImageData(pixels, enlarged.width, enlarged.height));
          lastSize = `${enlarged.width}×${enlarged.height}`;
        }
        if (mode === "dither" || mode === "laser") {
          const target = mode === "laser"
            ? canvasFromImage(base, Math.max(8, Math.round((sizeMm / 25.4) * dpi)), Math.max(8, Math.round((sizeMm / 25.4) * dpi * (base.height / base.width))))
            : base;
          canvas = target;
          const data = imageDataOf(canvas);
          floydSteinberg(data.data, canvas.width, canvas.height, mode === "laser" ? 2 : 2);
          putImageData(canvas, data);
        }
        if (mode === "compress" && format === "image/jpeg") {
          const longest = Math.max(canvas.width, canvas.height);
          const limit = quality < 0.6 ? 1600 : 2560;
          if (longest > limit) canvas = canvasFromImage(canvas, canvas.width * limit / longest, canvas.height * limit / longest);
        }
        if (mode === "watermark") {
          const context = canvas.getContext("2d");
          if (context) {
            context.save();
            context.globalAlpha = opacity;
            context.fillStyle = "#ffffff";
            context.strokeStyle = "#111111";
            context.lineWidth = 4;
            context.font = `700 ${Math.max(18, Math.round(canvas.width / 18))}px sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            const stepX = canvas.width / 3;
            const stepY = canvas.height / 3;
            for (let y = stepY / 2; y < canvas.height; y += stepY) {
              for (let x = stepX / 2; x < canvas.width; x += stepX) {
                context.strokeText(watermark, x, y);
                context.fillText(watermark, x, y);
              }
            }
            context.restore();
          }
        }
        const type = mode === "dither" || mode === "laser" || mode === "upscale" ? "image/png" : format;
        const stem = file.name.replace(/\.\w+$/, "");
        outputs.push(await exportCanvas(canvas, type, quality, `${stem}.${extensionFor(type)}`));
      }
      setResults(outputs);
      setStatus(mode === "upscale"
        ? tx(locale, `Ready. ${lastSize}.`, `完成。${lastSize}。`)
        : tx(locale, "Ready to download.", "可以下载了。"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      setStatus(mode === "upscale" ? tx(locale, `Failed: ${message}`, `失败：${message}`) : message);
    }
  }

  return (
    <ToolPanel>
      <DropZone
        label={tx(locale, "Drop images here, or choose files", "把图片拖到这里，或选择文件")}
        accept="image/*"
        multiple
        files={files}
        onFiles={(next) => {
          setFiles(next);
          void run(next);
        }}
      />
      <div className="flex flex-wrap gap-3">
        {mode === "convert" || mode === "compress" ? (
          <Field label={tx(locale, "Format", "格式")}>
            <SelectInput value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
              <option value="image/gif">GIF</option>
              <option value="image/bmp">BMP</option>
            </SelectInput>
          </Field>
        ) : null}
        {mode === "compress" || mode === "convert" ? (
          <Field label={tx(locale, "Quality", "质量")}>
            <TextInput type="number" min={0.3} max={1} step={0.01} value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
          </Field>
        ) : null}
        {mode === "resize" ? (
          <>
            <Field label={tx(locale, "Preset", "预设")}>
              <SelectInput value="" onChange={(event) => {
                const [w, h] = event.target.value.split("x").map(Number);
                if (w && h) { setWidth(w); setHeight(h); }
              }}>
                <option value="">{tx(locale, "Custom", "自定义")}</option>
                <option value="1080x1080">Instagram 1080</option>
                <option value="1080x1920">Story 1080×1920</option>
                <option value="1280x720">YouTube 1280×720</option>
                <option value="1920x1080">HD 1920×1080</option>
              </SelectInput>
            </Field>
            <Field label={tx(locale, "Width", "宽")}><TextInput type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></Field>
            <Field label={tx(locale, "Height", "高")}><TextInput type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></Field>
          </>
        ) : null}
        {mode === "upscale" ? (
          <>
            <Field label={tx(locale, "Scale", "倍数")}>
              <SelectInput value={String(scale)} onChange={(event) => setScale(Number(event.target.value))}>
                <option value="2">2×</option>
                <option value="3">3×</option>
                <option value="4">4×</option>
              </SelectInput>
            </Field>
            <Field label={tx(locale, "Quality", "质量")}>
              <SelectInput value={upscaleQuality} onChange={(event) => setUpscaleQuality(event.target.value as UpscaleQuality)}>
                <option value="fast">{tx(locale, "Fast", "快速")}</option>
                <option value="balanced">{tx(locale, "Balanced", "均衡")}</option>
                <option value="best">{tx(locale, "Best", "最佳")}</option>
              </SelectInput>
            </Field>
          </>
        ) : null}
        {mode === "watermark" ? (
          <>
            <Field label={tx(locale, "Text", "文字")}><TextInput value={watermark} onChange={(event) => setWatermark(event.target.value)} /></Field>
            <Field label={tx(locale, "Opacity", "不透明度")}><TextInput type="number" min={0.1} max={1} step={0.05} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></Field>
          </>
        ) : null}
        {mode === "laser" ? (
          <>
            <Field label={tx(locale, "Width mm", "宽度毫米")}><TextInput type="number" value={sizeMm} onChange={(event) => setSizeMm(Number(event.target.value))} /></Field>
            <Field label="DPI"><TextInput type="number" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></Field>
          </>
        ) : null}
        <ActionButton type="button" tone="quiet" onClick={() => {
          const canvas = sampleCanvas();
          canvas.toBlob((blob) => {
            if (!blob) return;
            const sample = new File([blob], "sample.png", { type: "image/png" });
            setFiles([sample]);
            void run([sample]);
          });
        }}>{tx(locale, "Use a sample", "用示例图")}</ActionButton>
        <ActionButton type="button" onClick={() => void run()} disabled={!files.length}>{tx(locale, "Run", "开始")}</ActionButton>
      </div>
      {tags.length ? (
        <ul className="space-y-1 text-sm">
          {tags.map((tag) => <li key={`${tag.label}-${tag.value}`}><strong>{tag.label}:</strong> {tag.value}</li>)}
        </ul>
      ) : null}
      {mode === "upscale" ? (
        <p className="text-sm text-muted-foreground">
          {tx(
            locale,
            `${upscaleQuality === "best" ? "ESRGAN-thick" : upscaleQuality === "balanced" ? "ESRGAN-medium" : "ESRGAN-slim"} ${scale === 3 || scale === 4 ? scale : 2}× is ${formatModelBytes(UPSCALE_BYTES[upscaleQuality][scale === 3 ? 3 : scale === 4 ? 4 : 2])}. WebGL is tried first, then WASM, then CPU. Patches are 64 px with 2 px of mirrored padding. It downloads in this browser when you run, and the picture is not uploaded. Edges longer than 512 px are reduced first.`,
            `${upscaleQuality === "best" ? "ESRGAN-thick" : upscaleQuality === "balanced" ? "ESRGAN-medium" : "ESRGAN-slim"} ${scale === 3 || scale === 4 ? scale : 2}× 约 ${formatModelBytes(UPSCALE_BYTES[upscaleQuality][scale === 3 ? 3 : scale === 4 ? 4 : 2])}。先试 WebGL，再试 WASM，最后用 CPU。分块是 64 像素，四周镜像补 2 像素。点运行后在这个浏览器里下载，图片不会上传。长边超过 512 像素时会先缩小。`,
          )}
        </p>
      ) : null}
      <StatusLine>{status}</StatusLine>
      <ResultList files={results} locale={locale} />
    </ToolPanel>
  );
}

export function VectorizerTool({ locale }: Props) {
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState("");
  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop an image to trace", "拖入要描摹的图片")} accept="image/*" onFiles={(files) => {
        void (async () => {
          setStatus(tx(locale, "Tracing…", "描摹中…"));
          const canvas = await readFileImage(files[0], 800);
          const data = imageDataOf(canvas);
          const traced = vectorizeRgba(data.data, canvas.width, canvas.height);
          setSvg(traced.svg);
          setStatus("");
        })();
      }} />
      <StatusLine>{status}</StatusLine>
      {svg ? <div className="max-h-[480px] overflow-auto rounded-md border border-border bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {svg ? <ActionButton type="button" onClick={() => downloadText(svg, "trace.svg", "image/svg+xml")}>{tx(locale, "Download SVG", "下载 SVG")}</ActionButton> : null}
    </ToolPanel>
  );
}

export function EditorTool({ locale }: Props) {
  const [look, setLook] = useState("Original");
  const [text, setText] = useState("");
  const [brightness, setBrightness] = useState(0);
  const [preview, setPreview] = useState<Blob | null>(null);
  const source = useRef<HTMLCanvasElement | null>(null);

  async function render(nextLook = look, nextText = text, nextBrightness = brightness) {
    const base = source.current;
    if (!base) return;
    const canvas = canvasFromImage(base, base.width, base.height);
    const data = imageDataOf(canvas);
    if (nextLook !== "Original") applyLook(data.data, nextLook);
    if (nextLook === "Sharp" || nextLook === "Comic") unsharp(data.data, canvas.width, canvas.height, 1);
    if (nextLook === "Vivid" || nextLook === "Punch") enhancePixels(data.data);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = Math.max(0, Math.min(255, data.data[i] + nextBrightness));
      data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + nextBrightness));
      data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + nextBrightness));
    }
    putImageData(canvas, data);
    const context = canvas.getContext("2d");
    if (context && nextText) {
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#111111";
      context.lineWidth = 6;
      context.font = `700 ${Math.round(canvas.width / 14)}px sans-serif`;
      context.textAlign = "center";
      context.strokeText(nextText, canvas.width / 2, canvas.height - 48);
      context.fillText(nextText, canvas.width / 2, canvas.height - 48);
    }
    setPreview(await canvasToBlob(canvas, "image/png"));
  }

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop a photo to edit", "拖入要编辑的照片")} accept="image/*" onFiles={(files) => {
        void (async () => {
          source.current = await readFileImage(files[0]);
          await render();
        })();
      }} />
      <div className="flex flex-wrap gap-2">
        {LOOKS.map((item) => (
          <ActionButton key={item} type="button" tone={item === look ? "primary" : "quiet"} onClick={() => { setLook(item); void render(item, text, brightness); }}>{item}</ActionButton>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Brightness", "亮度")}><TextInput type="number" value={brightness} onChange={(event) => { const value = Number(event.target.value); setBrightness(value); void render(look, text, value); }} /></Field>
        <Field label={tx(locale, "Text layer", "文字层")}><TextInput value={text} onChange={(event) => { setText(event.target.value); void render(look, event.target.value, brightness); }} /></Field>
      </div>
      <PreviewImage blob={preview} alt="" />
      {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, "edited.png")}>{tx(locale, "Download", "下载")}</ActionButton> : null}
    </ToolPanel>
  );
}

export function CropTool({ locale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState("free");
  const [circle, setCircle] = useState(false);
  const [box, setBox] = useState({ x: 40, y: 40, w: 200, h: 200 });

  function paint(next = box) {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(2, image.width / 300);
    context.strokeRect(next.x, next.y, next.w, next.h);
  }

  const ratios = useMemo(() => ({ free: 0, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9 }), []);

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop a photo to crop", "拖入要裁剪的照片")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await readFileImage(files[0]);
          imageRef.current = image;
          const next = { x: image.width * 0.1, y: image.height * 0.1, w: image.width * 0.8, h: image.height * 0.8 };
          setBox(next);
          paint(next);
        })();
      }} />
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Ratio", "比例")}>
          <SelectInput value={ratio} onChange={(event) => {
            const value = event.target.value;
            setRatio(value);
            const factor = ratios[value as keyof typeof ratios];
            if (!factor || !imageRef.current) return;
            const next = { ...box, h: box.w / factor };
            setBox(next);
            paint(next);
          }}>
            <option value="free">Free</option>
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
            <option value="3:2">3:2</option>
            <option value="16:9">16:9</option>
          </SelectInput>
        </Field>
        <Field label={tx(locale, "X", "X")}><TextInput type="number" value={Math.round(box.x)} onChange={(event) => { const next = { ...box, x: Number(event.target.value) }; setBox(next); paint(next); }} /></Field>
        <Field label={tx(locale, "Y", "Y")}><TextInput type="number" value={Math.round(box.y)} onChange={(event) => { const next = { ...box, y: Number(event.target.value) }; setBox(next); paint(next); }} /></Field>
        <Field label={tx(locale, "Width", "宽")}><TextInput type="number" value={Math.round(box.w)} onChange={(event) => { const next = { ...box, w: Number(event.target.value) }; setBox(next); paint(next); }} /></Field>
        <Field label={tx(locale, "Height", "高")}><TextInput type="number" value={Math.round(box.h)} onChange={(event) => { const next = { ...box, h: Number(event.target.value) }; setBox(next); paint(next); }} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={circle} onChange={(event) => setCircle(event.target.checked)} />{tx(locale, "Circle", "圆形")}</label>
      </div>
      <canvas ref={canvasRef} className="max-h-[480px] w-full object-contain" />
      <ActionButton type="button" onClick={() => {
        const image = imageRef.current;
        if (!image) return;
        const cropped = document.createElement("canvas");
        cropped.width = Math.max(1, Math.round(box.w));
        cropped.height = Math.max(1, Math.round(box.h));
        const context = cropped.getContext("2d");
        if (!context) return;
        context.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, cropped.width, cropped.height);
        if (circle) {
          context.globalCompositeOperation = "destination-in";
          context.beginPath();
          context.arc(cropped.width / 2, cropped.height / 2, Math.min(cropped.width, cropped.height) / 2, 0, Math.PI * 2);
          context.fill();
        }
        void canvasToBlob(cropped, circle ? "image/png" : "image/jpeg", 0.92).then((blob) => downloadBlob(blob, circle ? "crop.png" : "crop.jpg"));
      }}>{tx(locale, "Download crop", "下载裁剪")}</ActionButton>
    </ToolPanel>
  );
}
