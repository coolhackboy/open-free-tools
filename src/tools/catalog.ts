export const FREE_TOOL_CATEGORIES = [
  { id: "image" },
  { id: "video" },
  { id: "pdf" },
  { id: "diagrams" },
  { id: "games" },
  { id: "devices" },
  { id: "everyday" },
  { id: "data" },
  { id: "3d" },
  { id: "craft" },
  { id: "codes" },
] as const;

export type FreeToolCategoryId = (typeof FREE_TOOL_CATEGORIES)[number]["id"];

export type FreeToolKind =
  | "image"
  | "vectorizer"
  | "editor"
  | "crop"
  | "collage"
  | "logo"
  | "passport"
  | "mockup"
  | "screenshots"
  | "sticker"
  | "pattern"
  | "ffmpeg"
  | "lut"
  | "gif"
  | "subtitles"
  | "screen"
  | "green"
  | "voice"
  | "teleprompter"
  | "video-editor"
  | "music"
  | "sheet"
  | "piano"
  | "guitar"
  | "pdf"
  | "whiteboard"
  | "mind-map"
  | "sudoku"
  | "typing"
  | "mesh"
  | "relief"
  | "dxf"
  | "qr"
  | "barcode"
  | "password"
  | "font"
  | "word"
  | "json"
  | "calc"
  | "device"
  | "game"
  | "audio-lab"
  | "office"
  | "geo"
  | "dev"
  | "unit"
  | "color"
  | "web-asset"
  | "net";

export type FreeTool = {
  slug: string;
  category: FreeToolCategoryId;
  kind: FreeToolKind;
  /** Catalog label. Pages use the titles in src/copy/<locale>.json. */
  title: string;
  titleZh: string;
  preset: Record<string, string>;
};

function tool(
  slug: string,
  category: FreeToolCategoryId,
  kind: FreeToolKind,
  title: string,
  titleZh: string,
  preset: Record<string, string> = {},
): FreeTool {
  return { slug, category, kind, title, titleZh, preset };
}

