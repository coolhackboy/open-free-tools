<div align="center">

<img src="public/favicon.svg" width="56" height="56" alt="" />

# Open Free Tools

**<!-- tools-count -->272<!-- /tools-count --> free tools that run entirely in your browser: image, video, audio, PDF, 3D, data, developer and everyday tools.**

No sign-up · no upload · no tracking · self-hostable static site · MIT

[**Live demo**](https://coolhackboy.github.io/open-free-tools/) · [**Tools**](#tools) · [**Self-host**](#self-host) · [**Deploy**](#deploy) · [**White-label**](#white-label) · [**Privacy**](#privacy)

[![License: MIT](https://img.shields.io/badge/license-MIT-84cc16.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-149eca)
![Vite 6](https://img.shields.io/badge/Vite-6-646cff)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

</div>

## What it is

A collection of small, focused tools (compress an image, merge PDFs, trim a video, format JSON, convert units,
play sudoku…) built as one static website. Every tool does its work **in the browser tab**: files are read with
the File API and processed with Canvas, WebAssembly and Web Audio, so they never leave your device. There is no
backend, no database and no account system, so a copy can be hosted on GitHub Pages, Netlify, Vercel or any web server.

- **<!-- tools-count -->272<!-- /tools-count --> tools in 11 categories**, each on its own URL with a how-to and FAQ.
- **Fast home page**: forgiving search (typos, synonyms, English and Chinese), <kbd>/</kbd> to focus,
  arrow keys to move through results, category tabs with counts, and recently used tools.
- **English and 简体中文**, light and dark themes, responsive down to 360 px, keyboard accessible,
  `prefers-reduced-motion` respected.
- **SEO-ready static output**: a prerendered HTML file per tool and language with title, description,
  canonical, hreflang, Open Graph and JSON-LD, plus `sitemap.xml` and `robots.txt`.
- **Heavy engines load on demand**: FFmpeg, OCR, Whisper and the upscaler are only downloaded when you run them.

## Tools

<!-- tools:start -->
<details>
<summary><b>Image & design</b> (31)</summary>

[Vectorize Image](https://coolhackboy.github.io/open-free-tools/tools/vectorizer/) · [Image Converter](https://coolhackboy.github.io/open-free-tools/tools/image-converter/) · [Photo Editor](https://coolhackboy.github.io/open-free-tools/tools/photo-editor/) · [Crop Image](https://coolhackboy.github.io/open-free-tools/tools/image-cropper/) · [EXIF Remover](https://coolhackboy.github.io/open-free-tools/tools/exif-remover/) · [Image Compressor](https://coolhackboy.github.io/open-free-tools/tools/image-compressor/) · [Resize Image](https://coolhackboy.github.io/open-free-tools/tools/image-resizer/) · [AI Image Upscaler](https://coolhackboy.github.io/open-free-tools/tools/image-upscaler/) · [Photo Collage Maker](https://coolhackboy.github.io/open-free-tools/tools/photo-collage-maker/) · [Logo Maker](https://coolhackboy.github.io/open-free-tools/tools/logo-maker/) · [Passport Photo Maker](https://coolhackboy.github.io/open-free-tools/tools/passport-photo-maker/) · [Mockup Generator](https://coolhackboy.github.io/open-free-tools/tools/mockup-generator/) · [Add Watermark to Photo](https://coolhackboy.github.io/open-free-tools/tools/add-watermark/) · [App Store Screenshot Generator](https://coolhackboy.github.io/open-free-tools/tools/app-store-screenshot-generator/) · [PNG to SVG](https://coolhackboy.github.io/open-free-tools/tools/png-to-svg/) · [JPG to SVG](https://coolhackboy.github.io/open-free-tools/tools/jpg-to-svg/) · [Image to SVG](https://coolhackboy.github.io/open-free-tools/tools/image-to-svg/) · [Image Editor](https://coolhackboy.github.io/open-free-tools/tools/image-editor/) · [Heart Photo Collage](https://coolhackboy.github.io/open-free-tools/tools/heart-photo-collage/) · [Instagram Story Collage](https://coolhackboy.github.io/open-free-tools/tools/instagram-story-collage/) · [Photo Grid Maker](https://coolhackboy.github.io/open-free-tools/tools/photo-grid-maker/) · [Visa Photo Maker](https://coolhackboy.github.io/open-free-tools/tools/visa-photo-maker/) · [Image to Text](https://coolhackboy.github.io/open-free-tools/tools/image-to-text/) · [Color Palette Generator](https://coolhackboy.github.io/open-free-tools/tools/color-palette-generator/) · [Color Converter](https://coolhackboy.github.io/open-free-tools/tools/color-converter/) · [HEX to RGB Converter](https://coolhackboy.github.io/open-free-tools/tools/hex-to-rgb/) · [RGB to HEX Converter](https://coolhackboy.github.io/open-free-tools/tools/rgb-to-hex/) · [Favicon Generator](https://coolhackboy.github.io/open-free-tools/tools/favicon-generator/) · [Image to Base64 Converter](https://coolhackboy.github.io/open-free-tools/tools/image-to-base64/) · [SVG Optimizer](https://coolhackboy.github.io/open-free-tools/tools/svg-optimizer/) · [Meme Generator](https://coolhackboy.github.io/open-free-tools/tools/meme-generator/)

</details>

<details>
<summary><b>Video & audio</b> (40)</summary>

[Video Compressor](https://coolhackboy.github.io/open-free-tools/tools/video-compressor/) · [Video Editor](https://coolhackboy.github.io/open-free-tools/tools/video-editor/) · [Video Converter](https://coolhackboy.github.io/open-free-tools/tools/video-converter/) · [LUT Generator](https://coolhackboy.github.io/open-free-tools/tools/lut-generator/) · [Video Upscaler](https://coolhackboy.github.io/open-free-tools/tools/video-upscaler/) · [Video Merger](https://coolhackboy.github.io/open-free-tools/tools/media-merger/) · [Audio Converter](https://coolhackboy.github.io/open-free-tools/tools/audio-converter/) · [Audio Trimmer](https://coolhackboy.github.io/open-free-tools/tools/audio-trimmer/) · [Music Maker](https://coolhackboy.github.io/open-free-tools/tools/music-maker/) · [Sheet Music Maker](https://coolhackboy.github.io/open-free-tools/tools/sheet-music-maker/) · [Online Piano](https://coolhackboy.github.io/open-free-tools/tools/online-piano/) · [Online Guitar](https://coolhackboy.github.io/open-free-tools/tools/online-guitar/) · [Video to GIF](https://coolhackboy.github.io/open-free-tools/tools/video-to-gif/) · [GIF Maker](https://coolhackboy.github.io/open-free-tools/tools/gif-maker/) · [Subtitle Generator](https://coolhackboy.github.io/open-free-tools/tools/subtitle-generator/) · [Screen Recorder](https://coolhackboy.github.io/open-free-tools/tools/screen-recorder/) · [Green Screen Remover](https://coolhackboy.github.io/open-free-tools/tools/green-screen-video/) · [Voice Recorder](https://coolhackboy.github.io/open-free-tools/tools/voice-recorder/) · [Online Teleprompter](https://coolhackboy.github.io/open-free-tools/tools/teleprompter/) · [Trim Video](https://coolhackboy.github.io/open-free-tools/tools/trim-video/) · [Crop Video](https://coolhackboy.github.io/open-free-tools/tools/crop-video/) · [Video Speed Changer](https://coolhackboy.github.io/open-free-tools/tools/video-speed-changer/) · [MP4 to MP3](https://coolhackboy.github.io/open-free-tools/tools/mp4-to-mp3/) · [Video to MP3](https://coolhackboy.github.io/open-free-tools/tools/video-to-mp3/) · [Remove Audio from Video](https://coolhackboy.github.io/open-free-tools/tools/remove-audio-from-video/) · [MP4 to GIF](https://coolhackboy.github.io/open-free-tools/tools/mp4-to-gif/) · [Boomerang GIF Maker](https://coolhackboy.github.io/open-free-tools/tools/boomerang-gif-maker/) · [Slideshow Maker](https://coolhackboy.github.io/open-free-tools/tools/slideshow-maker/) · [Add Subtitles to Video](https://coolhackboy.github.io/open-free-tools/tools/add-subtitles-to-video/) · [Video to Text](https://coolhackboy.github.io/open-free-tools/tools/video-to-text/) · [Speech to Text](https://coolhackboy.github.io/open-free-tools/tools/speech-to-text/) · [Audio to Text](https://coolhackboy.github.io/open-free-tools/tools/audio-to-text/) · [Chroma Key](https://coolhackboy.github.io/open-free-tools/tools/chroma-key/) · [Online Tuner](https://coolhackboy.github.io/open-free-tools/tools/tuner/) · [Online Metronome](https://coolhackboy.github.io/open-free-tools/tools/metronome/) · [White Noise Generator](https://coolhackboy.github.io/open-free-tools/tools/white-noise/) · [Text to Speech](https://coolhackboy.github.io/open-free-tools/tools/text-to-speech/) · [Loudness Meter](https://coolhackboy.github.io/open-free-tools/tools/loudness-meter/) · [LUFS Meter](https://coolhackboy.github.io/open-free-tools/tools/lufs-meter/) · [Normalize Audio](https://coolhackboy.github.io/open-free-tools/tools/normalize-audio/)

</details>

<details>
<summary><b>PDF & documents</b> (42)</summary>

[PDF Editor](https://coolhackboy.github.io/open-free-tools/tools/pdf-editor/) · [Merge PDF](https://coolhackboy.github.io/open-free-tools/tools/merge-pdf/) · [Compress PDF](https://coolhackboy.github.io/open-free-tools/tools/compress-pdf/) · [PDF to JPG](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-jpg/) · [Image to PDF](https://coolhackboy.github.io/open-free-tools/tools/image-to-pdf/) · [Split PDF](https://coolhackboy.github.io/open-free-tools/tools/split-pdf/) · [Rotate PDF](https://coolhackboy.github.io/open-free-tools/tools/rotate-pdf/) · [Sign PDF](https://coolhackboy.github.io/open-free-tools/tools/sign-pdf/) · [PDF to PNG](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-png/) · [JPG to PDF](https://coolhackboy.github.io/open-free-tools/tools/jpg-to-pdf/) · [PNG to PDF](https://coolhackboy.github.io/open-free-tools/tools/png-to-pdf/) · [Add Page Numbers to PDF](https://coolhackboy.github.io/open-free-tools/tools/add-page-numbers-to-pdf/) · [Bates Numbering](https://coolhackboy.github.io/open-free-tools/tools/bates-numbering/) · [Black Out Text in PDF](https://coolhackboy.github.io/open-free-tools/tools/black-out-text-in-pdf/) · [Redact PDF](https://coolhackboy.github.io/open-free-tools/tools/redact-pdf/) · [Remove PDF Metadata](https://coolhackboy.github.io/open-free-tools/tools/remove-metadata-from-pdf/) · [Unlock PDF](https://coolhackboy.github.io/open-free-tools/tools/unlock-pdf/) · [PDF Reader](https://coolhackboy.github.io/open-free-tools/tools/pdf-reader/) · [PDF to Text](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-text/) · [PDF to Word](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-word/) · [PDF to Excel](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-excel/) · [PDF to PowerPoint](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-ppt/) · [PDF to PPTX](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-pptx/) · [Word to PDF](https://coolhackboy.github.io/open-free-tools/tools/word-to-pdf/) · [DOCX to PDF](https://coolhackboy.github.io/open-free-tools/tools/docx-to-pdf/) · [Excel to PDF](https://coolhackboy.github.io/open-free-tools/tools/excel-to-pdf/) · [XLSX to PDF](https://coolhackboy.github.io/open-free-tools/tools/xlsx-to-pdf/) · [HTML to PDF](https://coolhackboy.github.io/open-free-tools/tools/html-to-pdf/) · [Text to PDF](https://coolhackboy.github.io/open-free-tools/tools/text-to-pdf/) · [CSV to PDF](https://coolhackboy.github.io/open-free-tools/tools/csv-to-pdf/) · [Online OCR](https://coolhackboy.github.io/open-free-tools/tools/ocr/) · [Compare PDF](https://coolhackboy.github.io/open-free-tools/tools/compare-pdf/) · [Compare Documents](https://coolhackboy.github.io/open-free-tools/tools/document-compare/) · [Compare Word Documents](https://coolhackboy.github.io/open-free-tools/tools/compare-word-documents/) · [PDF Imposition](https://coolhackboy.github.io/open-free-tools/tools/pdf-imposition/) · [PDF Booklet Maker](https://coolhackboy.github.io/open-free-tools/tools/pdf-booklet-maker/) · [N-up PDF](https://coolhackboy.github.io/open-free-tools/tools/n-up-pdf/) · [Business Card Imposition](https://coolhackboy.github.io/open-free-tools/tools/business-card-imposition/) · [Bank Statement Converter](https://coolhackboy.github.io/open-free-tools/tools/bank-statement-converter/) · [Bank Statement to CSV](https://coolhackboy.github.io/open-free-tools/tools/bank-statement-to-csv/) · [Bank Statement to Excel](https://coolhackboy.github.io/open-free-tools/tools/pdf-bank-statement-to-excel/) · [PDF to QBO](https://coolhackboy.github.io/open-free-tools/tools/pdf-to-qbo/)

</details>

<details>
<summary><b>Whiteboards & charts</b> (5)</summary>

[Online Whiteboard](https://coolhackboy.github.io/open-free-tools/tools/whiteboard/) · [Mind Map Maker](https://coolhackboy.github.io/open-free-tools/tools/mind-map/) · [Gantt Chart Maker](https://coolhackboy.github.io/open-free-tools/tools/gantt-chart-maker/) · [Gantt Chart Template](https://coolhackboy.github.io/open-free-tools/tools/gantt-chart-template/) · [Project Timeline Maker](https://coolhackboy.github.io/open-free-tools/tools/project-timeline-maker/)

</details>

<details>
<summary><b>Games & learning</b> (11)</summary>

[Play Sudoku Online](https://coolhackboy.github.io/open-free-tools/tools/sudoku/) · [Typing Test](https://coolhackboy.github.io/open-free-tools/tools/typing-test/) · [Play 2048 Online](https://coolhackboy.github.io/open-free-tools/tools/2048/) · [Block Puzzle](https://coolhackboy.github.io/open-free-tools/tools/block-puzzle/) · [Play Chess Online](https://coolhackboy.github.io/open-free-tools/tools/chess/) · [Minesweeper](https://coolhackboy.github.io/open-free-tools/tools/minesweeper/) · [Periodic Table](https://coolhackboy.github.io/open-free-tools/tools/periodic-table/) · [Play Snake Online](https://coolhackboy.github.io/open-free-tools/tools/snake-game/) · [Solitaire](https://coolhackboy.github.io/open-free-tools/tools/solitaire/) · [Tic Tac Toe](https://coolhackboy.github.io/open-free-tools/tools/tic-tac-toe/) · [Memory Game](https://coolhackboy.github.io/open-free-tools/tools/memory-game/)

</details>

<details>
<summary><b>Device tests</b> (11)</summary>

[Keyboard Test](https://coolhackboy.github.io/open-free-tools/tools/keyboard-test/) · [Mouse Test](https://coolhackboy.github.io/open-free-tools/tools/mouse-test/) · [Screen Test](https://coolhackboy.github.io/open-free-tools/tools/screen-test/) · [Speaker Test](https://coolhackboy.github.io/open-free-tools/tools/speaker-test/) · [Microphone Test](https://coolhackboy.github.io/open-free-tools/tools/mic-test/) · [Webcam Test](https://coolhackboy.github.io/open-free-tools/tools/webcam-test/) · [Reaction Time Test](https://coolhackboy.github.io/open-free-tools/tools/reaction-time-test/) · [Color Blind Test](https://coolhackboy.github.io/open-free-tools/tools/color-blind-test/) · [Gamepad Tester](https://coolhackboy.github.io/open-free-tools/tools/gamepad-tester/) · [What Is My IP](https://coolhackboy.github.io/open-free-tools/tools/what-is-my-ip/) · [Internet Speed Test](https://coolhackboy.github.io/open-free-tools/tools/internet-speed-test/)

</details>

<details>
<summary><b>Calculators & timers</b> (31)</summary>

[Age Calculator](https://coolhackboy.github.io/open-free-tools/tools/age-calculator/) · [BMI Calculator](https://coolhackboy.github.io/open-free-tools/tools/bmi-calculator/) · [Date Calculator](https://coolhackboy.github.io/open-free-tools/tools/date-calculator/) · [GPA Calculator](https://coolhackboy.github.io/open-free-tools/tools/gpa-calculator/) · [Loan Calculator](https://coolhackboy.github.io/open-free-tools/tools/loan-calculator/) · [Mortgage Calculator](https://coolhackboy.github.io/open-free-tools/tools/mortgage-calculator/) · [Percentage Calculator](https://coolhackboy.github.io/open-free-tools/tools/percentage-calculator/) · [Scientific Calculator](https://coolhackboy.github.io/open-free-tools/tools/scientific-calculator/) · [Dice Roller](https://coolhackboy.github.io/open-free-tools/tools/dice-roller/) · [Flip a Coin](https://coolhackboy.github.io/open-free-tools/tools/flip-a-coin/) · [Random Number Generator](https://coolhackboy.github.io/open-free-tools/tools/random-number-generator/) · [Spin the Wheel](https://coolhackboy.github.io/open-free-tools/tools/spin-the-wheel/) · [Online Timer](https://coolhackboy.github.io/open-free-tools/tools/online-timer/) · [Countdown Timer](https://coolhackboy.github.io/open-free-tools/tools/countdown-timer/) · [Pomodoro Timer](https://coolhackboy.github.io/open-free-tools/tools/pomodoro-timer/) · [Online Stopwatch](https://coolhackboy.github.io/open-free-tools/tools/stopwatch/) · [World Clock](https://coolhackboy.github.io/open-free-tools/tools/world-clock/) · [Unit Converter](https://coolhackboy.github.io/open-free-tools/tools/unit-converter/) · [kg to lbs Converter](https://coolhackboy.github.io/open-free-tools/tools/kg-to-lbs/) · [cm to Inches Converter](https://coolhackboy.github.io/open-free-tools/tools/cm-to-inches/) · [Celsius to Fahrenheit Converter](https://coolhackboy.github.io/open-free-tools/tools/celsius-to-fahrenheit/) · [km to Miles Converter](https://coolhackboy.github.io/open-free-tools/tools/km-to-miles/) · [Tip Calculator](https://coolhackboy.github.io/open-free-tools/tools/tip-calculator/) · [Discount Calculator](https://coolhackboy.github.io/open-free-tools/tools/discount-calculator/) · [Compound Interest Calculator](https://coolhackboy.github.io/open-free-tools/tools/compound-interest-calculator/) · [Calorie Calculator](https://coolhackboy.github.io/open-free-tools/tools/calorie-calculator/) · [Salary Calculator](https://coolhackboy.github.io/open-free-tools/tools/salary-calculator/) · [Roman Numeral Converter](https://coolhackboy.github.io/open-free-tools/tools/roman-numeral-converter/) · [BMR Calculator](https://coolhackboy.github.io/open-free-tools/tools/bmr-calculator/) · [Hourly to Salary Calculator](https://coolhackboy.github.io/open-free-tools/tools/hourly-to-salary-calculator/) · [Currency Converter](https://coolhackboy.github.io/open-free-tools/tools/currency-converter/)

</details>

<details>
<summary><b>Data, maps & medical files</b> (22)</summary>

[Data Explorer](https://coolhackboy.github.io/open-free-tools/tools/data-explorer/) · [CSV Viewer](https://coolhackboy.github.io/open-free-tools/tools/csv-viewer/) · [Excel Viewer](https://coolhackboy.github.io/open-free-tools/tools/excel-viewer/) · [JSON to CSV](https://coolhackboy.github.io/open-free-tools/tools/json-to-csv/) · [CSV to Excel](https://coolhackboy.github.io/open-free-tools/tools/csv-to-excel/) · [Parquet Viewer](https://coolhackboy.github.io/open-free-tools/tools/parquet-viewer/) · [Parquet to CSV](https://coolhackboy.github.io/open-free-tools/tools/parquet-to-csv/) · [SQLite Viewer](https://coolhackboy.github.io/open-free-tools/tools/sqlite-viewer/) · [GIS Viewer](https://coolhackboy.github.io/open-free-tools/tools/gis-viewer/) · [KML Viewer](https://coolhackboy.github.io/open-free-tools/tools/kml-viewer/) · [GeoJSON Viewer](https://coolhackboy.github.io/open-free-tools/tools/geojson-viewer/) · [GPX Viewer](https://coolhackboy.github.io/open-free-tools/tools/gpx-viewer/) · [Shapefile Viewer](https://coolhackboy.github.io/open-free-tools/tools/shapefile-viewer/) · [KML to GeoJSON](https://coolhackboy.github.io/open-free-tools/tools/kml-to-geojson/) · [GeoJSON to KML](https://coolhackboy.github.io/open-free-tools/tools/geojson-to-kml/) · [GPX to KML](https://coolhackboy.github.io/open-free-tools/tools/gpx-to-kml/) · [KML to GPX](https://coolhackboy.github.io/open-free-tools/tools/kml-to-gpx/) · [Shapefile to GeoJSON](https://coolhackboy.github.io/open-free-tools/tools/shapefile-to-geojson/) · [GeoJSON to Shapefile](https://coolhackboy.github.io/open-free-tools/tools/geojson-to-shapefile/) · [DICOM Viewer](https://coolhackboy.github.io/open-free-tools/tools/dicom-viewer/) · [DICOM Anonymizer](https://coolhackboy.github.io/open-free-tools/tools/dicom-anonymizer/) · [DICOM to JPG](https://coolhackboy.github.io/open-free-tools/tools/dicom-to-jpg/)

</details>

<details>
<summary><b>3D printing & CAD</b> (28)</summary>

[GLB to STL](https://coolhackboy.github.io/open-free-tools/tools/glb-to-stl/) · [3D Model Viewer](https://coolhackboy.github.io/open-free-tools/tools/3d-model-viewer/) · [Image to STL](https://coolhackboy.github.io/open-free-tools/tools/image-to-stl/) · [Image to DXF](https://coolhackboy.github.io/open-free-tools/tools/image-to-dxf/) · [DXF Viewer](https://coolhackboy.github.io/open-free-tools/tools/dxf-viewer/) · [STL to 3MF](https://coolhackboy.github.io/open-free-tools/tools/stl-to-3mf/) · [3MF to STL](https://coolhackboy.github.io/open-free-tools/tools/3mf-to-stl/) · [OBJ to STL](https://coolhackboy.github.io/open-free-tools/tools/obj-to-stl/) · [STL to OBJ](https://coolhackboy.github.io/open-free-tools/tools/stl-to-obj/) · [GLB to OBJ](https://coolhackboy.github.io/open-free-tools/tools/glb-to-obj/) · [FBX to STL](https://coolhackboy.github.io/open-free-tools/tools/fbx-to-stl/) · [OBJ to GLB](https://coolhackboy.github.io/open-free-tools/tools/obj-to-glb/) · [FBX to GLB](https://coolhackboy.github.io/open-free-tools/tools/fbx-to-glb/) · [STEP to STL](https://coolhackboy.github.io/open-free-tools/tools/step-to-stl/) · [STEP to OBJ](https://coolhackboy.github.io/open-free-tools/tools/step-to-obj/) · [STL Viewer](https://coolhackboy.github.io/open-free-tools/tools/stl-viewer/) · [GLB Viewer](https://coolhackboy.github.io/open-free-tools/tools/glb-viewer/) · [OBJ Viewer](https://coolhackboy.github.io/open-free-tools/tools/obj-viewer/) · [glTF Viewer](https://coolhackboy.github.io/open-free-tools/tools/gltf-viewer/) · [STEP Viewer](https://coolhackboy.github.io/open-free-tools/tools/step-viewer/) · [Lithophane Maker](https://coolhackboy.github.io/open-free-tools/tools/lithophane-maker/) · [PNG to STL](https://coolhackboy.github.io/open-free-tools/tools/png-to-stl/) · [PNG to DXF](https://coolhackboy.github.io/open-free-tools/tools/png-to-dxf/) · [JPG to DXF](https://coolhackboy.github.io/open-free-tools/tools/jpg-to-dxf/) · [SVG to DXF](https://coolhackboy.github.io/open-free-tools/tools/svg-to-dxf/) · [Text to DXF](https://coolhackboy.github.io/open-free-tools/tools/text-to-dxf/) · [DXF to SVG](https://coolhackboy.github.io/open-free-tools/tools/dxf-to-svg/) · [DXF to PDF](https://coolhackboy.github.io/open-free-tools/tools/dxf-to-pdf/)

</details>

<details>
<summary><b>Crafts & laser</b> (10)</summary>

[Sticker Maker](https://coolhackboy.github.io/open-free-tools/tools/sticker-maker/) · [Perler Bead Pattern Maker](https://coolhackboy.github.io/open-free-tools/tools/perler-bead-pattern-maker/) · [Photo to Laser Engraving](https://coolhackboy.github.io/open-free-tools/tools/laser-engraving/) · [Print Then Cut](https://coolhackboy.github.io/open-free-tools/tools/print-then-cut/) · [Pixel Art Converter](https://coolhackboy.github.io/open-free-tools/tools/pixel-art-converter/) · [Cross Stitch Pattern Generator](https://coolhackboy.github.io/open-free-tools/tools/cross-stitch-pattern-generator/) · [Diamond Painting Pattern Generator](https://coolhackboy.github.io/open-free-tools/tools/diamond-painting-pattern-generator/) · [Knitting Chart Generator](https://coolhackboy.github.io/open-free-tools/tools/knitting-chart-generator/) · [Quilt Pattern Generator](https://coolhackboy.github.io/open-free-tools/tools/quilt-pattern-generator/) · [Dither Image](https://coolhackboy.github.io/open-free-tools/tools/dither-image/)

</details>

<details>
<summary><b>Codes & text</b> (41)</summary>

[QR Code Generator](https://coolhackboy.github.io/open-free-tools/tools/qr-code-generator/) · [Barcode Generator](https://coolhackboy.github.io/open-free-tools/tools/barcode-generator/) · [Password Generator](https://coolhackboy.github.io/open-free-tools/tools/password-generator/) · [Font Generator](https://coolhackboy.github.io/open-free-tools/tools/font-generator/) · [Word Counter](https://coolhackboy.github.io/open-free-tools/tools/word-counter/) · [JSON Formatter](https://coolhackboy.github.io/open-free-tools/tools/json-formatter/) · [UPC Barcode Generator](https://coolhackboy.github.io/open-free-tools/tools/upc-barcode-generator/) · [EAN-13 Barcode Generator](https://coolhackboy.github.io/open-free-tools/tools/ean-13-barcode-generator/) · [Cursive Text Generator](https://coolhackboy.github.io/open-free-tools/tools/cursive-font-generator/) · [Bold Text Generator](https://coolhackboy.github.io/open-free-tools/tools/bold-text-generator/) · [Grammar Checker](https://coolhackboy.github.io/open-free-tools/tools/grammar-checker/) · [Diff Checker](https://coolhackboy.github.io/open-free-tools/tools/diff-checker/) · [Base64 Encoder](https://coolhackboy.github.io/open-free-tools/tools/base64-encoder/) · [URL Encoder](https://coolhackboy.github.io/open-free-tools/tools/url-encoder/) · [HTML Entity Encoder](https://coolhackboy.github.io/open-free-tools/tools/html-entity-encoder/) · [UUID Generator](https://coolhackboy.github.io/open-free-tools/tools/uuid-generator/) · [Hash Generator](https://coolhackboy.github.io/open-free-tools/tools/hash-generator/) · [JWT Decoder](https://coolhackboy.github.io/open-free-tools/tools/jwt-decoder/) · [Regex Tester](https://coolhackboy.github.io/open-free-tools/tools/regex-tester/) · [Case Converter](https://coolhackboy.github.io/open-free-tools/tools/case-converter/) · [Lorem Ipsum Generator](https://coolhackboy.github.io/open-free-tools/tools/lorem-ipsum-generator/) · [Remove Duplicate Lines](https://coolhackboy.github.io/open-free-tools/tools/remove-duplicate-lines/) · [Unix Timestamp Converter](https://coolhackboy.github.io/open-free-tools/tools/unix-timestamp-converter/) · [Cron Expression Generator](https://coolhackboy.github.io/open-free-tools/tools/cron-expression-generator/) · [Number Base Converter](https://coolhackboy.github.io/open-free-tools/tools/number-base-converter/) · [YAML to JSON Converter](https://coolhackboy.github.io/open-free-tools/tools/yaml-to-json/) · [Markdown Preview](https://coolhackboy.github.io/open-free-tools/tools/markdown-preview/) · [SQL Formatter](https://coolhackboy.github.io/open-free-tools/tools/sql-formatter/) · [Base64 Decode](https://coolhackboy.github.io/open-free-tools/tools/base64-decode/) · [URL Decode](https://coolhackboy.github.io/open-free-tools/tools/url-decode/) · [GUID Generator](https://coolhackboy.github.io/open-free-tools/tools/guid-generator/) · [MD5 Generator](https://coolhackboy.github.io/open-free-tools/tools/md5-generator/) · [SHA256 Generator](https://coolhackboy.github.io/open-free-tools/tools/sha256-generator/) · [Uppercase Converter](https://coolhackboy.github.io/open-free-tools/tools/uppercase-converter/) · [Sort Lines Alphabetically](https://coolhackboy.github.io/open-free-tools/tools/sort-lines-alphabetically/) · [Epoch Converter](https://coolhackboy.github.io/open-free-tools/tools/epoch-converter/) · [Binary to Decimal Converter](https://coolhackboy.github.io/open-free-tools/tools/binary-to-decimal/) · [Hex to Decimal Converter](https://coolhackboy.github.io/open-free-tools/tools/hex-to-decimal/) · [JSON to YAML Converter](https://coolhackboy.github.io/open-free-tools/tools/json-to-yaml/) · [Markdown to HTML Converter](https://coolhackboy.github.io/open-free-tools/tools/markdown-to-html/) · [DNS Lookup](https://coolhackboy.github.io/open-free-tools/tools/dns-lookup/)

</details>
<!-- tools:end -->

The list is generated from `src/tools/catalog.ts` with `npm run readme:tools`.

## Self-host

Requires Node.js 20+.

```bash
git clone https://github.com/coolhackboy/open-free-tools.git
cd open-free-tools
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # type-check, bundle, then prerender every page into dist/
npm run preview    # serve dist/ locally
```

`dist/` is plain static files. To serve it from a sub-path, pass the base:

```bash
npm run build -- --base=/tools/
```

Every asset and worker URL is resolved against that base (`import.meta.env.BASE_URL`), so the same build works
at `/` or under any folder.

## Deploy

| Host | How |
| --- | --- |
| **GitHub Pages** | `.github/workflows/pages.yml` lints, builds with `--base=/<repo>/`, prerenders and deploys on every push to `main`. In the repo settings set *Pages → Source* to *GitHub Actions*, and change `VITE_SITE_URL` and the base in the workflow if you fork under another name. |
| **Netlify** | Import the repo; `netlify.toml` already sets the build command and `dist/`. The site URL is picked up from Netlify automatically. |
| **Vercel** | Import the repo; `vercel.json` sets the build and output directory. The production URL is picked up automatically. |
| **Any server** | Upload `dist/`. Serve `404.html` for unknown paths if your server supports it. |

## White-label

All branding is set with build-time environment variables (copy `.env.example` to `.env.local`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_BRAND_NAME` | `Open Free Tools` | Name in the header, footer, titles and Open Graph tags |
| `VITE_BRAND_LOGO_URL` | built-in mark | Square logo (absolute URL or path relative to the site base) |
| `VITE_ACCENT` | lime | Accent color; hover, soft and text variants are derived from it |
| `VITE_SITE_URL` | – | Public URL, used for canonical links, hreflang and `sitemap.xml` |
| `VITE_REPO_URL` | this repo | Source-code link; empty hides it |
| `VITE_SHOW_POWERED_BY` | `true` | The small "Powered by PoYo" link in the footer |

These values end up in public JavaScript. Never put secrets in `VITE_` variables (this project needs none).

To add or remove tools, edit `src/tools/catalog.ts` and the copy in `src/copy/en.json` and `src/copy/zh.json`.
Design tokens (colors, radius, type) live in `src/styles/tokens.css`.

## Privacy

- No analytics, no cookies, no accounts, no server-side code. The only things kept in your browser are your theme,
  the recently used tools list (localStorage) and model files cached by the engines (Cache Storage).
- **Your files never leave the browser.** They are processed in the page or in a Web Worker.
- The page does make these third-party requests, and only when you use the tool that needs them:
  - **Engines and models from public CDNs**: FFmpeg core, Tesseract OCR and its language data, sql.js,
    TensorFlow.js with the ESRGAN upscaler models, and transformers.js / ONNX Runtime from `cdn.jsdelivr.net`;
    the Whisper speech models from `huggingface.co`. These downloads contain none of your data.
    See [THIRD_PARTY.md](THIRD_PARTY.md) for every URL and license.
  - **Network tools** ask a public service for the answer: What Is My IP (Cloudflare `cdn-cgi/trace`),
    DNS Lookup (Cloudflare DNS over HTTPS), Currency Converter (`api.frankfurter.dev`) and Internet Speed Test
    (`speed.cloudflare.com`).
  - The **Dictate** button in the speech-to-text tools uses the browser's built-in speech recognition; in Chrome the
    audio is processed by Google. Transcribing a file uses Whisper locally instead.
- The footer has one link to the sponsor site; nothing is loaded from it.

## Security notes

`npm audit` currently reports a ReDoS advisory in `picomatch` ([GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)). It affects every published picomatch version, has no fix yet, and reaches this project only through build and lint tooling (Vite, typescript-eslint). None of it ships in the built site: `npm audit --omit=dev` reports 0 vulnerabilities. Dependencies will be bumped as soon as a fixed release is out.

## Project structure

```
src/
  tools/catalog.ts       every tool: slug, category, workspace kind, preset
  tools/workspaces/      the tool UIs (one lazily loaded chunk per module)
  tools/lib/             pure helpers (PDF, zip, color, units, geo, DICOM, …)
  copy/en.json, zh.json  page copy: titles, descriptions, steps, FAQ
  components/            app shell: header, home, tool page, search palette
public/workers/          Web Workers for the upscaler and Whisper
scripts/prerender.ts     post-build step that writes one HTML file per page
```

## License

[MIT](LICENSE). Engines that are downloaded at runtime keep their own licenses; notably the FFmpeg core is GPL.
See [THIRD_PARTY.md](THIRD_PARTY.md).

Sponsored by [PoYo](https://poyo.ai/?utm_source=github&utm_medium=readme&utm_campaign=open-free-tools).
