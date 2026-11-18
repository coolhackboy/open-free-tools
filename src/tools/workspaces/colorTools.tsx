import { useMemo, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ActionButton, DropZone, Field, TextInput, ToolPanel, canvasFromImage, downloadText, fileToImage, imageDataOf, sampleCanvas, tx } from "@/tools/controls";
import { Segmented } from "@/tools/workspaces/devShared";
import { contrastRatio, formatHsl, formatRgb, harmonies, medianCut, parseColor, rgbToCmyk, rgbToHsv, toHex, type Rgb } from "@/tools/lib/color";

type Props = { tool: FreeTool; locale: string };

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}

function Swatch({ hex, label, locale }: { hex: string; label?: string; locale: string }) {
  const rgb = parseColor(hex);
  const dark = contrastRatio(rgb, { r: 0, g: 0, b: 0 }) > contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  return (
    <button
      type="button"
      onClick={() => copy(hex)}
      title={tx(locale, "Copy", "复制")}
      className="flex min-h-24 flex-1 basis-24 flex-col justify-end rounded-lg border border-border p-2 text-left font-mono text-xs"
      style={{ background: hex, color: dark ? "#111" : "#fff" }}
      data-swatch={hex}
    >
      {label ? <span className="opacity-80">{label}</span> : null}
      <span className="font-semibold">{hex.toUpperCase()}</span>
    </button>
  );
}

/* Palette ---------------------------------------------------------------- */

