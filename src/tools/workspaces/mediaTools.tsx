import { useRef, useState } from "react";
import { GIFEncoder, applyPalette, quantize } from "gifenc/dist/gifenc.esm.js";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { UPSCALE_BYTES, formatModelBytes, runSpeech, runUpscale, type LocalModelEvent, type SpeechQuality, type UpscaleQuality } from "@/tools/lib/modelWorker";
import { clipSeconds, cuesToSrt, resampleLinear } from "@/tools/lib/speechText";
import {
  ActionButton,
  DropZone,
  Field,
  PreviewImage,
  SelectInput,
  StatusLine,
  TextInput,
  ToolPanel,
  canvasToBlob,
  downloadBlob,
  downloadText,
  fileToImage,
  reportModelProgress,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFfmpeg(onLog: (message: string) => void) {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => onLog(message));
      // ESM build: Vite bundles the FFmpeg worker as a module worker, which cannot importScripts() the UMD core.
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }
  const ffmpeg = await ffmpegPromise;
  ffmpeg.on("log", ({ message }) => onLog(message));
  return ffmpeg;
}

function modelProgress(locale: string, event: LocalModelEvent, infer: [string, string]) {
  if (event.type === "infer") return reportModelProgress(event, tx(locale, infer[0], infer[1]));
  const pct = event.total > 0 ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : 0;
  return reportModelProgress(event, tx(locale, `Downloading model ${pct}%`, `正在下载模型 ${pct}%`));
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return;
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      reject(new Error("Could not read that frame"));
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = time;
  });
}

