/* Loaded as a module worker after the user transcribes a file. Not part of the page bundle. */
import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODELS = {
  fast: "Xenova/whisper-base",
  accurate: "Xenova/whisper-small",
};

const ready = new Map();
let chain = Promise.resolve();

function failMessage(error) {
  if (error && error.message) return String(error.message);
  return String(error);
}

function modelFor(quality, id) {
  const key = MODELS[quality] ? quality : "fast";
  const existing = ready.get(key);
  if (existing) return existing;
  const pending = pipeline("automatic-speech-recognition", MODELS[key], {
    progress_callback(update) {
      if (!update || update.status !== "progress") return;
      const total = Number(update.total) || 0;
      const loaded = Number(update.loaded) || 0;
      if (total > 0) self.postMessage({ type: "download", id, loaded, total });
    },
  }).catch((error) => {
    ready.delete(key);
    throw error;
  });
  ready.set(key, pending);
  return pending;
}

async function transcribe(message) {
  const audio = message.audio instanceof Float32Array ? message.audio : new Float32Array(message.audio);
  const transcriber = await modelFor(message.quality, message.id);
  self.postMessage({ type: "infer", id: message.id });
  const output = await transcriber(audio, {
    // In 2.17.2, explicit task drops the auto-language slot and misaligns timestamps.
    // Keep the models' default transcribe prompt when timestamps are enabled.
    ...(message.return_timestamps === false ? { task: "transcribe" } : {}),
    return_timestamps: message.return_timestamps !== false,
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const chunks = Array.isArray(output.chunks) ? output.chunks.flatMap((chunk) => {
    const text = String(chunk.text || "").trim();
    if (!text) return [];
    const start = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[0]) || 0 : 0;
    const end = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[1]) || 0 : 0;
    return [{ text, start, end }];
  }) : [];
  self.postMessage({
    type: "result",
    id: message.id,
    text: String(output.text || "").trim(),
    chunks,
  });
}

self.onmessage = (event) => {
  const message = event.data;
  if (!message || message.type !== "transcribe") return;
  chain = chain.then(() => transcribe(message)).catch((error) => {
    self.postMessage({ type: "error", id: message.id, message: failMessage(error) });
  });
};