function PaletteTool({ locale }: { locale: string }) {
  const [source, setSource] = useState<"image" | "color">("image");
  const [count, setCount] = useState(6);
  const [colors, setColors] = useState<{ hex: string; share: number }[]>([]);
  const [base, setBase] = useState("#3d6df2");
  const [error, setError] = useState("");

  function extract(canvas: HTMLCanvasElement) {
    const data = imageDataOf(canvas).data;
    setColors(medianCut(data, count).map((item) => ({ hex: toHex(item.rgb), share: item.share })));
  }

  async function fromFile(file: File) {
    try {
      const image = await fileToImage(file);
      const scale = Math.min(1, 200 / Math.max(image.naturalWidth, image.naturalHeight));
      extract(canvasFromImage(image, image.naturalWidth * scale, image.naturalHeight * scale));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  const harmony = useMemo(() => {
    try {
      return harmonies(parseColor(base));
    } catch {
      return null;
    }
  }, [base]);

  const list = source === "image" ? colors.map((item) => item.hex) : harmony ? [...harmony.analogous, harmony.complementary[1]] : [];
  const css = list.map((hex, index) => `  --color-${index + 1}: ${hex};`).join("\n");

  return (
    <>
      <Segmented label={tx(locale, "Source", "来源")} value={source} options={[["image", tx(locale, "From an image", "从图片提取")], ["color", tx(locale, "From one color", "从一个颜色生成")]]} onChange={setSource} />
      {source === "image" ? (
        <>
          <DropZone label={tx(locale, "Drop an image to extract its colors", "拖入图片提取配色")} accept="image/*" onFiles={(files) => files[0] && void fromFile(files[0])} />
          <div className="flex flex-wrap items-end gap-3">
            <Field label={tx(locale, "Colors", "颜色数")}>
              <TextInput type="number" min={2} max={12} value={count} onChange={(event) => setCount(Math.max(2, Math.min(12, Number(event.target.value) || 6)))} />
            </Field>
            <ActionButton type="button" tone="quiet" onClick={() => extract(sampleCanvas())}>{tx(locale, "Try a sample image", "用示例图片试试")}</ActionButton>
          </div>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          {colors.length ? (
            <div className="flex flex-wrap gap-2">
              {colors.map((item) => <Swatch key={item.hex} hex={item.hex} label={`${Math.round(item.share * 100)}%`} locale={locale} />)}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={tx(locale, "Base color", "基础颜色")}>
              <input type="color" className="h-10 w-20 rounded-md border border-input" value={/^#[0-9a-f]{6}$/i.test(base) ? base : "#3d6df2"} onChange={(event) => setBase(event.target.value)} />
            </Field>
            <Field label="HEX"><TextInput className="font-mono" value={base} onChange={(event) => setBase(event.target.value)} /></Field>
          </div>
          {harmony ? (
            <div className="space-y-3">
              {([
                ["analogous", tx(locale, "Analogous", "邻近色")],
                ["complementary", tx(locale, "Complementary", "互补色")],
                ["triadic", tx(locale, "Triadic", "三角色")],
                ["shades", tx(locale, "Shades", "明暗阶梯")],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <p className="mb-1 text-sm font-medium">{label}</p>
                  <div className="flex flex-wrap gap-2">{harmony[key].map((hex, index) => <Swatch key={`${hex}-${index}`} hex={hex} locale={locale} />)}</div>
                </div>
              ))}
            </div>
          ) : <p role="alert" className="text-sm text-red-600">{tx(locale, "Enter a valid color.", "请输入有效的颜色。")}</p>}
        </>
      )}
      {list.length ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton type="button" tone="quiet" onClick={() => copy(list.join(", "))}>{tx(locale, "Copy HEX list", "复制 HEX 列表")}</ActionButton>
          <ActionButton type="button" tone="quiet" onClick={() => copy(`:root {\n${css}\n}`)}>{tx(locale, "Copy CSS variables", "复制 CSS 变量")}</ActionButton>
          <ActionButton type="button" onClick={() => downloadText(JSON.stringify(list, null, 2), "palette.json", "application/json")}>{tx(locale, "Download JSON", "下载 JSON")}</ActionButton>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "Click a swatch to copy its HEX code. Images are read in this tab and never uploaded.", "点击色块即可复制 HEX。图片只在当前页面读取，不会上传。")}</p>
    </>
  );
}

/* Converter -------------------------------------------------------------- */

const CONVERTER_SAMPLES: Record<string, string> = {
  "hex-rgb": "#1E90FF",
  "rgb-hex": "rgb(30, 144, 255)",
  convert: "#3D6DF2",
};

function ConverterTool({ locale, mode }: { locale: string; mode: string }) {
  const [input, setInput] = useState(CONVERTER_SAMPLES[mode] ?? "#3D6DF2");
  const parsed = useMemo<{ rgb?: Rgb; error?: string }>(() => {
    try {
      return { rgb: parseColor(input) };
    } catch (reason) {
      return { error: reason instanceof Error ? reason.message : String(reason) };
    }
  }, [input]);
  const rgb = parsed.rgb;
  const rows: [string, string][] = rgb
    ? [
        ["HEX", toHex(rgb, true)],
        ["RGB", formatRgb(rgb)],
        ["HSL", formatHsl(rgb)],
        ["HSV", (({ h, s, v }) => `hsv(${h}, ${s}%, ${v}%)`)(rgbToHsv(rgb))],
        ["CMYK", (({ c, m, y, k }) => `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`)(rgbToCmyk(rgb))],
        [tx(locale, "CSS rgb() modern", "CSS 新写法"), `rgb(${rgb.r} ${rgb.g} ${rgb.b}${rgb.a !== undefined && rgb.a < 1 ? ` / ${rgb.a}` : ""})`],
      ]
    : [];
  const first = mode === "hex-rgb" ? "RGB" : mode === "rgb-hex" ? "HEX" : "";
  rows.sort((a, b) => (a[0] === first ? -1 : b[0] === first ? 1 : 0));
  const hex = rgb ? toHex({ ...rgb, a: undefined }) : "#000000";
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={mode === "rgb-hex" ? tx(locale, "RGB color", "RGB 颜色") : mode === "hex-rgb" ? tx(locale, "HEX color", "HEX 颜色") : tx(locale, "Any color (HEX, RGB or HSL)", "任意颜色（HEX、RGB 或 HSL）")}>
          <TextInput className="font-mono text-base" value={input} onChange={(event) => setInput(event.target.value)} />
        </Field>
        <Field label={tx(locale, "Picker", "取色")}>
          <input type="color" className="h-10 w-20 rounded-md border border-input" value={hex} onChange={(event) => setInput(event.target.value.toUpperCase())} />
        </Field>
      </div>
      {parsed.error ? <p role="alert" className="text-sm font-medium text-red-600">{parsed.error}</p> : null}
      {rgb ? (
        <>
          <div className="h-20 rounded-lg border border-border" style={{ background: formatRgb(rgb) }} aria-hidden="true" />
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(([label, value], index) => (
              <div key={label} className={["rounded-md border p-3", index === 0 && first ? "border-accent-ink" : "border-border"].join(" ")}>
                <dt className="flex items-center justify-between text-xs text-muted-foreground">
                  {label}
                  <button type="button" className="font-semibold text-primary" onClick={() => copy(value)}>{tx(locale, "Copy", "复制")}</button>
                </dt>
                <dd className="font-mono text-sm" data-color={label}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm">
            {tx(locale, "Contrast on white", "白底对比度")} {contrastRatio(rgb, { r: 255, g: 255, b: 255 }).toFixed(2)}:1 ·{" "}
            {tx(locale, "on black", "黑底对比度")} {contrastRatio(rgb, { r: 0, g: 0, b: 0 }).toFixed(2)}:1
            <span className="text-muted-foreground"> {tx(locale, "(WCAG AA body text needs 4.5:1)", "（WCAG AA 正文需要 4.5:1）")}</span>
          </p>
        </>
      ) : null}
    </>
  );
}

export function ColorTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  return <ToolPanel>{mode === "palette" ? <PaletteTool locale={locale} /> : <ConverterTool locale={locale} mode={mode} />}</ToolPanel>;
}