export const FREE_TOOLS: FreeTool[] = [
  tool("vectorizer", "image", "vectorizer", "Free Image Vectorizer", "免费图片转矢量"),
  tool("image-converter", "image", "image", "Free Image Converter", "免费图片格式转换"),
  tool("photo-editor", "image", "editor", "Free Photo Editor", "免费照片编辑器"),
  tool("image-cropper", "image", "crop", "Free Image Cropper", "免费图片裁剪"),
  tool("exif-remover", "image", "image", "Free EXIF Remover", "免费 EXIF 清除"),
  tool("image-compressor", "image", "image", "Free Image Compressor", "免费图片压缩"),
  tool("image-resizer", "image", "image", "Free Image Resizer", "免费图片缩放"),
  tool("image-upscaler", "image", "image", "Free Image Upscaler", "免费图片放大"),
  tool("photo-collage-maker", "image", "collage", "Free Photo Collage Maker", "免费拼图"),
  tool("logo-maker", "image", "logo", "Free Logo Maker", "免费 Logo 设计"),
  tool("passport-photo-maker", "image", "passport", "Free Passport Photo Maker", "免费证件照"),
  tool("mockup-generator", "image", "mockup", "Free Mockup Generator", "免费样机"),
  tool("add-watermark", "image", "image", "Free Watermark Maker", "免费加水印"),
  tool("app-store-screenshot-generator", "image", "screenshots", "Free App Store Screenshot Generator", "免费应用商店截图"),
  tool("video-compressor", "video", "ffmpeg", "Free Video Compressor", "免费视频压缩"),
  tool("video-editor", "video", "video-editor", "Free Video Editor", "免费视频编辑器"),
  tool("video-converter", "video", "ffmpeg", "Free Video Converter", "免费视频转换"),
  tool("lut-generator", "video", "lut", "Free LUT Generator", "免费 LUT 生成器"),
  tool("video-upscaler", "video", "ffmpeg", "Free Video Upscaler", "免费视频放大"),
  tool("media-merger", "video", "ffmpeg", "Free Video Merger", "免费视频合并"),
  tool("audio-converter", "video", "ffmpeg", "Free Audio Converter", "免费音频转换"),
  tool("audio-trimmer", "video", "ffmpeg", "Free Audio Trimmer", "免费音频裁剪"),
  tool("music-maker", "video", "music", "Free Music Maker", "免费音乐制作"),
  tool("sheet-music-maker", "video", "sheet", "Free Sheet Music Maker", "免费乐谱"),
  tool("online-piano", "video", "piano", "Free Online Piano", "免费在线钢琴"),
  tool("online-guitar", "video", "guitar", "Free Online Guitar", "免费在线吉他"),
  tool("video-to-gif", "video", "ffmpeg", "Free Video to GIF Converter", "免费视频转 GIF"),
  tool("gif-maker", "video", "gif", "Free GIF Maker", "免费 GIF 制作"),
  tool("subtitle-generator", "video", "subtitles", "Free Subtitle Generator", "免费字幕"),
  tool("screen-recorder", "video", "screen", "Free Screen Recorder", "免费屏幕录制"),
  tool("green-screen-video", "video", "green", "Free Green Screen Video Editor", "免费绿幕"),
  tool("voice-recorder", "video", "voice", "Free Voice Recorder", "免费录音"),
  tool("teleprompter", "video", "teleprompter", "Free Teleprompter", "免费提词器"),
  tool("pdf-editor", "pdf", "pdf", "Free PDF Editor", "免费 PDF 编辑"),
  tool("merge-pdf", "pdf", "pdf", "Free Merge PDF", "免费合并 PDF"),
  tool("compress-pdf", "pdf", "pdf", "Free Compress PDF", "免费压缩 PDF"),
  tool("pdf-to-jpg", "pdf", "pdf", "Free PDF to JPG Converter", "免费 PDF 转 JPG"),
  tool("image-to-pdf", "pdf", "pdf", "Free Image to PDF Converter", "免费图片转 PDF"),
  tool("split-pdf", "pdf", "pdf", "Free Split PDF", "免费拆分 PDF"),
  tool("rotate-pdf", "pdf", "pdf", "Free Rotate PDF", "免费旋转 PDF"),
  tool("sign-pdf", "pdf", "pdf", "Free Sign PDF", "免费 PDF 签名"),
  tool("whiteboard", "diagrams", "whiteboard", "Free Online Whiteboard", "免费在线白板"),
  tool("mind-map", "diagrams", "mind-map", "Free Mind Map Maker", "免费思维导图"),
  tool("sudoku", "games", "sudoku", "Free Sudoku", "免费数独"),
  tool("typing-test", "games", "typing", "Free Typing Test", "免费打字测试"),
  tool("glb-to-stl", "3d", "mesh", "Free GLB to STL Converter", "免费 GLB 转 STL"),
  tool("3d-model-viewer", "3d", "mesh", "Free 3D Model Viewer", "免费 3D 查看器"),
  tool("image-to-stl", "3d", "relief", "Free Image to STL Converter", "免费图片转 STL"),
  tool("image-to-dxf", "3d", "dxf", "Free Image to DXF Converter", "免费图片转 DXF"),
  tool("dxf-viewer", "3d", "dxf", "Free DXF Viewer", "免费 DXF 查看器"),
  tool("sticker-maker", "craft", "sticker", "Free Sticker Maker", "免费贴纸"),
  tool("perler-bead-pattern-maker", "craft", "pattern", "Free Perler Bead Pattern Maker", "免费拼豆图纸"),
  tool("laser-engraving", "craft", "image", "Free Photo to Laser Engraving", "免费激光雕刻图"),
  tool("qr-code-generator", "codes", "qr", "Free QR Code Generator", "免费二维码"),
  tool("barcode-generator", "codes", "barcode", "Free Barcode Generator", "免费条码"),
  tool("password-generator", "codes", "password", "Free Password Generator", "免费密码生成"),
  tool("font-generator", "codes", "font", "Free Font Generator", "免费花体字"),
  tool("word-counter", "codes", "word", "Free Word Counter", "免费字数统计"),
  tool("json-formatter", "codes", "json", "Free JSON Formatter", "免费 JSON 格式化"),
  tool("png-to-svg", "image", "vectorizer", "Free PNG to SVG", "免费 PNG 转 SVG", { source: "png" }),
  tool("jpg-to-svg", "image", "vectorizer", "Free JPG to SVG", "免费 JPG 转 SVG", { source: "jpg" }),
  tool("image-to-svg", "image", "vectorizer", "Free Image to SVG", "免费图片转 SVG"),
  tool("image-editor", "image", "editor", "Free Image Editor", "免费图片编辑器"),
  tool("heart-photo-collage", "image", "collage", "Free Heart photo collage", "免费爱心拼图", { layout: "heart" }),
  tool("instagram-story-collage", "image", "collage", "Free Instagram story collage", "免费 Instagram 故事拼图", { layout: "story" }),
  tool("photo-grid-maker", "image", "collage", "Free Photo grid maker", "免费照片网格", { layout: "grid" }),
  tool("visa-photo-maker", "image", "passport", "Free Visa photo maker", "免费签证照片", { variant: "visa" }),
  tool("trim-video", "video", "ffmpeg", "Free Trim video", "免费裁切视频", { mode: "trim" }),
  tool("crop-video", "video", "ffmpeg", "Free Crop video", "免费裁剪画面", { mode: "crop" }),
  tool("video-speed-changer", "video", "ffmpeg", "Free Video speed changer", "免费视频变速", { mode: "speed" }),
  tool("mp4-to-mp3", "video", "ffmpeg", "Free MP4 to MP3", "免费 MP4 转 MP3", { mode: "to-mp3" }),
  tool("video-to-mp3", "video", "ffmpeg", "Free Video to MP3", "免费视频转 MP3", { mode: "to-mp3" }),
  tool("remove-audio-from-video", "video", "ffmpeg", "Free Remove audio from video", "免费去除视频声音", { mode: "strip-audio" }),
  tool("mp4-to-gif", "video", "ffmpeg", "Free MP4 to GIF", "免费 MP4 转 GIF", { mode: "video-gif" }),
  tool("boomerang-gif-maker", "video", "ffmpeg", "Free Boomerang GIF maker", "免费回弹 GIF", { mode: "boomerang" }),
  tool("slideshow-maker", "video", "gif", "Free Slideshow maker", "免费幻灯片", { mode: "slideshow" }),
  tool("add-subtitles-to-video", "video", "subtitles", "Free Add subtitles to video", "免费给视频加字幕", { mode: "burn" }),
  tool("video-to-text", "video", "subtitles", "Free Video to text", "免费视频转文字", { mode: "speech" }),
  tool("speech-to-text", "video", "subtitles", "Free Speech to text", "免费语音转文字", { mode: "speech" }),
  tool("audio-to-text", "video", "subtitles", "Free Audio to text", "免费音频转文字", { mode: "speech" }),
  tool("chroma-key", "video", "green", "Free Chroma key", "免费色度抠像", { mode: "chroma" }),
  tool("pdf-to-png", "pdf", "pdf", "Free PDF to PNG", "免费 PDF 转 PNG", { mode: "to-image", format: "png" }),
  tool("jpg-to-pdf", "pdf", "pdf", "Free JPG to PDF", "免费 JPG 转 PDF", { mode: "from-image", accept: "image/jpeg" }),
  tool("png-to-pdf", "pdf", "pdf", "Free PNG to PDF", "免费 PNG 转 PDF", { mode: "from-image", accept: "image/png" }),
  tool("stl-to-3mf", "3d", "mesh", "Free STL to 3MF", "免费 STL 转 3MF", { mode: "convert", output: "3mf", accept: ".stl" }),
  tool("3mf-to-stl", "3d", "mesh", "Free 3MF to STL", "免费 3MF 转 STL", { mode: "convert", output: "stl", accept: ".3mf" }),
  tool("obj-to-stl", "3d", "mesh", "Free OBJ to STL", "免费 OBJ 转 STL", { mode: "convert", output: "stl", accept: ".obj" }),
  tool("stl-to-obj", "3d", "mesh", "Free STL to OBJ", "免费 STL 转 OBJ", { mode: "convert", output: "obj", accept: ".stl" }),
  tool("glb-to-obj", "3d", "mesh", "Free GLB to OBJ", "免费 GLB 转 OBJ", { mode: "convert", output: "obj", accept: ".glb,.gltf" }),
  tool("fbx-to-stl", "3d", "mesh", "Free FBX to STL", "免费 FBX 转 STL", { mode: "convert", output: "stl", accept: ".fbx" }),
  tool("obj-to-glb", "3d", "mesh", "Free OBJ to GLB", "免费 OBJ 转 GLB", { mode: "convert", output: "glb", accept: ".obj" }),
  tool("fbx-to-glb", "3d", "mesh", "Free FBX to GLB", "免费 FBX 转 GLB", { mode: "convert", output: "glb", accept: ".fbx" }),
  tool("step-to-stl", "3d", "mesh", "Free STEP to STL", "免费 STEP 转 STL", { mode: "convert", output: "stl", accept: ".step,.stp" }),
  tool("step-to-obj", "3d", "mesh", "Free STEP to OBJ", "免费 STEP 转 OBJ", { mode: "convert", output: "obj", accept: ".step,.stp" }),
  tool("stl-viewer", "3d", "mesh", "Free STL viewer", "免费 STL 查看器", { mode: "view", accept: ".stl" }),
  tool("glb-viewer", "3d", "mesh", "Free GLB viewer", "免费 GLB 查看器", { mode: "view", accept: ".glb,.gltf" }),
  tool("obj-viewer", "3d", "mesh", "Free OBJ viewer", "免费 OBJ 查看器", { mode: "view", accept: ".obj" }),
  tool("gltf-viewer", "3d", "mesh", "Free glTF viewer", "免费 glTF 查看器", { mode: "view", accept: ".gltf,.glb" }),
  tool("step-viewer", "3d", "mesh", "Free STEP viewer", "免费 STEP 查看器", { mode: "view", accept: ".step,.stp" }),
  tool("lithophane-maker", "3d", "relief", "Free Lithophane maker", "免费透光版", { mode: "lithophane" }),
  tool("png-to-stl", "3d", "relief", "Free PNG to STL", "免费 PNG 转 STL", { mode: "relief" }),
  tool("png-to-dxf", "3d", "dxf", "Free PNG to DXF", "免费 PNG 转 DXF", { mode: "image" }),
  tool("jpg-to-dxf", "3d", "dxf", "Free JPG to DXF", "免费 JPG 转 DXF", { mode: "image" }),
  tool("svg-to-dxf", "3d", "dxf", "Free SVG to DXF", "免费 SVG 转 DXF", { mode: "svg" }),
  tool("text-to-dxf", "3d", "dxf", "Free Text to DXF", "免费文字转 DXF", { mode: "text" }),
  tool("dxf-to-svg", "3d", "dxf", "Free DXF to SVG", "免费 DXF 转 SVG", { mode: "to-svg" }),
  tool("dxf-to-pdf", "3d", "dxf", "Free DXF to PDF", "免费 DXF 转 PDF", { mode: "to-pdf" }),
  tool("print-then-cut", "craft", "sticker", "Free Print then cut", "免费打印后切割", { mode: "print" }),
  tool("pixel-art-converter", "craft", "pattern", "Free Pixel art converter", "免费像素画", { mode: "pixel" }),
  tool("cross-stitch-pattern-generator", "craft", "pattern", "Free Cross-stitch pattern generator", "免费十字绣图纸", { mode: "cross" }),
  tool("diamond-painting-pattern-generator", "craft", "pattern", "Free Diamond painting pattern generator", "免费钻石画图纸", { mode: "diamond" }),
  tool("knitting-chart-generator", "craft", "pattern", "Free Knitting chart generator", "免费编织图", { mode: "knit" }),
  tool("quilt-pattern-generator", "craft", "pattern", "Free Quilt pattern generator", "免费拼布图", { mode: "quilt" }),
  tool("dither-image", "craft", "image", "Free Dither image", "免费抖动图像", { mode: "dither" }),
  tool("upc-barcode-generator", "codes", "barcode", "Free UPC barcode generator", "免费 UPC 条码", { format: "upca" }),
  tool("ean-13-barcode-generator", "codes", "barcode", "Free EAN-13 barcode generator", "免费 EAN-13 条码", { format: "ean13" }),
  tool("cursive-font-generator", "codes", "font", "Free Cursive font generator", "免费手写字体", { group: "cursive" }),
  tool("bold-text-generator", "codes", "font", "Free Bold text generator", "免费粗体字", { group: "bold" }),
  tool("tuner", "video", "audio-lab", "Free Online Tuner", "免费在线调音器", { mode: "tuner" }),
  tool("metronome", "video", "audio-lab", "Free Online Metronome", "免费在线节拍器", { mode: "metronome" }),
  tool("white-noise", "video", "audio-lab", "Free White Noise Generator", "免费白噪音", { mode: "white-noise" }),
  tool("text-to-speech", "video", "audio-lab", "Free Text to Speech", "免费文字转语音", { mode: "tts" }),
  tool("loudness-meter", "video", "audio-lab", "Free Loudness Meter", "免费响度计", { mode: "loudness" }),
  tool("lufs-meter", "video", "audio-lab", "Free LUFS meter", "免费 LUFS 响度", { mode: "lufs" }),
  tool("normalize-audio", "video", "audio-lab", "Free Normalize audio", "免费音频标准化", { mode: "normalize" }),
  tool("add-page-numbers-to-pdf", "pdf", "office", "Free Add page numbers to PDF", "免费给 PDF 加页码", { mode: "page-numbers" }),
  tool("bates-numbering", "pdf", "office", "Free Bates Numbering", "免费 Bates 编号", { mode: "bates" }),
  tool("black-out-text-in-pdf", "pdf", "office", "Free Black out text in PDF", "免费涂黑 PDF 文字", { mode: "blackout" }),
  tool("redact-pdf", "pdf", "office", "Free Redact PDF", "免费涂销 PDF", { mode: "redact" }),
  tool("remove-metadata-from-pdf", "pdf", "office", "Free Remove metadata from PDF", "免费清除 PDF 元数据", { mode: "metadata" }),
  tool("unlock-pdf", "pdf", "office", "Free Unlock PDF", "免费解锁 PDF", { mode: "unlock" }),
  tool("pdf-reader", "pdf", "office", "Free PDF Reader", "免费 PDF 阅读器", { mode: "reader" }),
  tool("pdf-to-text", "pdf", "office", "Free PDF to text", "免费 PDF 转文字", { mode: "to-text" }),
  tool("pdf-to-word", "pdf", "office", "Free PDF to Word", "免费 PDF 转 Word", { mode: "to-word" }),
  tool("pdf-to-excel", "pdf", "office", "Free PDF to Excel", "免费 PDF 转 Excel", { mode: "to-excel" }),
  tool("pdf-to-ppt", "pdf", "office", "Free PDF to PowerPoint", "免费 PDF 转 PowerPoint", { mode: "to-ppt" }),
  tool("pdf-to-pptx", "pdf", "office", "Free PDF to PPTX", "免费 PDF 转 PPTX", { mode: "to-pptx" }),
  tool("word-to-pdf", "pdf", "office", "Free Word to PDF", "免费 Word 转 PDF", { mode: "word-pdf" }),
  tool("docx-to-pdf", "pdf", "office", "Free DOCX to PDF", "免费 DOCX 转 PDF", { mode: "word-pdf" }),
  tool("excel-to-pdf", "pdf", "office", "Free Excel to PDF", "免费 Excel 转 PDF", { mode: "excel-pdf" }),
  tool("xlsx-to-pdf", "pdf", "office", "Free XLSX to PDF", "免费 XLSX 转 PDF", { mode: "excel-pdf" }),
  tool("html-to-pdf", "pdf", "office", "Free HTML to PDF", "免费 HTML 转 PDF", { mode: "html-pdf" }),
  tool("text-to-pdf", "pdf", "office", "Free Text to PDF", "免费文本转 PDF", { mode: "text-pdf" }),
  tool("csv-to-pdf", "pdf", "office", "Free CSV to PDF", "免费 CSV 转 PDF", { mode: "csv-pdf" }),
  tool("ocr", "pdf", "office", "Free OCR", "免费 OCR", { mode: "ocr" }),
  tool("image-to-text", "image", "office", "Free Image to text", "免费图片转文字", { mode: "ocr" }),
  tool("compare-pdf", "pdf", "office", "Free Compare PDF", "免费对比 PDF", { mode: "compare-pdf" }),
  tool("document-compare", "pdf", "office", "Free Compare Documents", "免费对比文档", { mode: "compare-doc" }),
  tool("compare-word-documents", "pdf", "office", "Free Compare Word documents", "免费对比 Word 文档", { mode: "compare-word" }),
  tool("pdf-imposition", "pdf", "office", "Free PDF Imposition", "免费 PDF 拼版", { mode: "imposition" }),
  tool("pdf-booklet-maker", "pdf", "office", "Free PDF booklet maker", "免费 PDF 小册子", { mode: "booklet" }),
  tool("n-up-pdf", "pdf", "office", "Free N-up PDF", "免费 N 合一 PDF", { mode: "nup" }),
  tool("business-card-imposition", "pdf", "office", "Free Business card imposition", "免费名片拼版", { mode: "cards" }),
  tool("bank-statement-converter", "pdf", "office", "Free Bank Statement Converter", "免费银行流水转换", { mode: "bank" }),
  tool("bank-statement-to-csv", "pdf", "office", "Free Bank statement to CSV", "免费银行流水转 CSV", { mode: "bank-csv" }),
  tool("pdf-bank-statement-to-excel", "pdf", "office", "Free Bank statement to Excel", "免费银行流水转 Excel", { mode: "bank-xlsx" }),
  tool("pdf-to-qbo", "pdf", "office", "Free PDF to QBO", "免费 PDF 转 QBO", { mode: "qbo" }),
  tool("gantt-chart-maker", "diagrams", "office", "Free Gantt Chart Maker", "免费甘特图", { mode: "gantt" }),
  tool("gantt-chart-template", "diagrams", "office", "Free Gantt chart templates", "免费甘特图模板", { mode: "gantt-template" }),
  tool("project-timeline-maker", "diagrams", "office", "Free Project timeline maker", "免费项目时间线", { mode: "timeline" }),
  tool("2048", "games", "game", "Free 2048", "免费 2048", { mode: "2048" }),
  tool("block-puzzle", "games", "game", "Free Block Puzzle", "免费方块", { mode: "blocks" }),
  tool("chess", "games", "game", "Free Chess", "免费国际象棋", { mode: "chess" }),
  tool("minesweeper", "games", "game", "Free Minesweeper", "免费扫雷", { mode: "mines" }),
  tool("periodic-table", "games", "game", "Free Periodic Table", "免费元素周期表", { mode: "periodic" }),
  tool("snake-game", "games", "game", "Free Snake Game", "免费贪吃蛇", { mode: "snake" }),
  tool("solitaire", "games", "game", "Free Solitaire", "免费纸牌", { mode: "solitaire" }),
  tool("keyboard-test", "devices", "device", "Free Keyboard Test", "免费键盘测试", { mode: "keyboard" }),
  tool("mouse-test", "devices", "device", "Free Mouse Test & CPS", "免费鼠标测试", { mode: "mouse" }),
  tool("screen-test", "devices", "device", "Free Dead Pixel Test", "免费坏点测试", { mode: "screen" }),
  tool("speaker-test", "devices", "device", "Free Speaker Test", "免费扬声器测试", { mode: "speaker" }),
  tool("mic-test", "devices", "device", "Free Mic Test", "免费麦克风测试", { mode: "mic" }),
  tool("webcam-test", "devices", "device", "Free Webcam Test", "免费摄像头测试", { mode: "webcam" }),
  tool("age-calculator", "everyday", "calc", "Free Age Calculator", "免费年龄计算", { mode: "age" }),
  tool("bmi-calculator", "everyday", "calc", "Free BMI Calculator", "免费 BMI 计算", { mode: "bmi" }),
  tool("date-calculator", "everyday", "calc", "Free Date calculator", "免费日期计算", { mode: "date" }),
  tool("gpa-calculator", "everyday", "calc", "Free GPA Calculator", "免费 GPA 计算", { mode: "gpa" }),
  tool("loan-calculator", "everyday", "calc", "Free Loan Calculator", "免费贷款计算", { mode: "loan" }),
  tool("mortgage-calculator", "everyday", "calc", "Free Mortgage calculator", "免费房贷计算", { mode: "mortgage" }),
  tool("percentage-calculator", "everyday", "calc", "Free Percentage Calculator", "免费百分比计算", { mode: "percentage" }),
  tool("scientific-calculator", "everyday", "calc", "Free Scientific Calculator", "免费科学计算器", { mode: "scientific" }),
  tool("dice-roller", "everyday", "calc", "Free Dice Roller", "免费掷骰子", { mode: "dice" }),
  tool("flip-a-coin", "everyday", "calc", "Free Flip a Coin", "免费抛硬币", { mode: "coin" }),
  tool("random-number-generator", "everyday", "calc", "Free Random Number Generator", "免费随机数", { mode: "random" }),
  tool("spin-the-wheel", "everyday", "calc", "Free Spin the Wheel", "免费转盘", { mode: "wheel" }),
  tool("online-timer", "everyday", "calc", "Free Online Timer", "免费在线计时器", { mode: "timer" }),
  tool("countdown-timer", "everyday", "calc", "Free Countdown timer", "免费倒计时", { mode: "countdown" }),
  tool("pomodoro-timer", "everyday", "calc", "Free Pomodoro Timer", "免费番茄钟", { mode: "pomodoro" }),
  tool("stopwatch", "everyday", "calc", "Free Online Stopwatch", "免费在线秒表", { mode: "stopwatch" }),
  tool("world-clock", "everyday", "calc", "Free World Clock", "免费世界时钟", { mode: "world" }),
  tool("data-explorer", "data", "geo", "Free Data Explorer", "免费数据浏览", { mode: "explore" }),
  tool("csv-viewer", "data", "office", "Free CSV viewer", "免费 CSV 查看", { mode: "csv-view" }),
  tool("excel-viewer", "data", "office", "Free Excel viewer", "免费 Excel 查看", { mode: "excel-view" }),
  tool("json-to-csv", "data", "office", "Free JSON to CSV", "免费 JSON 转 CSV", { mode: "json-csv" }),
  tool("csv-to-excel", "data", "office", "Free CSV to Excel", "免费 CSV 转 Excel", { mode: "csv-xlsx" }),
  tool("parquet-viewer", "data", "geo", "Free Parquet viewer", "免费 Parquet 查看", { mode: "parquet" }),
  tool("parquet-to-csv", "data", "geo", "Free Parquet to CSV", "免费 Parquet 转 CSV", { mode: "parquet-csv" }),
  tool("sqlite-viewer", "data", "geo", "Free SQLite viewer", "免费 SQLite 查看", { mode: "sqlite" }),
  tool("gis-viewer", "data", "geo", "Free GIS Viewer", "免费 GIS 查看", { mode: "gis" }),
  tool("kml-viewer", "data", "geo", "Free KML Viewer", "免费 KML 查看", { mode: "kml" }),
  tool("geojson-viewer", "data", "geo", "Free GeoJSON Viewer", "免费 GeoJSON 查看", { mode: "geojson" }),
  tool("gpx-viewer", "data", "geo", "Free GPX Viewer", "免费 GPX 查看", { mode: "gpx" }),
  tool("shapefile-viewer", "data", "geo", "Free Shapefile Viewer", "免费 Shapefile 查看", { mode: "shp" }),
  tool("kml-to-geojson", "data", "geo", "Free KML to GeoJSON", "免费 KML 转 GeoJSON", { mode: "kml-geo" }),
  tool("geojson-to-kml", "data", "geo", "Free GeoJSON to KML", "免费 GeoJSON 转 KML", { mode: "geo-kml" }),
  tool("gpx-to-kml", "data", "geo", "Free GPX to KML", "免费 GPX 转 KML", { mode: "gpx-kml" }),
  tool("kml-to-gpx", "data", "geo", "Free KML to GPX", "免费 KML 转 GPX", { mode: "kml-gpx" }),
  tool("shapefile-to-geojson", "data", "geo", "Free Shapefile to GeoJSON", "免费 Shapefile 转 GeoJSON", { mode: "shp-geo" }),
  tool("geojson-to-shapefile", "data", "geo", "Free GeoJSON to Shapefile", "免费 GeoJSON 转 Shapefile", { mode: "geo-shp" }),
  tool("dicom-viewer", "data", "geo", "Free DICOM Viewer", "免费 DICOM 查看", { mode: "dicom" }),
  tool("dicom-anonymizer", "data", "geo", "Free DICOM Anonymizer", "免费 DICOM 匿名化", { mode: "dicom-anon" }),
  tool("dicom-to-jpg", "data", "geo", "Free DICOM to JPG", "免费 DICOM 转 JPG", { mode: "dicom-jpg" }),
  tool("grammar-checker", "codes", "office", "Free Grammar Checker", "免费语法检查", { mode: "grammar" }),
  tool("diff-checker", "codes", "office", "Free Diff checker", "免费文本对比", { mode: "diff" }),
  tool("base64-encoder", "codes", "dev", "Free Base64 Encoder", "免费 Base64 编码", { mode: "base64", direction: "encode" }),
  tool("url-encoder", "codes", "dev", "Free URL Encoder", "免费 URL 编码", { mode: "url", direction: "encode" }),
  tool("html-entity-encoder", "codes", "dev", "Free HTML Entity Encoder", "免费 HTML 实体编码", { mode: "entity" }),
  tool("uuid-generator", "codes", "dev", "Free UUID Generator", "免费 UUID 生成器", { mode: "uuid" }),
  tool("hash-generator", "codes", "dev", "Free Hash Generator", "免费哈希生成器", { mode: "hash", algorithm: "SHA-256" }),
  tool("jwt-decoder", "codes", "dev", "Free JWT Decoder", "免费 JWT 解码", { mode: "jwt" }),
  tool("regex-tester", "codes", "dev", "Free Regex Tester", "免费正则测试", { mode: "regex" }),
  tool("case-converter", "codes", "dev", "Free Case Converter", "免费大小写转换", { mode: "case" }),
  tool("lorem-ipsum-generator", "codes", "dev", "Free Lorem Ipsum Generator", "免费 Lorem Ipsum 生成器", { mode: "lorem" }),
  tool("remove-duplicate-lines", "codes", "dev", "Free Remove Duplicate Lines", "免费删除重复行", { mode: "dedupe" }),
  tool("unix-timestamp-converter", "codes", "dev", "Free Unix Timestamp Converter", "免费时间戳转换", { mode: "timestamp" }),
  tool("cron-expression-generator", "codes", "dev", "Free Cron Expression Generator", "免费 Cron 表达式生成器", { mode: "cron" }),
  tool("number-base-converter", "codes", "dev", "Free Number Base Converter", "免费进制转换", { mode: "base" }),
  tool("yaml-to-json", "codes", "dev", "Free YAML to JSON", "免费 YAML 转 JSON", { mode: "yaml", direction: "yaml-json" }),
  tool("markdown-preview", "codes", "dev", "Free Markdown Preview", "免费 Markdown 预览", { mode: "markdown" }),
  tool("sql-formatter", "codes", "dev", "Free SQL Formatter", "免费 SQL 格式化", { mode: "sql" }),
  tool("base64-decode", "codes", "dev", "Free Base64 Decode", "免费 Base64 解码", { mode: "base64", direction: "decode" }),
  tool("url-decode", "codes", "dev", "Free URL Decode", "免费 URL 解码", { mode: "url", direction: "decode" }),
  tool("guid-generator", "codes", "dev", "Free GUID Generator", "免费 GUID 生成器", { mode: "uuid", style: "guid" }),
  tool("md5-generator", "codes", "dev", "Free MD5 Generator", "免费 MD5 生成器", { mode: "hash", algorithm: "MD5" }),
  tool("sha256-generator", "codes", "dev", "Free SHA256 Generator", "免费 SHA256 生成器", { mode: "hash", algorithm: "SHA-256" }),
  tool("uppercase-converter", "codes", "dev", "Free Uppercase Converter", "免费转大写", { mode: "case", case: "upper" }),
  tool("sort-lines-alphabetically", "codes", "dev", "Free Sort Lines Alphabetically", "免费按字母排序", { mode: "sort" }),
  tool("epoch-converter", "codes", "dev", "Free Epoch Converter", "免费 Epoch 转换", { mode: "timestamp" }),
  tool("binary-to-decimal", "codes", "dev", "Free Binary to Decimal", "免费二进制转十进制", { mode: "base", from: "2", to: "10" }),
  tool("hex-to-decimal", "codes", "dev", "Free Hex to Decimal", "免费十六进制转十进制", { mode: "base", from: "16", to: "10" }),
  tool("json-to-yaml", "codes", "dev", "Free JSON to YAML", "免费 JSON 转 YAML", { mode: "yaml", direction: "json-yaml" }),
  tool("markdown-to-html", "codes", "dev", "Free Markdown to HTML", "免费 Markdown 转 HTML", { mode: "markdown", output: "html" }),
  tool("unit-converter", "everyday", "unit", "Free Unit Converter", "免费单位换算", { mode: "unit" }),
  tool("kg-to-lbs", "everyday", "unit", "Free kg to lbs", "免费千克转磅", { mode: "unit", from: "kg", to: "lb" }),
  tool("cm-to-inches", "everyday", "unit", "Free cm to inches", "免费厘米转英寸", { mode: "unit", from: "cm", to: "in" }),
  tool("celsius-to-fahrenheit", "everyday", "unit", "Free Celsius to Fahrenheit", "免费摄氏度转华氏度", { mode: "unit", from: "c", to: "f", value: "25" }),
  tool("km-to-miles", "everyday", "unit", "Free km to miles", "免费公里转英里", { mode: "unit", from: "km", to: "mi", value: "10" }),
  tool("tip-calculator", "everyday", "calc", "Free Tip Calculator", "免费小费计算器", { mode: "tip" }),
  tool("discount-calculator", "everyday", "calc", "Free Discount Calculator", "免费折扣计算器", { mode: "discount" }),
  tool("compound-interest-calculator", "everyday", "calc", "Free Compound Interest Calculator", "免费复利计算器", { mode: "compound" }),
  tool("calorie-calculator", "everyday", "calc", "Free Calorie Calculator", "免费卡路里计算器", { mode: "calorie" }),
  tool("salary-calculator", "everyday", "calc", "Free Salary Calculator", "免费薪资换算", { mode: "salary" }),
  tool("roman-numeral-converter", "everyday", "calc", "Free Roman Numeral Converter", "免费罗马数字转换", { mode: "roman" }),
  tool("bmr-calculator", "everyday", "calc", "Free BMR Calculator", "免费基础代谢计算器", { mode: "bmr" }),
  tool("hourly-to-salary-calculator", "everyday", "calc", "Free Hourly to Salary Calculator", "免费时薪转年薪", { mode: "hourly" }),
  tool("color-palette-generator", "image", "color", "Free Color Palette Generator", "免费配色生成器", { mode: "palette" }),
  tool("color-converter", "image", "color", "Free Color Converter", "免费颜色转换", { mode: "convert" }),
  tool("hex-to-rgb", "image", "color", "Free HEX to RGB", "免费 HEX 转 RGB", { mode: "hex-rgb" }),
  tool("rgb-to-hex", "image", "color", "Free RGB to HEX", "免费 RGB 转 HEX", { mode: "rgb-hex" }),
  tool("favicon-generator", "image", "web-asset", "Free Favicon Generator", "免费网站图标生成器", { mode: "favicon" }),
  tool("image-to-base64", "image", "web-asset", "Free Image to Base64", "免费图片转 Base64", { mode: "base64-image" }),
  tool("svg-optimizer", "image", "web-asset", "Free SVG Optimizer", "免费 SVG 优化", { mode: "svg" }),
  tool("meme-generator", "image", "web-asset", "Free Meme Generator", "免费表情包生成器", { mode: "meme" }),
  tool("tic-tac-toe", "games", "game", "Free Tic Tac Toe", "免费井字棋", { mode: "tic-tac-toe" }),
  tool("memory-game", "games", "game", "Free Memory Game", "免费记忆翻牌", { mode: "memory" }),
  tool("reaction-time-test", "devices", "device", "Free Reaction Time Test", "免费反应速度测试", { mode: "reaction" }),
  tool("color-blind-test", "devices", "device", "Free Color Blind Test", "免费色盲测试", { mode: "color-blind" }),
  tool("gamepad-tester", "devices", "device", "Free Gamepad Tester", "免费手柄测试", { mode: "gamepad" }),
  tool("what-is-my-ip", "devices", "net", "Free What Is My IP", "免费查询我的 IP", { mode: "ip" }),
  tool("internet-speed-test", "devices", "net", "Free Internet Speed Test", "免费网速测试", { mode: "speed" }),
  tool("dns-lookup", "codes", "net", "Free DNS Lookup", "免费 DNS 查询", { mode: "dns" }),
  tool("currency-converter", "everyday", "net", "Free Currency Converter", "免费汇率换算", { mode: "currency" }),
];