async function upscaleClip(file: File, scale: 2 | 4, quality: UpscaleQuality, onEvent: (event: LocalModelEvent) => void) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read that video"));
    });
    const duration = Math.min(4, Number.isFinite(video.duration) ? video.duration : 4);
    const fps = 4;
    const count = Math.max(1, Math.min(12, Math.floor(duration * fps) || 1));
    const frames: Blob[] = [];
    for (let index = 0; index < count; index += 1) {
      const time = Math.min(Math.max(0, duration - 0.05), index / fps);
      await seekVideo(video, time);
      const edge = Math.max(video.videoWidth, video.videoHeight, 1);
      const fit = edge > 256 ? 256 / edge : 1;
      const width = Math.max(2, Math.round(video.videoWidth * fit / 2) * 2);
      const height = Math.max(2, Math.round(video.videoHeight * fit / 2) * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      const enlarged = await runUpscale(pixels.data, width, height, scale, onEvent, quality);
      const out = document.createElement("canvas");
      out.width = enlarged.width;
      out.height = enlarged.height;
      const copy = new Uint8ClampedArray(enlarged.rgba.length);
      copy.set(enlarged.rgba);
      out.getContext("2d")?.putImageData(new ImageData(copy, enlarged.width, enlarged.height), 0, 0);
      const blob = await canvasToBlob(out, "image/png");
      frames.push(blob);
    }
    const ffmpeg = await getFfmpeg(() => {});
    const { fetchFile } = await import("@ffmpeg/util");
    for (const [index, frame] of frames.entries()) {
      await ffmpeg.writeFile(`frame${String(index).padStart(3, "0")}.png`, await fetchFile(frame));
    }
    await ffmpeg.writeFile("audio_in", await fetchFile(file));
    const seconds = (count / fps).toFixed(3);
    const withAudio = ["-framerate", String(fps), "-i", "frame%03d.png", "-i", "audio_in", "-t", seconds, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest", "out.mp4"];
    const silent = ["-framerate", String(fps), "-i", "frame%03d.png", "-t", seconds, "-c:v", "libx264", "-pix_fmt", "yuv420p", "out.mp4"];
    try {
      await ffmpeg.exec(withAudio);
    } catch {
      await ffmpeg.exec(silent);
    }
    const data = await ffmpeg.readFile("out.mp4");
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new Blob([copy.buffer as ArrayBuffer], { type: "video/mp4" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FfmpegTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [format, setFormat] = useState(mode === "convert" ? "mp4" : "mp3");
  const [width, setWidth] = useState(1280);
  const [scale, setScale] = useState(2);
  const [upscaleQuality, setUpscaleQuality] = useState<UpscaleQuality>("fast");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);
  const [speed, setSpeed] = useState(1.5);
  const [fps, setFps] = useState(12);

  async function run() {
    if (!files.length) return;
    try {
      if (mode === "upscale") {
        setStatus(tx(locale, "Reading frames…", "正在读取画面…"));
        const clip = await upscaleClip(files[0], scale === 4 ? 4 : 2, upscaleQuality, (event) => setStatus(modelProgress(locale, event, ["Enlarging a frame…", "正在放大一帧…"])));
        setResult(clip);
        setStatus(tx(locale, "Ready to download. The first 4 seconds were enlarged at 4 frames per second.", "可以下载了。前 4 秒已按每秒 4 帧放大。"));
        return;
      }
      setStatus(tx(locale, "Loading the encoder…", "正在加载编码器…"));
      const ffmpeg = await getFfmpeg(setStatus);
      const { fetchFile } = await import("@ffmpeg/util");
      for (const [index, file] of files.entries()) {
        await ffmpeg.writeFile(`in${index}`, await fetchFile(file));
      }
      const evenWidth = Math.max(2, width - (width % 2));
      const videoOut = ["-c:v", "libx264", "-pix_fmt", "yuv420p"];
      let output = "out.mp4";
      let args = ["-i", "in0", ...videoOut, "out.mp4"];
      if (mode === "compress") args = ["-i", "in0", "-vf", `scale=${evenWidth}:-2`, "-crf", "30", ...videoOut, "out.mp4"];
      if (mode === "convert") {
        output = `out.${format}`;
        args = format === "webm"
          ? ["-i", "in0", "-vf", `scale=${evenWidth}:-2`, "-c:v", "libvpx", "-c:a", "libvorbis", output]
          : ["-i", "in0", "-vf", `scale=${evenWidth}:-2`, ...videoOut, output];
      }
      if (mode === "trim") args = ["-i", "in0", "-ss", String(start), "-to", String(end), ...videoOut, "out.mp4"];
      if (mode === "crop") args = ["-i", "in0", "-vf", "crop=trunc(iw*0.8/2)*2:trunc(ih*0.8/2)*2", ...videoOut, "out.mp4"];
      if (mode === "strip-audio") args = ["-i", "in0", "-an", ...videoOut, "out.mp4"];
      if (mode === "to-mp3") {
        output = format === "wav" ? "out.wav" : "out.mp3";
        args = ["-i", "in0", "-vn", output];
      }
      if (mode === "audio-convert") {
        output = `out.${format}`;
        args = ["-i", "in0", "-vn", output];
      }
      if (mode === "audio-trim") {
        output = format === "mp3" ? "out.mp3" : "out.wav";
        args = ["-i", "in0", "-ss", String(start), "-to", String(end), "-vn", output];
      }
      if (mode === "video-gif" || mode === "boomerang") {
        output = "out.gif";
        const gifWidth = Math.max(2, evenWidth);
        const filter = mode === "boomerang"
          ? `fps=${fps},scale=${gifWidth}:-2:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`
          : `fps=${fps},scale=${gifWidth}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
        args = ["-i", "in0", "-vf", filter, "out.gif"];
      }
      if (mode === "merge") {
        const count = files.length;
        const inputs = Array.from({ length: count }, (_, index) => ["-i", `in${index}`]).flat();
        const scaled = Array.from({ length: count }, (_, index) => `[${index}:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=12[v${index}]`).join(";");
        const concat = `${Array.from({ length: count }, (_, index) => `[v${index}]`).join("")}concat=n=${count}:v=1:a=0[v]`;
        args = [...inputs, "-filter_complex", `${scaled};${concat}`, "-map", "[v]", ...videoOut, "out.mp4"];
      }
      setStatus(tx(locale, "Encoding…", "编码中…"));
      if (mode === "speed") {
        const tempo = Math.max(0.5, Math.min(2, speed));
        const video = ["-i", "in0", "-an", "-filter:v", `setpts=${(1 / tempo).toFixed(3)}*PTS`, ...videoOut, "out.mp4"];
        const withAudio = ["-i", "in0", "-filter:v", `setpts=${(1 / tempo).toFixed(3)}*PTS`, "-filter:a", `atempo=${tempo}`, ...videoOut, "out.mp4"];
        try {
          await ffmpeg.exec(withAudio);
        } catch {
          await ffmpeg.exec(video);
        }
      } else {
        await ffmpeg.exec(args);
      }
      const data = await ffmpeg.readFile(output);
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const type = output.endsWith(".gif") ? "image/gif" : output.endsWith(".mp3") ? "audio/mpeg" : output.endsWith(".wav") ? "audio/wav" : "video/mp4";
      setResult(new Blob([copy.buffer as ArrayBuffer], { type }));
      setStatus(tx(locale, "Ready to download.", "可以下载了。"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The encoder failed");
    }
  }

  const outputName = mode === "video-gif" || mode === "boomerang" ? "out.gif" : mode === "to-mp3" || mode === "audio-convert" || mode === "audio-trim" ? `audio.${format}` : "output.mp4";

  return (
    <ToolPanel>
      <DropZone
        label={tx(locale, "Drop video or audio. The encoder runs in this browser after a one-time download.", "拖入视频或音频。编码器会先下载一次，然后在这个浏览器里运行。")}
        accept="video/*,audio/*,image/*"
        multiple={mode === "merge"}
        onFiles={setFiles}
      />
      <div className="flex flex-wrap gap-3">
        {mode === "compress" || mode === "convert" || mode === "video-gif" || mode === "boomerang" ? (
          <Field label={tx(locale, "Width", "宽度")}><TextInput type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></Field>
        ) : null}
        {mode === "upscale" ? (
          <>
            <Field label={tx(locale, "Scale", "倍数")}>
              <SelectInput value={String(scale)} onChange={(event) => setScale(Number(event.target.value))}>
                <option value="2">2×</option>
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
        {mode === "convert" || mode === "audio-convert" || mode === "to-mp3" || mode === "audio-trim" ? (
          <Field label={tx(locale, "Format", "格式")}>
            <SelectInput value={format} onChange={(event) => setFormat(event.target.value)}>
              {mode === "convert" ? <><option value="mp4">MP4</option><option value="webm">WebM</option></> : null}
              {mode !== "convert" ? <><option value="mp3">MP3</option><option value="wav">WAV</option><option value="m4a">M4A</option><option value="ogg">OGG</option></> : null}
            </SelectInput>
          </Field>
        ) : null}
        {mode === "trim" || mode === "audio-trim" ? (
          <>
            <Field label={tx(locale, "Start", "起点")}><TextInput type="number" value={start} onChange={(event) => setStart(Number(event.target.value))} /></Field>
            <Field label={tx(locale, "End", "终点")}><TextInput type="number" value={end} onChange={(event) => setEnd(Number(event.target.value))} /></Field>
          </>
        ) : null}
        {mode === "speed" ? <Field label={tx(locale, "Speed", "速度")}><TextInput type="number" step={0.1} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></Field> : null}
        {mode === "video-gif" || mode === "boomerang" ? <Field label="FPS"><TextInput type="number" value={fps} onChange={(event) => setFps(Number(event.target.value))} /></Field> : null}
        <ActionButton type="button" onClick={() => void run()} disabled={!files.length}>{tx(locale, "Run", "开始")}</ActionButton>
      </div>
      {mode === "upscale" ? (
        <p className="text-sm text-muted-foreground">
          {tx(
            locale,
            `Each frame uses the same ESRGAN model as the image upscaler (${formatModelBytes(UPSCALE_BYTES[upscaleQuality][scale === 4 ? 4 : 2])} at ${scale === 4 ? 4 : 2}×). Only the first 4 seconds are enlarged, at 4 frames per second and at most 12 frames. The soundtrack is kept. The video is not uploaded.`,
            `每一帧使用和图片放大相同的 ESRGAN 模型（${scale === 4 ? 4 : 2}× 约 ${formatModelBytes(UPSCALE_BYTES[upscaleQuality][scale === 4 ? 4 : 2])}）。只放大前 4 秒，每秒 4 帧，最多 12 帧。声音会保留。视频不会上传。`,
          )}
        </p>
      ) : null}
      <StatusLine>{status}</StatusLine>
      {result ? <ActionButton type="button" onClick={() => downloadBlob(result, outputName)}>{tx(locale, "Download", "下载")}</ActionButton> : null}
    </ToolPanel>
  );
}

const LUTS: { name: string; apply: (r: number, g: number, b: number) => [number, number, number] }[] = [
  { name: "Identity", apply: (r, g, b) => [r, g, b] },
  { name: "Warm", apply: (r, g, b) => [Math.min(1, r * 1.08), g, b * 0.92] },
  { name: "Cool", apply: (r, g, b) => [r * 0.92, g, Math.min(1, b * 1.1)] },
  { name: "Film", apply: (r, g, b) => [r * 0.95 + 0.03, g * 0.9 + 0.02, b * 0.85] },
  { name: "Teal", apply: (r, g, b) => [r * 0.9, Math.min(1, g * 1.05), Math.min(1, b * 1.08)] },
  { name: "Contrast", apply: (r, g, b) => [Math.min(1, Math.max(0, (r - 0.5) * 1.3 + 0.5)), Math.min(1, Math.max(0, (g - 0.5) * 1.3 + 0.5)), Math.min(1, Math.max(0, (b - 0.5) * 1.3 + 0.5))] },
  { name: "Fade", apply: (r, g, b) => [r * 0.85 + 0.08, g * 0.85 + 0.08, b * 0.85 + 0.08] },
  { name: "Mono", apply: (r, g, b) => { const y = r * 0.3 + g * 0.59 + b * 0.11; return [y, y, y]; } },
  { name: "Vintage", apply: (r, g, b) => [Math.min(1, r * 1.05 + 0.04), g * 0.9, b * 0.75] },
  { name: "Punch", apply: (r, g, b) => [Math.min(1, r * 1.15), Math.min(1, g * 1.05), Math.min(1, b * 1.05)] },
  { name: "Night", apply: (r, g, b) => [r * 0.7, g * 0.75, Math.min(1, b * 1.1)] },
  { name: "Rose", apply: (r, g, b) => [Math.min(1, r * 1.12), g * 0.92, b * 0.95] },
];

function cubeFile(apply: (r: number, g: number, b: number) => [number, number, number]) {
  const size = 17;
  const lines = [`LUT_3D_SIZE ${size}`];
  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) {
        const [nr, ng, nb] = apply(r / (size - 1), g / (size - 1), b / (size - 1));
        lines.push(`${nr.toFixed(6)} ${ng.toFixed(6)} ${nb.toFixed(6)}`);
      }
    }
  }
  return lines.join("\n");
}

export function LutTool({ locale }: Props) {
  const [name, setName] = useState(LUTS[0].name);
  const [preview, setPreview] = useState<Blob | null>(null);
  const look = LUTS.find((item) => item.name === name) ?? LUTS[0];
  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-2">
        {LUTS.map((item) => <ActionButton key={item.name} type="button" tone={item.name === name ? "primary" : "quiet"} onClick={() => setName(item.name)}>{item.name}</ActionButton>)}
      </div>
      <DropZone label={tx(locale, "Drop a still to preview", "拖入静帧预览")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.drawImage(image, 0, 0);
          const data = context.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < data.data.length; i += 4) {
            const [r, g, b] = look.apply(data.data[i] / 255, data.data[i + 1] / 255, data.data[i + 2] / 255);
            data.data[i] = r * 255;
            data.data[i + 1] = g * 255;
            data.data[i + 2] = b * 255;
          }
          context.putImageData(data, 0, 0);
          setPreview(await canvasToBlob(canvas, "image/png"));
        })();
      }} />
      <PreviewImage blob={preview} alt="" />
      <ActionButton type="button" onClick={() => downloadText(cubeFile(look.apply), `${look.name.toLowerCase()}.cube`, "text/plain")}>.cube</ActionButton>
    </ToolPanel>
  );
}

export function GifTool({ tool, locale }: Props) {
  const slideshow = tool.preset.mode === "slideshow";
  const [delay, setDelay] = useState(slideshow ? 80 : 20);
  const [caption, setCaption] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  return (
    <ToolPanel>
      <Field label={tx(locale, "Delay (cs)", "延迟（百分秒）")}><TextInput type="number" value={delay} onChange={(event) => setDelay(Number(event.target.value))} /></Field>
      <Field label={tx(locale, "Caption", "标题")}><TextInput value={caption} onChange={(event) => setCaption(event.target.value)} /></Field>
      <DropZone label={tx(locale, "Drop frames in order", "按顺序拖入帧")} accept="image/*" multiple onFiles={(files) => {
        void (async () => {
          setStatus(tx(locale, "Building GIF…", "正在生成 GIF…"));
          const gif = GIFEncoder();
          for (const file of files) {
            const image = await fileToImage(file);
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const context = canvas.getContext("2d");
            if (!context) continue;
            context.fillStyle = "#111";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            if (caption) {
              context.fillStyle = "#fff";
              context.font = "700 32px sans-serif";
              context.textAlign = "center";
              context.fillText(caption, canvas.width / 2, canvas.height - 28);
            }
            const data = context.getImageData(0, 0, canvas.width, canvas.height);
            const palette = quantize(data.data, 256);
            const index = applyPalette(data.data, palette);
            gif.writeFrame(index, canvas.width, canvas.height, { palette, delay });
          }
          gif.finish();
          const bytes = gif.bytes();
          const copy = new Uint8Array(bytes.byteLength);
          copy.set(bytes);
          setResult(new Blob([copy.buffer as ArrayBuffer], { type: "image/gif" }));
          setStatus("");
        })();
      }} />
      <StatusLine>{status}</StatusLine>
      {result ? <ActionButton type="button" onClick={() => downloadBlob(result, slideshow ? "slideshow.gif" : "animation.gif")}>GIF</ActionButton> : null}
    </ToolPanel>
  );
}

export function SubtitleTool({ locale }: Props) {
  const [script, setScript] = useState("");
  const [cues, setCues] = useState<{ start: number; end?: number; text: string }[]>([]);
  const [speechQuality, setSpeechQuality] = useState<SpeechQuality>("fast");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<File | null>(null);
  const [status, setStatus] = useState("");

  function srt() {
    return cues.map((cue, index) => {
      const next = cue.end && cue.end > cue.start ? cue.end : cues[index + 1]?.start ?? cue.start + 2;
      const stamp = (value: number) => new Date(value * 1000).toISOString().slice(11, 23).replace(".", ",");
      return `${index + 1}\n${stamp(cue.start)} --> ${stamp(next)}\n${cue.text}\n`;
    }).join("\n");
  }

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Optional video or audio", "可选的视频或音频")} accept="video/*,audio/*" onFiles={(files) => {
        fileRef.current = files[0];
        const video = videoRef.current;
        if (!video) return;
        video.src = URL.createObjectURL(files[0]);
      }} />
      <video ref={videoRef} controls className="max-h-72 w-full bg-black" />
      <textarea className="min-h-32 w-full rounded-md border border-input bg-background p-3 text-sm" value={script} onChange={(event) => setScript(event.target.value)} placeholder={tx(locale, "Type a line, then mark it", "输入一行，再打点")} />
      <div className="flex flex-wrap gap-2">
        <Field label={tx(locale, "Model", "模型")}>
          <SelectInput value={speechQuality} onChange={(event) => setSpeechQuality(event.target.value as SpeechQuality)}>
            <option value="fast">{tx(locale, "Fast · Whisper base", "快速 · Whisper base")}</option>
            <option value="accurate">{tx(locale, "Accurate · Whisper small", "精确 · Whisper small")}</option>
          </SelectInput>
        </Field>
        <ActionButton type="button" onClick={() => {
          void (async () => {
            const file = fileRef.current;
            if (!file) {
              setStatus(tx(locale, "Add an audio or video file first.", "请先放入音频或视频。"));
              return;
            }
            try {
              setStatus(tx(locale, "Reading audio…", "正在读取音频…"));
              const context = new AudioContext();
              const audio = await context.decodeAudioData(await file.arrayBuffer());
              const left = audio.getChannelData(0);
              const right = audio.numberOfChannels > 1 ? audio.getChannelData(1) : left;
              const mono = new Float32Array(left.length);
              for (let index = 0; index < left.length; index += 1) mono[index] = (left[index] + right[index]) / 2;
              const sampleRate = audio.sampleRate;
              await context.close();
              const clip = clipSeconds(mono, sampleRate, 30);
              const samples = resampleLinear(clip, sampleRate, 16000);
              const transcript = await runSpeech(samples, speechQuality, (event) => setStatus(modelProgress(locale, event, ["Transcribing…", "转写中…"])));
              const next = transcript.chunks.length
                ? transcript.chunks.map((chunk) => ({ start: chunk.start, end: chunk.end, text: chunk.text }))
                : [{ start: 0, end: Math.min(30, mono.length / sampleRate), text: transcript.text }];
              setCues(next.filter((cue) => cue.text));
              setScript(transcript.text);
              setStatus(tx(locale, "Transcribed the first 30 seconds in this browser.", "已在这个浏览器里转写前 30 秒。"));
            } catch (error) {
              const message = error instanceof Error ? error.message : "Transcription failed";
              setStatus(tx(locale, `Failed: ${message}`, `失败：${message}`));
            }
          })();
        }}>{tx(locale, "Transcribe file", "转写文件")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => {
          const Rec = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null } }).webkitSpeechRecognition;
          if (!Rec) {
            setStatus(tx(locale, "This browser has no speech recognizer. Type the words instead.", "这个浏览器没有语音识别，请直接输入。"));
            return;
          }
          const recognition = new Rec();
          recognition.lang = locale === "zh" ? "zh-CN" : "en-US";
          recognition.onresult = (event) => setScript((current) => `${current} ${event.results[0][0].transcript}`.trim());
          recognition.start();
        }}>{tx(locale, "Dictate", "口述")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => {
          const time = videoRef.current?.currentTime ?? cues.length * 2;
          if (!script.trim()) return;
          setCues((current) => [...current, { start: time, text: script.trim() }]);
          setScript("");
        }}>{tx(locale, "Mark cue", "标记字幕")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(cuesToSrt(cues.map((cue) => ({ start: cue.start, end: cue.end ?? cue.start + 2, text: cue.text }))) || srt() || script, "captions.srt", "text/plain")}>SRT</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(srt().replace(/,/g, "."), "captions.vtt", "text/vtt")}>VTT</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(cues.map((cue) => cue.text).join("\n") || script, "transcript.txt")}>TXT</ActionButton>
      </div>
      <p className="text-sm text-muted-foreground">
        {tx(
          locale,
          "Transcribe downloads Whisper in this browser and reads only the first 30 seconds. The file is not uploaded. Dictate still uses the browser speech recognizer, and microphone audio may be sent to the browser vendor.",
          "转写会在这个浏览器里下载 Whisper，只读取前 30 秒。文件不会上传。口述仍使用浏览器语音识别，麦克风音频可能会交给浏览器厂商。",
        )}
      </p>
      <StatusLine>{status}</StatusLine>
      <ol className="space-y-1 text-sm">{cues.map((cue, index) => <li key={`${cue.start}-${index}`}>{cue.start.toFixed(1)}s {cue.text}</li>)}</ol>
    </ToolPanel>
  );
}

export function ScreenTool({ locale }: Props) {
  const [status, setStatus] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  return (
    <ToolPanel>
      <p className="text-sm text-muted-foreground">{tx(locale, "Record a screen, window or tab. Add the microphone if you want narration.", "录制屏幕、窗口或标签页。需要旁白时加上麦克风。")}</p>
      <div className="flex gap-2">
        <ActionButton type="button" onClick={() => {
          void (async () => {
            try {
              const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
              const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
              const stream = new MediaStream([...display.getVideoTracks(), ...display.getAudioTracks(), ...(mic?.getAudioTracks() ?? [])]);
              chunks.current = [];
              const media = new MediaRecorder(stream);
              recorder.current = media;
              media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
              media.onstop = () => {
                downloadBlob(new Blob(chunks.current, { type: chunks.current[0]?.type || "video/webm" }), "screen.webm");
                stream.getTracks().forEach((track) => track.stop());
                setStatus(tx(locale, "Saved the recording.", "录制已保存。"));
              };
              media.start();
              setStatus(tx(locale, "Recording…", "录制中…"));
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Could not start the screen recorder");
            }
          })();
        }}>{tx(locale, "Start", "开始")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => recorder.current?.stop()}>{tx(locale, "Stop and download", "停止并下载")}</ActionButton>
      </div>
      <StatusLine>{status}</StatusLine>
    </ToolPanel>
  );
}

export function VoiceTool({ locale }: Props) {
  const [level, setLevel] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<AudioContext | null>(null);
  return (
    <ToolPanel>
      <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, level)}%` }} /></div>
      <div className="flex gap-2">
        <ActionButton type="button" onClick={() => {
          void (async () => {
            let stream: MediaStream;
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
              setLevel(0);
              return;
            }
            audio.current = new AudioContext();
            const analyser = audio.current.createAnalyser();
            audio.current.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.fftSize);
            const tick = () => {
              analyser.getByteTimeDomainData(data);
              const peak = data.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0);
              setLevel(peak);
              if (recorder.current?.state === "recording") requestAnimationFrame(tick);
            };
            chunks.current = [];
            const media = new MediaRecorder(stream);
            recorder.current = media;
            media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
            media.onstop = () => {
              downloadBlob(new Blob(chunks.current, { type: "audio/webm" }), "voice.webm");
              stream.getTracks().forEach((track) => track.stop());
            };
            media.start();
            tick();
          })();
        }}>{tx(locale, "Record", "录音")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => recorder.current?.stop()}>{tx(locale, "Stop", "停止")}</ActionButton>
      </div>
    </ToolPanel>
  );
}

