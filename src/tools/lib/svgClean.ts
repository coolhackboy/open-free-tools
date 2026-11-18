/**
 * Lightweight SVG cleanup done with string rules (no DOM), so it also runs in the check script.
 * It removes what editors add and browsers ignore; it does not rewrite paths.
 */

export type SvgCleanOptions = {
  removeComments?: boolean;
  removeMetadata?: boolean;
  removeEditorData?: boolean;
  removeScripts?: boolean;
  precision?: number | null;
  collapseWhitespace?: boolean;
};

const DEFAULTS: Required<SvgCleanOptions> = {
  removeComments: true,
  removeMetadata: true,
  removeEditorData: true,
  removeScripts: true,
  precision: 3,
  collapseWhitespace: true,
};

const EDITOR_NS = ["inkscape", "sodipodi", "sketch", "figma", "serif", "illustrator"];

export function cleanSvg(source: string, options: SvgCleanOptions = {}) {
  const opt = { ...DEFAULTS, ...options };
  let svg = source.replace(/^\uFEFF/, "");
  if (!/<svg[\s>]/i.test(svg)) throw new Error("This does not look like an SVG file.");
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  if (opt.removeComments) svg = svg.replace(/<!--[\s\S]*?-->/g, "");
  if (opt.removeMetadata) {
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, "").replace(/<desc>\s*Created with[\s\S]*?<\/desc>/gi, "");
  }
  if (opt.removeScripts) {
    svg = svg
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<script[^>]*\/>/gi, "")
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
      .replace(/(href\s*=\s*)("|')\s*javascript:[^"']*\2/gi, '$1$2#$2');
  }
  if (opt.removeEditorData) {
    for (const ns of EDITOR_NS) {
      const prefix = ns.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      svg = svg
        .replace(new RegExp(`<${prefix}:[a-z-]+[^>]*/>`, "gi"), "")
        .replace(new RegExp(`<${prefix}:([a-z-]+)[^>]*>[\\s\\S]*?</${prefix}:\\1>`, "gi"), "")
        .replace(new RegExp(`\\s${prefix}:[a-z-]+\\s*=\\s*("[^"]*"|'[^']*')`, "gi"), "")
        .replace(new RegExp(`\\sxmlns:${prefix}\\s*=\\s*("[^"]*"|'[^']*')`, "gi"), "");
    }
    svg = svg.replace(/\s(data-name|enable-background|xml:space)\s*=\s*("[^"]*"|'[^']*')/gi, "");
    svg = svg.replace(/<defs>\s*<\/defs>/gi, "").replace(/<g>\s*<\/g>/gi, "");
  }
  if (opt.precision !== null) {
    const digits = Math.max(1, Math.min(8, opt.precision));
    svg = svg.replace(/(\s(?:d|points|transform|viewBox|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|stroke-width|offset)\s*=\s*")([^"]*)"/gi, (_, lead: string, value: string) =>
      `${lead}${value.replace(/-?\d*\.\d+(?:e-?\d+)?/gi, (number: string, offset: number, whole: string) => {
        const rounded = String(Number(Number(number).toFixed(digits))).replace(/^(-?)0\./, "$1.");
        // "1.5.5" means 1.5 and .5; if rounding drops the decimal point, keep the numbers apart.
        const next = whole[offset + number.length];
        return !rounded.includes(".") && (next === "." || (next !== undefined && /\d/.test(next))) ? `${rounded} ` : rounded;
      })}"`,
    );
  }
  if (opt.collapseWhitespace) {
    svg = svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").replace(/\s+\/>/g, "/>").trim();
  }
  return svg;
}

export function byteSize(text: string) {
  return new TextEncoder().encode(text).length;
}