export const FREE_TOOL_SHORTCUTS = [
  "vectorizer", "png-to-svg", "jpg-to-svg", "image-to-svg", "photo-editor", "image-editor", "photo-collage-maker", "heart-photo-collage", "instagram-story-collage", "photo-grid-maker", "passport-photo-maker", "visa-photo-maker", "video-compressor", "trim-video", "crop-video", "video-speed-changer", "mp4-to-mp3", "video-to-mp3", "remove-audio-from-video", "video-to-gif", "mp4-to-gif", "gif-maker", "boomerang-gif-maker", "slideshow-maker", "loudness-meter", "lufs-meter", "normalize-audio", "subtitle-generator", "add-subtitles-to-video", "speech-to-text", "video-to-text", "audio-to-text", "green-screen-video", "chroma-key", "document-compare", "compare-pdf", "compare-word-documents", "diff-checker", "word-to-pdf", "docx-to-pdf", "pdf-to-jpg", "pdf-to-png", "image-to-pdf", "jpg-to-pdf", "png-to-pdf", "ocr", "image-to-text", "bank-statement-converter", "pdf-bank-statement-to-excel", "bank-statement-to-csv", "pdf-to-qbo", "redact-pdf", "black-out-text-in-pdf", "remove-metadata-from-pdf", "bates-numbering", "add-page-numbers-to-pdf", "excel-to-pdf", "xlsx-to-pdf", "pdf-to-ppt", "pdf-to-pptx", "pdf-reader", "pdf-to-text", "pdf-imposition", "pdf-booklet-maker", "n-up-pdf", "business-card-imposition", "gantt-chart-maker", "project-timeline-maker", "gantt-chart-template", "loan-calculator", "mortgage-calculator", "age-calculator", "date-calculator", "online-timer", "countdown-timer", "data-explorer", "csv-viewer", "excel-viewer", "parquet-viewer", "sqlite-viewer", "json-to-csv", "csv-to-excel", "parquet-to-csv", "gis-viewer", "kml-viewer", "geojson-viewer", "gpx-viewer", "shapefile-viewer", "kml-to-geojson", "geojson-to-kml", "gpx-to-kml", "kml-to-gpx", "shapefile-to-geojson", "geojson-to-shapefile", "dicom-viewer", "dicom-anonymizer", "dicom-to-jpg", "glb-to-stl", "stl-to-3mf", "3mf-to-stl", "obj-to-stl", "stl-to-obj", "glb-to-obj", "fbx-to-stl", "obj-to-glb", "fbx-to-glb", "step-to-stl", "step-to-obj", "3d-model-viewer", "stl-viewer", "glb-viewer", "obj-viewer", "gltf-viewer", "step-viewer", "image-to-stl", "lithophane-maker", "png-to-stl", "image-to-dxf", "png-to-dxf", "jpg-to-dxf", "svg-to-dxf", "text-to-dxf", "dxf-viewer", "dxf-to-svg", "dxf-to-pdf", "sticker-maker", "print-then-cut", "perler-bead-pattern-maker", "pixel-art-converter", "cross-stitch-pattern-generator", "diamond-painting-pattern-generator", "knitting-chart-generator", "quilt-pattern-generator", "laser-engraving", "dither-image", "barcode-generator", "upc-barcode-generator", "ean-13-barcode-generator", "font-generator", "cursive-font-generator", "bold-text-generator", "base64-encoder", "base64-decode", "url-encoder", "url-decode", "uuid-generator", "guid-generator", "hash-generator", "md5-generator", "sha256-generator", "case-converter", "uppercase-converter", "remove-duplicate-lines", "sort-lines-alphabetically", "unix-timestamp-converter", "epoch-converter", "number-base-converter", "binary-to-decimal", "hex-to-decimal", "yaml-to-json", "json-to-yaml", "markdown-preview", "markdown-to-html", "unit-converter", "kg-to-lbs", "cm-to-inches", "celsius-to-fahrenheit", "km-to-miles", "calorie-calculator", "bmr-calculator", "salary-calculator", "hourly-to-salary-calculator", "color-converter", "hex-to-rgb", "rgb-to-hex",
];

