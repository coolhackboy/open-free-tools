/* Loaded with new Worker() after the user runs an upscaler. Not part of the page bundle.
 * Models: UpscalerJS ESRGAN slim / medium / thick (MIT), served by jsDelivr from the official npm packages. */
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");

const SLIM = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/";
const MEDIUM = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-medium@1.0.0/models/";
const THICK = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-thick@1.0.0/models/";
const FOUR_MB = 4194304;

function thick(scale, lastBytes) {
  const bins = [];
  for (let index = 1; index <= 7; index += 1) {
    bins.push({
      url: THICK + "x" + scale + "/group1-shard" + index + "of7.bin",
      bytes: index === 7 ? lastBytes : FOUR_MB,
    });
  }
  return {
    json: THICK + "x" + scale + "/model.json",
    jsonBytes: 193998,
    bins,
    cache: "oft-esrgan-thick-x" + scale,
  };
}

const MODELS = {
  fast: {
    2: { json: SLIM + "x2/model.json", jsonBytes: 12336, bins: [{ url: SLIM + "x2/group1-shard1of1.bin", bytes: 888300 }], cache: "oft-esrgan-slim-x2" },
    3: { json: SLIM + "x3/model.json", jsonBytes: 12336, bins: [{ url: SLIM + "x3/group1-shard1of1.bin", bytes: 907260 }], cache: "oft-esrgan-slim-x3" },
    4: { json: SLIM + "x4/model.json", jsonBytes: 12336, bins: [{ url: SLIM + "x4/group1-shard1of1.bin", bytes: 933804 }], cache: "oft-esrgan-slim-x4" },
  },
  balanced: {
    2: { json: MEDIUM + "x2/model.json", jsonBytes: 30051, bins: [{ url: MEDIUM + "x2/group1-shard1of1.bin", bytes: 2772940 }], cache: "oft-esrgan-medium-x2" },
    3: { json: MEDIUM + "x3/model.json", jsonBytes: 30051, bins: [{ url: MEDIUM + "x3/group1-shard1of1.bin", bytes: 2791900 }], cache: "oft-esrgan-medium-x3" },
    4: { json: MEDIUM + "x4/model.json", jsonBytes: 30051, bins: [{ url: MEDIUM + "x4/group1-shard1of1.bin", bytes: 2818444 }], cache: "oft-esrgan-medium-x4" },
  },
  best: {
    2: thick(2, 3794048),
    3: thick(3, 3828668),
    4: thick(4, 3877136),
  },
};

const MAX_EDGE = 512;
const PATCH = 64;
const PAD = 2;
const readyModels = new Map();
let backendReady = null;
let wasmScript = false;

function failMessage(error) {
  if (error && error.message) return String(error.message);
  return String(error);
}

function post(message, transfer) {
  if (transfer) self.postMessage(message, transfer);
  else self.postMessage(message);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("backend timeout")), ms);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function ensureBackend() {
  if (!backendReady) {
    backendReady = (async () => {
      const attempts = ["webgl", "wasm", "cpu"];
      let last = new Error("No TensorFlow backend");
      for (const name of attempts) {
        try {
          if (name === "wasm" && !wasmScript) {
            importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/tf-backend-wasm.js");
            tf.wasm.setWasmPaths("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/");
            wasmScript = true;
          }
          const started = tf.setBackend(name).then(() => tf.ready());
          await (name === "cpu" ? started : withTimeout(started, 4000));
          if (tf.getBackend() === name) return name;
        } catch (error) {
          last = error;
        }
      }
      throw last;
    })().catch((error) => {
      backendReady = null;
      throw error;
    });
  }
  return backendReady;
}

async function fetchBytes(url, bytes, cacheName, id, progress) {
  const cache = await caches.open(cacheName).catch(() => null);
  const cached = await cache?.match(url).catch(() => undefined);
  if (cached) {
    const data = new Uint8Array(await cached.arrayBuffer());
    if (data.length === bytes) {
      progress.loaded += bytes;
      post({ type: "download", id, loaded: progress.loaded, total: progress.total });
      return data;
    }
    await cache?.delete(url);
  }
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error("model download failed (" + response.status + ")");
  const data = new Uint8Array(bytes);
  const reader = response.body.getReader();
  let loaded = 0;
  let last = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    if (loaded + chunk.value.length > data.length) throw new Error("model download larger than expected");
    data.set(chunk.value, loaded);
    loaded += chunk.value.length;
    const now = performance.now();
    if (now - last > 100) {
      last = now;
      post({ type: "download", id, loaded: progress.loaded + loaded, total: progress.total });
    }
  }
  if (loaded !== bytes) throw new Error("model download incomplete (" + loaded + " of " + bytes + " bytes)");
  progress.loaded += loaded;
  post({ type: "download", id, loaded: progress.loaded, total: progress.total });
  if (cache) await cache.put(url, new Response(data, { headers: { "content-type": "application/octet-stream" } })).catch(() => {});
  return data;
}

function specFor(quality, scale) {
  const group = MODELS[quality] || MODELS.fast;
  return group[scale] || group[2];
}

