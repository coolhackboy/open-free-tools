import { useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { BEAD_PALETTE, nearestPalette, sampleGrid } from "@/tools/lib/pixels";
import {
  ActionButton,
  DropZone,
  Field,
  PreviewImage,
  SelectInput,
  TextInput,
  ToolPanel,
  canvasFromImage,
  canvasToBlob,
  downloadBlob,
  downloadText,
  downloadZip,
  fileToImage,
  imageDataOf,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

const STORE_SIZES = [
  { name: "iphone-6.7", width: 1290, height: 2796 },
  { name: "iphone-6.5", width: 1242, height: 2688 },
  { name: "ipad-12.9", width: 2048, height: 2732 },
  { name: "android-phone", width: 1080, height: 1920 },
  { name: "play-feature", width: 1024, height: 500 },
];

export function CollageTool({ tool, locale }: Props) {
  const layout = tool.preset.layout || toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<Blob | null>(null);
  const size = layout === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };

  async function render(next = files) {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f4f1ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const images = await Promise.all(next.slice(0, 9).map((file) => fileToImage(file)));
    const count = Math.max(1, images.length);
    const columns = layout === "heart" ? 1 : Math.ceil(Math.sqrt(count));
    const rows = layout === "heart" ? 1 : Math.ceil(count / columns);
    images.forEach((image, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellW = canvas.width / columns;
      const cellH = (canvas.height - (caption ? 120 : 0)) / rows;
      const scale = Math.max(cellW / image.width, cellH / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      context.drawImage(image, column * cellW + (cellW - dw) / 2, row * cellH + (cellH - dh) / 2, dw, dh);
    });
    if (layout === "heart") {
      context.globalCompositeOperation = "destination-in";
      context.beginPath();
      context.moveTo(canvas.width / 2, canvas.height * 0.86);
      context.bezierCurveTo(canvas.width * 0.05, canvas.height * 0.55, canvas.width * 0.1, canvas.height * 0.18, canvas.width / 2, canvas.height * 0.32);
      context.bezierCurveTo(canvas.width * 0.9, canvas.height * 0.18, canvas.width * 0.95, canvas.height * 0.55, canvas.width / 2, canvas.height * 0.86);
      context.fill();
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#f7d6df";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (caption) {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#111111";
      context.font = "700 48px sans-serif";
      context.textAlign = "center";
      context.fillText(caption, canvas.width / 2, canvas.height - 48);
    }
    setPreview(await canvasToBlob(canvas, "image/png"));
  }

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop two or more photos", "拖入两张或更多照片")} accept="image/*" multiple onFiles={(next) => { setFiles(next); void render(next); }} />
      <Field label={tx(locale, "Caption", "标题")}><TextInput value={caption} onChange={(event) => setCaption(event.target.value)} /></Field>
      <ActionButton type="button" onClick={() => void render()}>{tx(locale, "Update collage", "更新拼图")}</ActionButton>
      <PreviewImage blob={preview} alt="" />
      {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, "collage.png")}>{tx(locale, "Download", "下载")}</ActionButton> : null}
    </ToolPanel>
  );
}

export function LogoTool({ locale }: Props) {
  const [name, setName] = useState("Acme");
  const [tagline, setTagline] = useState("Make");
  const [color, setColor] = useState("#111111");
  const [accent, setAccent] = useState("#e85d4c");
  const [icon, setIcon] = useState("circle");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240">
    <rect width="640" height="240" fill="#ffffff"/>
    ${icon === "circle" ? `<circle cx="96" cy="120" r="48" fill="${accent}"/>` : icon === "square" ? `<rect x="52" y="72" width="88" height="96" rx="12" fill="${accent}"/>` : `<polygon points="96,64 132,160 60,160" fill="${accent}"/>`}
    <text x="180" y="126" font-family="Georgia, serif" font-size="72" fill="${color}">${name.replace(/[<>&]/g, "")}</text>
    <text x="184" y="168" font-family="sans-serif" font-size="22" fill="#666">${tagline.replace(/[<>&]/g, "")}</text>
  </svg>`;

  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Name", "名称")}><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label={tx(locale, "Tagline", "副标题")}><TextInput value={tagline} onChange={(event) => setTagline(event.target.value)} /></Field>
        <Field label={tx(locale, "Icon", "图标")}>
          <SelectInput value={icon} onChange={(event) => setIcon(event.target.value)}>
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
          </SelectInput>
        </Field>
        <Field label={tx(locale, "Ink", "文字色")}><TextInput type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
        <Field label={tx(locale, "Accent", "强调色")}><TextInput type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></Field>
      </div>
      <div className="rounded-md border border-border bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex flex-wrap gap-2">
        <ActionButton type="button" onClick={() => downloadText(svg, "logo.svg", "image/svg+xml")}>SVG</ActionButton>
        <ActionButton type="button" onClick={() => void rasterize(svg, 1024, 384, "logo.png")}>PNG</ActionButton>
        <ActionButton type="button" onClick={() => void rasterize(svg, 512, 512, "favicon-512.png", true)}>512</ActionButton>
        <ActionButton type="button" onClick={() => void rasterize(svg, 32, 32, "favicon-32.png", true)}>32</ActionButton>
        <ActionButton type="button" onClick={() => void rasterize(svg, 1200, 630, "social.png")}>{tx(locale, "Social", "社交图")}</ActionButton>
      </div>
    </ToolPanel>
  );
}

async function rasterize(svg: string, width: number, height: number, filename: string, square = false) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const image = await fileToImage(blob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  if (square) {
    const side = Math.min(width, height) * 0.8;
    context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side);
  } else {
    context.drawImage(image, 0, 0, width, height);
  }
  downloadBlob(await canvasToBlob(canvas, "image/png"), filename);
}

const PHOTO_SIZES = [
  { id: "passport", label: "US 2×2 in", mmW: 51, mmH: 51 },
  { id: "china", label: "China 33×48", mmW: 33, mmH: 48 },
  { id: "schengen", label: "Schengen 35×45", mmW: 35, mmH: 45 },
  { id: "visa", label: "Visa 50×50", mmW: 50, mmH: 50 },
];

export function PassportTool({ tool, locale }: Props) {
  const initial = tool.preset.variant === "visa" ? "visa" : "passport";
  const [preset, setPreset] = useState(initial);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [sheet, setSheet] = useState<Blob | null>(null);
  const spec = PHOTO_SIZES.find((item) => item.id === preset) ?? PHOTO_SIZES[0];

  return (
    <ToolPanel>
      <Field label={tx(locale, "Size", "尺寸")}>
        <SelectInput value={preset} onChange={(event) => setPreset(event.target.value)}>
          {PHOTO_SIZES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </SelectInput>
      </Field>
      <DropZone label={tx(locale, "Drop a portrait", "拖入人像")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const width = Math.round((spec.mmW / 25.4) * 300);
          const height = Math.round((spec.mmH / 25.4) * 300);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          const scale = Math.max(width / image.width, height / image.height);
          const dw = image.width * scale;
          const dh = image.height * scale;
          context.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
          context.strokeStyle = "rgba(0,0,0,0.35)";
          context.strokeRect(width * 0.28, height * 0.18, width * 0.44, height * 0.58);
          const photo = await canvasToBlob(canvas, "image/jpeg", 0.92);
          setPreview(photo);
          const print = document.createElement("canvas");
          print.width = 1800;
          print.height = 1200;
          const printContext = print.getContext("2d");
          if (!printContext) return;
          printContext.fillStyle = "#ffffff";
          printContext.fillRect(0, 0, print.width, print.height);
          for (let i = 0; i < 6; i += 1) {
            printContext.drawImage(canvas, 40 + (i % 3) * (width * 0.35 + 20), 40 + Math.floor(i / 3) * (height * 0.35 + 20), width * 0.35, height * 0.35);
          }
          setSheet(await canvasToBlob(print, "image/jpeg", 0.92));
        })();
      }} />
      <PreviewImage blob={preview} alt="" />
      <div className="flex gap-2">
        {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, "passport.jpg")}>{tx(locale, "Digital photo", "电子版")}</ActionButton> : null}
        {sheet ? <ActionButton type="button" onClick={() => downloadBlob(sheet, "passport-4x6.jpg")}>4×6</ActionButton> : null}
      </div>
    </ToolPanel>
  );
}

export function MockupTool({ locale }: Props) {
  const [frame, setFrame] = useState("phone");
  const [preview, setPreview] = useState<Blob | null>(null);
  return (
    <ToolPanel>
      <Field label={tx(locale, "Frame", "框")}>
        <SelectInput value={frame} onChange={(event) => setFrame(event.target.value)}>
          <option value="phone">Phone</option>
          <option value="laptop">Laptop</option>
          <option value="poster">Poster</option>
          <option value="box">Box</option>
          <option value="billboard">Billboard</option>
        </SelectInput>
      </Field>
      <DropZone label={tx(locale, "Drop a design", "拖入设计稿")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const canvas = document.createElement("canvas");
          canvas.width = 1400;
          canvas.height = 1000;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.fillStyle = "#ece7df";
          context.fillRect(0, 0, canvas.width, canvas.height);
          const drawScreen = (x: number, y: number, w: number, h: number, radius: number) => {
            context.save();
            context.beginPath();
            context.roundRect(x, y, w, h, radius);
            context.clip();
            context.drawImage(image, x, y, w, h);
            context.restore();
            context.strokeStyle = "#111";
            context.lineWidth = 16;
            context.beginPath();
            context.roundRect(x - 18, y - 18, w + 36, h + 36, radius + 12);
            context.stroke();
          };
          if (frame === "phone") drawScreen(470, 80, 460, 840, 36);
          if (frame === "laptop") {
            drawScreen(220, 120, 960, 600, 12);
            context.fillStyle = "#222";
            context.fillRect(180, 740, 1040, 24);
          }
          if (frame === "poster") drawScreen(430, 70, 540, 820, 0);
          if (frame === "box") drawScreen(360, 220, 680, 520, 8);
          if (frame === "billboard") drawScreen(120, 180, 1160, 520, 8);
          setPreview(await canvasToBlob(canvas, "image/png"));
        })();
      }} />
      <PreviewImage blob={preview} alt="" />
      {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, "mockup.png")}>{tx(locale, "Download", "下载")}</ActionButton> : null}
    </ToolPanel>
  );
}

export function ScreenshotTool({ locale }: Props) {
  const [headline, setHeadline] = useState("Your app, clearly");
  const [background, setBackground] = useState("#1f6feb");
  const [files, setFiles] = useState<ResultFile[]>([]);
  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Headline", "标题")}><TextInput value={headline} onChange={(event) => setHeadline(event.target.value)} /></Field>
        <Field label={tx(locale, "Background", "背景")}><TextInput type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></Field>
      </div>
      <DropZone label={tx(locale, "Drop an app screenshot", "拖入应用截图")} accept="image/*" onFiles={(picked) => {
        void (async () => {
          const image = await fileToImage(picked[0]);
          const outputs: ResultFile[] = [];
          for (const size of STORE_SIZES) {
            const canvas = document.createElement("canvas");
            canvas.width = size.width;
            canvas.height = size.height;
            const context = canvas.getContext("2d");
            if (!context) continue;
            context.fillStyle = background;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "#ffffff";
            context.font = `700 ${Math.round(canvas.width / 16)}px sans-serif`;
            context.textAlign = "center";
            context.fillText(headline, canvas.width / 2, canvas.height * 0.12);
            const frameW = canvas.width * 0.72;
            const frameH = canvas.height * 0.72;
            const x = (canvas.width - frameW) / 2;
            const y = canvas.height * 0.18;
            context.fillStyle = "#111";
            context.beginPath();
            context.roundRect(x, y, frameW, frameH, 28);
            context.fill();
            context.save();
            context.beginPath();
            context.roundRect(x + 12, y + 12, frameW - 24, frameH - 24, 18);
            context.clip();
            context.drawImage(image, x + 12, y + 12, frameW - 24, frameH - 24);
            context.restore();
            outputs.push({ name: `${size.name}.png`, blob: await canvasToBlob(canvas, "image/png") });
          }
          setFiles(outputs);
        })();
      }} />
      <PreviewImage blob={files[0]?.blob ?? null} alt="" />
      {files.length ? <ActionButton type="button" onClick={() => void downloadZip(files, "app-store-screenshots.zip")}>{tx(locale, "Download ZIP", "下载 ZIP")}</ActionButton> : null}
    </ToolPanel>
  );
}

type ResultFile = { name: string; blob: Blob };

export function StickerTool({ tool, locale }: Props) {
  const print = tool.preset.mode === "print";
  const [preview, setPreview] = useState<Blob | null>(null);
  const [svg, setSvg] = useState("");
  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop sticker artwork", "拖入贴纸图稿")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const pad = Math.round(Math.max(image.width, image.height) * 0.08);
          const canvas = document.createElement("canvas");
          canvas.width = image.width + pad * 2;
          canvas.height = image.height + pad * 2;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, pad, pad);
          context.strokeStyle = "#111111";
          context.lineWidth = Math.max(4, pad / 6);
          context.setLineDash([16, 10]);
          context.strokeRect(pad / 2, pad / 2, canvas.width - pad, canvas.height - pad);
          if (print) {
            context.setLineDash([]);
            for (const [x, y] of [[24, 24], [canvas.width - 24, 24], [24, canvas.height - 24], [canvas.width - 24, canvas.height - 24]]) {
              context.beginPath();
              context.arc(x, y, 10, 0, Math.PI * 2);
              context.fillStyle = "#111";
              context.fill();
            }
          }
          setPreview(await canvasToBlob(canvas, "image/png"));
          setSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}"><rect x="${pad / 2}" y="${pad / 2}" width="${canvas.width - pad}" height="${canvas.height - pad}" fill="none" stroke="#111" stroke-dasharray="16 10"/></svg>`);
        })();
      }} />
      <PreviewImage blob={preview} alt="" />
      <div className="flex gap-2">
        {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, "sticker.png")}>PNG</ActionButton> : null}
        {svg ? <ActionButton type="button" tone="quiet" onClick={() => downloadText(svg, "cut.svg", "image/svg+xml")}>SVG</ActionButton> : null}
      </div>
    </ToolPanel>
  );
}

export function PatternTool({ tool, locale }: Props) {
  const mode = tool.preset.mode || "perler";
  const [columns, setColumns] = useState(mode === "quilt" ? 12 : mode === "knit" ? 24 : 32);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [counts, setCounts] = useState<string[]>([]);
  return (
    <ToolPanel>
      <Field label={tx(locale, "Columns", "列数")}><TextInput type="number" min={8} max={80} value={columns} onChange={(event) => setColumns(Number(event.target.value))} /></Field>
      <DropZone label={tx(locale, "Drop a picture", "拖入图片")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const rows = Math.max(8, Math.round(columns * (image.height / image.width)));
          const source = canvasFromImage(image, image.width, image.height);
          const data = imageDataOf(source);
          const cells = sampleGrid(data.data, source.width, source.height, columns, rows);
          const usage = new Map<string, number>();
          const canvas = document.createElement("canvas");
          const cell = 18;
          canvas.width = columns * cell;
          canvas.height = rows * cell + 80;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          cells.forEach((pixel, index) => {
            const paletteIndex = nearestPalette(pixel, BEAD_PALETTE.map((item) => item.rgb));
            const color = BEAD_PALETTE[paletteIndex];
            usage.set(color.name, (usage.get(color.name) ?? 0) + 1);
            const x = (index % columns) * cell;
            const y = Math.floor(index / columns) * cell;
            context.fillStyle = `rgb(${color.rgb.join(",")})`;
            context.fillRect(x, y, cell, cell);
            context.strokeStyle = "rgba(0,0,0,0.15)";
            context.strokeRect(x, y, cell, cell);
            if (mode !== "pixel") {
              context.fillStyle = "#111";
              context.font = "10px sans-serif";
              context.fillText(String(paletteIndex + 1), x + 2, y + 12);
            }
          });
          setCounts([...usage.entries()].map(([name, count]) => `${name}: ${count}`));
          setPreview(await canvasToBlob(canvas, "image/png"));
        })();
      }} />
      <PreviewImage blob={preview} alt="" />
      <ul className="grid grid-cols-2 gap-1 text-sm">{counts.map((line) => <li key={line}>{line}</li>)}</ul>
      {preview ? <ActionButton type="button" onClick={() => downloadBlob(preview, `${mode}-chart.png`)}>{tx(locale, "Download chart", "下载图纸")}</ActionButton> : null}
    </ToolPanel>
  );
}