const bySlug = new Map(FREE_TOOLS.map((item) => [item.slug, item]));

export function getFreeTool(slug: string) {
  return bySlug.get(slug);
}

export function relatedFreeTools(tool: FreeTool, count = 4) {
  return FREE_TOOLS.filter((item) => item.category === tool.category && item.slug !== tool.slug).slice(0, count);
}

export const IMAGE_PRESETS: Record<string, string> = {
  convert: "convert",
  compress: "compress",
  resize: "resize",
  upscale: "upscale",
  exif: "exif",
  watermark: "watermark",
  laser: "laser",
  dither: "dither",
};

const MODE_BY_SLUG: Record<string, string> = {
  "image-converter": "convert",
  "exif-remover": "exif",
  "image-compressor": "compress",
  "image-resizer": "resize",
  "image-upscaler": "upscale",
  "add-watermark": "watermark",
  "laser-engraving": "laser",
  "dither-image": "dither",
  "video-compressor": "compress",
  "video-converter": "convert",
  "video-upscaler": "upscale",
  "media-merger": "merge",
  "audio-converter": "audio-convert",
  "audio-trimmer": "audio-trim",
  "video-to-gif": "video-gif",
  "pdf-editor": "edit",
  "merge-pdf": "merge",
  "compress-pdf": "compress",
  "pdf-to-jpg": "to-image",
  "image-to-pdf": "from-image",
  "split-pdf": "split",
  "rotate-pdf": "rotate",
  "sign-pdf": "sign",
  "glb-to-stl": "convert",
  "3d-model-viewer": "view",
  "image-to-dxf": "image",
  "dxf-viewer": "view",
  "photo-collage-maker": "grid",
  "perler-bead-pattern-maker": "perler",
  "sticker-maker": "sticker",
  "gif-maker": "gif",
};

export function toolMode(tool: FreeTool) {
  return tool.preset.mode || tool.preset.layout || tool.preset.variant || tool.preset.format || tool.preset.group || MODE_BY_SLUG[tool.slug] || "default";
}
