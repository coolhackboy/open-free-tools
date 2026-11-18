# Third-party software, models and services

Open Free Tools is MIT licensed. It also uses the components below. **Bundled** means the code ships inside
`dist/` from npm. **Runtime** means the browser downloads it from a public CDN the first time you run a tool that
needs it; nothing from these downloads contains your data, and your files are never sent to these hosts.

## Engines and models downloaded at runtime

| Component | Used by | Loaded from | License |
| --- | --- | --- | --- |
| [FFmpeg](https://ffmpeg.org/) via [@ffmpeg/core](https://github.com/ffmpegwasm/ffmpeg.wasm) 0.12.6 (ESM build) | Video compressor, converter, trimmer, cropper, speed changer, merger, video to GIF / MP3, audio converter and trimmer | `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/` | **GPL-2.0-or-later** (see note below) |
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) via [tesseract.js](https://github.com/naptha/tesseract.js) 5.1.1 and tesseract.js-core | OCR, Image to Text | `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/`, `https://cdn.jsdelivr.net/npm/tesseract.js-core@v5…/` | Apache-2.0 |
| Tesseract language data ([tessdata](https://github.com/tesseract-ocr/tessdata_best), packaged as `@tesseract.js-data/<lang>`) | OCR, Image to Text | `https://cdn.jsdelivr.net/npm/@tesseract.js-data/<lang>/4.0.0_best_int/` | Apache-2.0 (data), MIT (package) |
| [sql.js](https://github.com/sql-js/sql.js) 1.12.0 (SQLite compiled to WebAssembly) | SQLite viewer | `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/` | MIT (SQLite itself is public domain) |
| [TensorFlow.js](https://github.com/tensorflow/tfjs) 4.22.0 and tfjs-backend-wasm 4.22.0 | Image upscaler, video upscaler | `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/`, `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/` | Apache-2.0 |
| [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) ESRGAN models: `@upscalerjs/esrgan-slim`, `esrgan-medium`, `esrgan-thick` 1.0.0 | Image upscaler (Fast / Balanced / Best), video upscaler | `https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-{slim,medium,thick}@1.0.0/models/` | MIT |
| [transformers.js](https://github.com/xenova/transformers.js) (`@xenova/transformers`) 2.17.2, which loads [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.14.0 | Speech to text, audio / video to text, subtitle generator | `https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2`, `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/` | Apache-2.0 (transformers.js), MIT (ONNX Runtime) |
| [Whisper](https://github.com/openai/whisper) base and small, ONNX conversions [Xenova/whisper-base](https://huggingface.co/Xenova/whisper-base) and [Xenova/whisper-small](https://huggingface.co/Xenova/whisper-small) | Speech to text, audio / video to text, subtitle generator | `https://huggingface.co/Xenova/whisper-base`, `https://huggingface.co/Xenova/whisper-small` | Apache-2.0 (model cards); Whisper code MIT |

Downloaded engines and models are cached by the browser (Cache Storage, names prefixed `oft-`, plus the
transformers.js cache) so later runs work faster.

### Note on FFmpeg (GPL)

The `@ffmpeg/core` npm package is published under MIT, but the WebAssembly binary it contains is FFmpeg built with
GPL components (for example libx264), so the binary as a whole is licensed under the **GNU General Public License
v2 or later**. Open Free Tools does **not** bundle or redistribute it: the page fetches the unmodified official
build from jsDelivr at runtime, in your browser, only when you run an FFmpeg-based tool. If you self-host and want
to serve the core from your own server, you take on the GPL's source-availability obligations for that file; the
corresponding source is at <https://github.com/ffmpegwasm/ffmpeg.wasm> (tag `v0.12.6` of `@ffmpeg/core`).

## Network services (only when you press the tool's button)

| Service | Used by | Endpoint | Terms |
| --- | --- | --- | --- |
| Cloudflare trace | What Is My IP | `https://www.cloudflare.com/cdn-cgi/trace` | [Cloudflare privacy policy](https://www.cloudflare.com/privacypolicy/) |
| Cloudflare DNS over HTTPS (1.1.1.1) | DNS Lookup | `https://cloudflare-dns.com/dns-query` | [1.1.1.1 privacy commitment](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/) |
| [Frankfurter](https://frankfurter.dev/) (European Central Bank reference rates) | Currency Converter | `https://api.frankfurter.dev/` | Free, no key; open source (MIT) |
| Cloudflare speed test, via [@cloudflare/speedtest](https://github.com/cloudflare/speedtest) (bundled, MIT) | Internet Speed Test | `https://speed.cloudflare.com/` | [Cloudflare privacy policy](https://www.cloudflare.com/privacypolicy/); results are not reported back (`logMeasurementApiUrl` is disabled) |
| Browser speech recognition (`webkitSpeechRecognition`) | The **Dictate** button in the speech-to-text tools | Provided by the browser (Chrome sends audio to Google) | Your browser vendor's terms |

## Bundled npm packages

| Package | Purpose | License |
| --- | --- | --- |
| react, react-dom | UI | MIT |
| lucide-react | Icons | ISC |
| @fontsource-variable/geist, geist-mono | Geist fonts | OFL-1.1 |
| pdf-lib | Create and edit PDFs | MIT |
| pdfjs-dist 4.10.38 (incl. its worker) | Render and read PDFs | Apache-2.0 |
| @ffmpeg/ffmpeg, @ffmpeg/util | FFmpeg.wasm loader (the core itself is fetched at runtime, see above) | MIT |
| three | 3D viewer and mesh conversion | MIT |
| bwip-js | Barcodes | MIT |
| qrcode.react | QR codes | ISC |
| gifenc | GIF encoding | MIT |
| hyparquet, hyparquet-writer | Parquet files | MIT |
| sql-formatter | SQL formatter | MIT |
| yaml | YAML ↔ JSON | ISC |
| react-markdown, remark-gfm (and the unified / micromark ecosystem) | Markdown preview | MIT |
| @cloudflare/speedtest | Speed test engine | MIT |

The full dependency tree contains only permissive licenses (MIT, ISC, Apache-2.0, BSD-3-Clause, 0BSD, Zlib,
Python-2.0, CC0-1.0, OFL-1.1 for fonts). No GPL or AGPL code is bundled.

## Other assets

- Tool card illustrations are generated SVG drawn in code (`src/tools/cardArt.ts`), not images.
- All sample inputs ("Use a sample" buttons) are generated in the browser at run time; the project ships no
  third-party sample photos, audio or documents.