export function GreenTool({ locale }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState("#00ff00");
  const [similarity, setSimilarity] = useState(80);
  const [preview, setPreview] = useState<Blob | null>(null);

  function colorAt() {
    const value = key.replace("#", "");
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }

  function keyFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const source = video && video.readyState >= 2 ? video : null;
    if (!source && !canvas.width) return;
    if (source) {
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
    }
    const context = canvas.getContext("2d");
    if (!context || !canvas.width) return;
    if (source) context.drawImage(source, 0, 0);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const [kr, kg, kb] = colorAt();
    for (let i = 0; i < frame.data.length; i += 4) {
      const distance = Math.abs(frame.data[i] - kr) + Math.abs(frame.data[i + 1] - kg) + Math.abs(frame.data[i + 2] - kb);
      if (distance < similarity) frame.data[i + 3] = 0;
    }
    context.putImageData(frame, 0, 0);
  }

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop a green-screen photo or video", "拖入绿幕照片或视频")} accept="image/*,video/*" onFiles={(files) => {
        if (files[0].type.startsWith("video")) {
          const video = videoRef.current;
          if (!video) return;
          video.src = URL.createObjectURL(files[0]);
          video.onloadeddata = () => keyFrame();
          return;
        }
        void fileToImage(files[0]).then((image) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d")?.drawImage(image, 0, 0);
          keyFrame();
        });
      }} />
      <video ref={videoRef} controls className="hidden" />
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Key color", "键控色")}><TextInput type="color" value={key} onChange={(event) => setKey(event.target.value)} /></Field>
        <Field label={tx(locale, "Similarity", "相似度")}><TextInput type="number" value={similarity} onChange={(event) => setSimilarity(Number(event.target.value))} /></Field>
        <ActionButton type="button" onClick={keyFrame}>{tx(locale, "Key this frame", "抠这一帧")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          void canvasToBlob(canvas, "image/png").then((blob) => { setPreview(blob); downloadBlob(blob, "keyed.png"); });
        }}>{tx(locale, "Download PNG", "下载 PNG")}</ActionButton>
      </div>
      <canvas ref={canvasRef} className="max-h-[480px] w-full bg-[linear-gradient(45deg,#ddd_25%,transparent_25%,transparent_75%,#ddd_75%),linear-gradient(45deg,#ddd_25%,transparent_25%,transparent_75%,#ddd_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] object-contain" />
      <PreviewImage blob={preview} alt="" />
    </ToolPanel>
  );
}

export function VideoEditorTool({ locale }: Props) {
  const [clips, setClips] = useState<File[]>([]);
  const [title, setTitle] = useState("Title");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  return (
    <ToolPanel>
      <Field label={tx(locale, "Opening title", "开场标题")}><TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <DropZone label={tx(locale, "Drop clips in order", "按顺序拖入片段")} accept="video/*" multiple onFiles={setClips} />
      <ol className="text-sm">{clips.map((clip) => <li key={clip.name}>{clip.name}</li>)}</ol>
      <ActionButton type="button" disabled={!clips.length} onClick={() => {
        void (async () => {
          setStatus(tx(locale, "Loading the encoder…", "正在加载编码器…"));
          const ffmpeg = await getFfmpeg(setStatus);
          const { fetchFile } = await import("@ffmpeg/util");
          const card = document.createElement("canvas");
          card.width = 640;
          card.height = 360;
          const context = card.getContext("2d");
          if (!context) return;
          context.fillStyle = "#111";
          context.fillRect(0, 0, card.width, card.height);
          context.fillStyle = "#fff";
          context.font = "700 48px sans-serif";
          context.textAlign = "center";
          context.fillText(title, 320, 190);
          const png = new Uint8Array(await (await canvasToBlob(card, "image/png")).arrayBuffer());
          await ffmpeg.writeFile("title.png", png);
          await ffmpeg.exec(["-loop", "1", "-i", "title.png", "-t", "1", "-vf", "scale=640:360", "-r", "12", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", "title.mp4"]);
          const names = ["title.mp4"];
          for (const [index, clip] of clips.entries()) {
            await ffmpeg.writeFile(`src${index}`, await fetchFile(clip));
            await ffmpeg.exec(["-i", `src${index}`, "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=12", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", `part${index}.mp4`]);
            names.push(`part${index}.mp4`);
          }
          const inputs = names.flatMap((name) => ["-i", name]);
          const filter = `${names.map((_, index) => `[${index}:v]`).join("")}concat=n=${names.length}:v=1:a=0[v]`;
          setStatus(tx(locale, "Joining clips…", "正在拼接…"));
          await ffmpeg.exec([...inputs, "-filter_complex", filter, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "edit.mp4"]);
          const data = await ffmpeg.readFile("edit.mp4");
          const bytes = data instanceof Uint8Array ? data : new Uint8Array();
          const copy = new Uint8Array(bytes.byteLength);
          copy.set(bytes);
          setResult(new Blob([copy.buffer as ArrayBuffer], { type: "video/mp4" }));
          setStatus(tx(locale, "Ready.", "完成。"));
        })().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Failed"));
      }}>{tx(locale, "Export", "导出")}</ActionButton>
      <StatusLine>{status}</StatusLine>
      {result ? <ActionButton type="button" onClick={() => downloadBlob(result, "edit.mp4")}>{tx(locale, "Download", "下载")}</ActionButton> : null}
    </ToolPanel>
  );
}
