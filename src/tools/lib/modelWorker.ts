/**
 * Clients for the two model workers in public/workers. Both run fully in the browser:
 * - upscale-worker.js: ESRGAN (UpscalerJS, MIT) on TensorFlow.js, fetched from jsDelivr.
 * - speech-worker.mjs: Whisper (Xenova ports of OpenAI Whisper, MIT) on transformers.js.
 */

export type LocalModelEvent =
  | { type: "download"; loaded: number; total: number }
  | { type: "infer" };

export type UpscaleQuality = "fast" | "balanced" | "best";

/** Download size shown on the page: model description plus weight bytes. */
export const UPSCALE_BYTES: Record<UpscaleQuality, { 2: number; 3: number; 4: number }> = {
  fast: { 2: 900636, 3: 919596, 4: 946140 },
  balanced: { 2: 2802991, 3: 2821951, 4: 2848495 },
  best: { 2: 29153870, 3: 29188490, 4: 29236958 },
};

export function formatModelBytes(bytes: number) {
  const megabytes = bytes / 1000000;
  return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
}

const workerUrl = (file: string) => `${import.meta.env.BASE_URL}workers/${file}`;

let upscaleWorker: Worker | null = null;
let speechWorker: Worker | null = null;
let jobId = 0;

type UpscaleMessage =
  | { type: "download"; id: number; loaded: number; total: number }
  | { type: "infer"; id: number }
  | { type: "result"; id: number; rgba: Uint8ClampedArray; width: number; height: number }
  | { type: "error"; id: number; message: string };

export function runUpscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
  onEvent: (event: LocalModelEvent) => void,
  quality: UpscaleQuality = "fast",
) {
  if (!upscaleWorker) upscaleWorker = new Worker(workerUrl("upscale-worker.js"));
  const current = upscaleWorker;
  const id = ++jobId;
  return new Promise<{ rgba: Uint8ClampedArray; width: number; height: number }>((resolve, reject) => {
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const onMessage = (event: MessageEvent<UpscaleMessage>) => {
      const message = event.data;
      if (!message || message.id !== id) return;
      if (message.type === "download") onEvent({ type: "download", loaded: message.loaded, total: message.total });
      else if (message.type === "infer") onEvent({ type: "infer" });
      else if (message.type === "result") {
        cleanup();
        resolve({ rgba: message.rgba, width: message.width, height: message.height });
      } else if (message.type === "error") fail(message.message || "Upscale failed");
    };
    const onError = () => {
      if (upscaleWorker === current) upscaleWorker = null;
      fail("The upscaler worker failed to start");
    };
    function cleanup() {
      current.removeEventListener("message", onMessage);
      current.removeEventListener("error", onError);
    }
    current.addEventListener("message", onMessage);
    current.addEventListener("error", onError);
    current.postMessage({ type: "upscale", id, rgba, width, height, scale, quality }, [rgba.buffer]);
  });
}

export type SpeechQuality = "fast" | "accurate";

export type SpeechCue = { start: number; end: number; text: string };

type SpeechMessage =
  | { type: "download"; id: number; loaded: number; total: number }
  | { type: "infer"; id: number }
  | { type: "result"; id: number; text: string; chunks: SpeechCue[] }
  | { type: "error"; id: number; message: string };

export function runSpeech(
  audio: Float32Array,
  quality: SpeechQuality,
  onEvent: (event: LocalModelEvent) => void,
  returnTimestamps = true,
) {
  if (!speechWorker) speechWorker = new Worker(workerUrl("speech-worker.mjs"), { type: "module" });
  const current = speechWorker;
  const id = ++jobId;
  return new Promise<{ text: string; chunks: SpeechCue[] }>((resolve, reject) => {
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const onMessage = (event: MessageEvent<SpeechMessage>) => {
      const message = event.data;
      if (!message || message.id !== id) return;
      if (message.type === "download") onEvent({ type: "download", loaded: message.loaded, total: message.total });
      else if (message.type === "infer") onEvent({ type: "infer" });
      else if (message.type === "result") {
        cleanup();
        resolve({ text: message.text, chunks: message.chunks || [] });
      } else if (message.type === "error") fail(message.message || "Transcription failed");
    };
    const onError = () => {
      if (speechWorker === current) speechWorker = null;
      fail("The speech worker failed to start");
    };
    function cleanup() {
      current.removeEventListener("message", onMessage);
      current.removeEventListener("error", onError);
    }
    current.addEventListener("message", onMessage);
    current.addEventListener("error", onError);
    const copy = new Float32Array(audio.length);
    copy.set(audio);
    current.postMessage({ type: "transcribe", id, audio: copy, quality, return_timestamps: returnTimestamps }, [copy.buffer]);
  });
}