async function modelFor(quality, scale, id) {
  const key = quality + ":" + scale;
  const existing = readyModels.get(key);
  if (existing) return existing;
  const spec = specFor(quality, scale);
  const pending = (async () => {
    await ensureBackend();
    const binBytes = spec.bins.reduce((sum, bin) => sum + bin.bytes, 0);
    const progress = { loaded: 0, total: spec.jsonBytes + binBytes };
    const jsonBytes = await fetchBytes(spec.json, spec.jsonBytes, spec.cache, id, progress);
    const parts = [];
    for (const bin of spec.bins) parts.push(await fetchBytes(bin.url, bin.bytes, spec.cache, id, progress));
    const weights = new Uint8Array(binBytes);
    let offset = 0;
    for (const part of parts) {
      weights.set(part, offset);
      offset += part.length;
    }
    const modelJson = JSON.parse(new TextDecoder().decode(jsonBytes));
    const specs = modelJson.weightsManifest.flatMap((group) => group.weights);
    return tf.loadLayersModel(tf.io.fromMemory(modelJson.modelTopology, specs, weights.buffer));
  })().catch((error) => {
    readyModels.delete(key);
    throw error;
  });
  readyModels.set(key, pending);
  return pending;
}

function mirrorIndex(index, size) {
  if (size <= 1) return 0;
  const period = (size - 1) * 2;
  let value = index % period;
  if (value < 0) value += period;
  if (value >= size) value = period - value;
  return value;
}

function resizeRgba(pixels, width, height, nextWidth, nextHeight) {
  const out = new Uint8ClampedArray(nextWidth * nextHeight * 4);
  for (let y = 0; y < nextHeight; y += 1) {
    const gy = Math.min(height - 1, Math.max(0, (y + 0.5) * height / nextHeight - 0.5));
    const y0 = Math.floor(gy);
    const y1 = Math.min(height - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < nextWidth; x += 1) {
      const gx = Math.min(width - 1, Math.max(0, (x + 0.5) * width / nextWidth - 0.5));
      const x0 = Math.floor(gx);
      const x1 = Math.min(width - 1, x0 + 1);
      const fx = gx - x0;
      const dest = (y * nextWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const value = pixels[(y0 * width + x0) * 4 + channel] * (1 - fx) * (1 - fy)
          + pixels[(y0 * width + x1) * 4 + channel] * fx * (1 - fy)
          + pixels[(y1 * width + x0) * 4 + channel] * (1 - fx) * fy
          + pixels[(y1 * width + x1) * 4 + channel] * fx * fy;
        out[dest + channel] = Math.round(value);
      }
    }
  }
  return out;
}

function clampByte(value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

async function upscale(message) {
  const scale = message.scale === 3 || message.scale === 4 ? message.scale : 2;
  const quality = MODELS[message.quality] ? message.quality : "fast";
  const model = await modelFor(quality, scale, message.id);
  post({ type: "infer", id: message.id });
  let width = message.width;
  let height = message.height;
  let pixels = message.rgba;
  const edge = Math.max(width, height);
  if (edge > MAX_EDGE) {
    const fitted = MAX_EDGE / edge;
    const nextWidth = Math.max(1, Math.round(width * fitted));
    const nextHeight = Math.max(1, Math.round(height * fitted));
    pixels = resizeRgba(pixels, width, height, nextWidth, nextHeight);
    width = nextWidth;
    height = nextHeight;
  }
  const outWidth = width * scale;
  const outHeight = height * scale;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let y = 0; y < height; y += PATCH) {
    for (let x = 0; x < width; x += PATCH) {
      const patchWidth = Math.min(PATCH, width - x);
      const patchHeight = Math.min(PATCH, height - y);
      const tileWidth = Math.ceil((patchWidth + PAD * 2) / 4) * 4;
      const tileHeight = Math.ceil((patchHeight + PAD * 2) / 4) * 4;
      const input = new Float32Array(tileWidth * tileHeight * 3);
      for (let py = 0; py < tileHeight; py += 1) {
        const sy = mirrorIndex(y - PAD + py, height);
        for (let px = 0; px < tileWidth; px += 1) {
          const sx = mirrorIndex(x - PAD + px, width);
          const source = (sy * width + sx) * 4;
          const dest = (py * tileWidth + px) * 3;
          input[dest] = pixels[source] / 255;
          input[dest + 1] = pixels[source + 1] / 255;
          input[dest + 2] = pixels[source + 2] / 255;
        }
      }
      const tensor = tf.tensor4d(input, [1, tileHeight, tileWidth, 3]);
      const predicted = model.predict(tensor);
      const data = await predicted.data();
      tensor.dispose();
      predicted.dispose();
      const predictedWidth = tileWidth * scale;
      const cropX = PAD * scale;
      const cropY = PAD * scale;
      for (let py = 0; py < patchHeight * scale; py += 1) {
        for (let px = 0; px < patchWidth * scale; px += 1) {
          const source = ((cropY + py) * predictedWidth + (cropX + px)) * 3;
          const dest = ((y * scale + py) * outWidth + (x * scale + px)) * 4;
          out[dest] = clampByte(data[source] * 255);
          out[dest + 1] = clampByte(data[source + 1] * 255);
          out[dest + 2] = clampByte(data[source + 2] * 255);
          out[dest + 3] = 255;
        }
      }
    }
  }
  post({ type: "result", id: message.id, rgba: out, width: outWidth, height: outHeight }, [out.buffer]);
}

let chain = Promise.resolve();
self.onmessage = (event) => {
  const message = event.data;
  if (!message || message.type !== "upscale") return;
  chain = chain.then(() => upscale(message)).catch((error) => {
    post({ type: "error", id: message.id, message: failMessage(error) });
  });
};
