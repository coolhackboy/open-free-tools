import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { createZip } from "@/tools/lib/zip";

export function tx(locale: string, en: string, zh: string) {
  return locale === "zh" ? zh : en;
}

export function ToolPanel({ children }: { children: ReactNode }) {
  return (
    <div data-workspace className="space-y-4 overflow-hidden rounded-xl border border-line bg-surface p-3.5 shadow-md sm:p-5">
      {children}
      <DownloadProgressSlot />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-sm">
      <span className="font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

const controlClass = "free-tool-control box-border h-10 min-h-10 border text-sm transition-colors";
const fieldClass = "w-full min-w-0 rounded-md border-line-strong bg-bg px-3 text-fg placeholder:text-fg-subtle hover:border-fg-subtle/60 focus:border-accent-ink focus:outline-none disabled:opacity-60";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[controlClass, fieldClass, props.className].filter(Boolean).join(" ")}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[controlClass, fieldClass, props.className].filter(Boolean).join(" ")}
    />
  );
}

export function ActionButton({
  children,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "quiet" }) {
  return (
    <button
      {...props}
      className={[
        controlClass,
        "inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary"
          ? "border-transparent bg-accent text-accent-fg hover:bg-accent-hover active:translate-y-px"
          : "border-line-strong bg-bg text-fg hover:bg-surface-2",
        props.className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

function formatByteSize(size: number) {
  if (!Number.isFinite(size) || size < 1024) return `${Math.max(0, Math.round(size))} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(file.name);
}

function ChosenFile({ file }: { file: File }) {
  const image = isImageFile(file);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, image]);
  const size = formatByteSize(file.size);
  if (image) {
    return (
      <figure data-chosen-file={file.name} data-file-size={size} className="flex w-full max-w-[280px] flex-col items-center gap-2">
        {url ? <img src={url} alt={file.name} className="checker max-h-48 w-full rounded-md border border-line object-contain" /> : null}
        <figcaption className="max-w-full text-sm leading-snug">
          <span className="block truncate font-medium">{file.name}</span>
          <span className="text-fg-subtle">{size}</span>
        </figcaption>
      </figure>
    );
  }
  return (
    <span data-chosen-file={file.name} data-file-size={size} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm">
      <span className="truncate font-medium">{file.name}</span>
      <span className="shrink-0 text-fg-subtle">{size}</span>
    </span>
  );
}

export function DropZone({
  label,
  accept,
  multiple = false,
  onFiles,
  files,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  files?: File[];
}) {
  const [picked, setPicked] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const shown = files ?? picked;

  function take(list: File[]) {
    const next = multiple ? list : list.slice(0, 1);
    if (!next.length) return;
    if (files === undefined) setPicked(next);
    onFiles(next);
  }

  return (
    <label
      data-drop-zone={shown.length ? "filled" : "empty"}
      className={[
        "group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:border-accent-ink sm:min-h-[260px]",
        over ? "border-accent-ink bg-accent-soft" : "border-line-strong bg-bg-subtle hover:border-fg-subtle/50 hover:bg-surface-2/60",
      ].join(" ")}
      onDragEnter={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(Array.from(event.dataTransfer.files));
      }}
    >
      {shown.length ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-4">
          {shown.map((file, index) => (
            <ChosenFile key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} />
          ))}
        </div>
      ) : (
        <>
          <span className="mb-4 grid size-12 place-items-center rounded-xl border border-line bg-surface text-fg-muted shadow-sm transition-transform group-hover:-translate-y-0.5" aria-hidden="true">
            <Upload className="size-5" />
          </span>
          <span className="text-base font-medium text-fg">{label}</span>
          <span className="mt-1.5 text-xs text-fg-subtle">{dropHint(accept)}</span>
        </>
      )}
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          take(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </label>
  );
}

const resultPanelClass = "free-tool-result animate-fade-in rounded-md border border-accent-line bg-accent-soft px-3.5 py-3 text-sm leading-relaxed text-fg break-words";

type DownloadDetail = { loaded: number; total: number; label: string };

const downloadListeners = new Set<(detail: DownloadDetail | null) => void>();

function publishDownload(detail: DownloadDetail | null) {
  downloadListeners.forEach((listener) => listener(detail));
}

export function clearModelDownload() {
  publishDownload(null);
}

export function showModelDownload(loaded: number, total: number, label: string) {
  publishDownload({ loaded, total, label });
}

export function reportModelProgress(event: { type: string; loaded?: number; total?: number }, label: string) {
  if (event.type === "download") {
    showModelDownload(event.loaded ?? 0, event.total ?? 0, label);
    return "";
  }
  clearModelDownload();
  return label;
}

function isDownloadLabel(text: string) {
  return /^(downloading|正在下载)/i.test(text.trim());
}

function isQuietStatus(text: string) {
  const value = text.trim();
  if (!value || isDownloadLabel(value)) return true;
  if (/[…]$/.test(value) && value.length < 80) return true;
  return /^(add a |add an |add both |brush over|sample ready|this browser has no|请先|示例已)/i.test(value);
}

function QuietStatus({ text }: { text: string }) {
  const busy = /…$/.test(text);
  return (
    <p className="flex items-center gap-2 text-sm text-fg-muted" role="status">
      {busy ? <LoaderCircle className="size-4 shrink-0 animate-spin text-accent-ink" aria-hidden="true" /> : null}
      {text}
    </p>
  );
}

function dropHint(accept: string) {
  const parts = accept.split(",").map((item) => item.trim()).filter(Boolean);
  const named = parts.map((item) => {
    if (item === "image/*") return "images";
    if (item === "video/*") return "video";
    if (item === "audio/*") return "audio";
    if (item === "application/pdf" || item === ".pdf") return "PDF";
    if (item.startsWith(".")) return item.slice(1).toUpperCase();
    return item.split("/").pop()?.toUpperCase() ?? item;
  });
  return [...new Set(named)].slice(0, 6).join(" · ");
}

export function DownloadProgressSlot() {
  const [detail, setDetail] = useState<DownloadDetail | null>(null);
  useEffect(() => {
    downloadListeners.add(setDetail);
    return () => {
      downloadListeners.delete(setDetail);
    };
  }, []);
  const active = detail !== null;
  const loaded = detail?.loaded ?? 0;
  const total = detail?.total ?? 0;
  const known = active && total > 0;
  return (
    <div data-download-progress className={active ? "space-y-1.5" : undefined} hidden={active ? undefined : true} role="status">
      {known ? (
        <progress className="free-tool-download-bar" value={loaded} max={total} aria-label={detail?.label} />
      ) : active ? (
        <progress className="free-tool-download-bar" aria-label={detail?.label} />
      ) : (
        <progress className="free-tool-download-bar" value={0} max={100} />
      )}
      {active && detail?.label ? <p className="text-sm text-fg-muted">{detail.label}</p> : null}
    </div>
  );
}

export function ResultPanel({ children }: { children: ReactNode }) {
  useEffect(() => {
    clearModelDownload();
  }, []);
  return (
    <div data-result className={resultPanelClass} role="status">
      {children}
    </div>
  );
}

export function ResultText({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? children.trim() : "";
  useEffect(() => {
    if (text && !isQuietStatus(text)) clearModelDownload();
  }, [text]);
  if (children == null || children === false || text === "" || isDownloadLabel(text)) return null;
  if (isQuietStatus(text)) return <QuietStatus text={text} />;
  return (
    <div data-result className={`${resultPanelClass} font-medium`} role="status">
      {children}
    </div>
  );
}

export function StatusLine({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? children.trim() : "";
  useEffect(() => {
    if (text && !isDownloadLabel(text)) clearModelDownload();
  }, [text]);
  if (!children || (typeof children === "string" && !text) || isDownloadLabel(text)) return null;
  if (typeof children === "string" && isQuietStatus(text)) return <QuietStatus text={text} />;
  return (
    <div data-result className={resultPanelClass} role="status">
      {children}
    </div>
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadText(text: string, filename: string, type = "text/plain") {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy.buffer as ArrayBuffer], { type }), filename);
}

export async function downloadZip(files: { name: string; blob: Blob }[], filename: string) {
  const entries = await Promise.all(
    files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.blob.arrayBuffer()) })),
  );
  downloadBytes(createZip(entries), filename, "application/zip");
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = src;
  });
}

export async function fileToImage(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasFromImage(image: CanvasImageSource, width: number, height: number, smooth = true) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.imageSmoothingEnabled = smooth;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Could not encode that image");
  return blob;
}

export function imageDataOf(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function putImageData(canvas: HTMLCanvasElement, data: ImageData) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.putImageData(data, 0, 0);
}

export function sampleCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#7eb6e8");
  sky.addColorStop(0.55, "#d7ecfb");
  sky.addColorStop(1, "#6f8f62");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f4efe4";
  context.beginPath();
  context.arc(700, 150, 70, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#2f5d50";
  context.fillRect(180, 360, 220, 180);
  context.fillStyle = "#d9b48f";
  context.beginPath();
  context.arc(290, 300, 54, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1d1a17";
  context.font = "bold 42px sans-serif";
  context.fillText("Sample image", 48, 92);
  return canvas;
}

export function PreviewImage({ blob, alt }: { blob: Blob | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  if (!url) return null;
  return <img src={url} alt={alt} className="checker max-h-[480px] w-full animate-fade-in rounded-md border border-line object-contain" />;
}

export function ResultList({
  files,
  locale,
}: {
  files: { name: string; blob: Blob }[];
  locale: string;
}) {
  if (!files.length) return null;
  return (
    <div className="space-y-3">
      <PreviewImage blob={files[0]?.blob ?? null} alt={files[0]?.name ?? ""} />
      <div className="flex flex-wrap gap-2">
        {files.slice(0, 12).map((file) => (
          <ActionButton key={file.name} type="button" tone="quiet" onClick={() => downloadBlob(file.blob, file.name)}>
            {file.name}
          </ActionButton>
        ))}
        {files.length > 1 ? (
          <ActionButton type="button" onClick={() => downloadZip(files, "open-free-tools.zip")}>
            {tx(locale, `Download all (${files.length})`, `全部下载（${files.length}）`)}
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}
