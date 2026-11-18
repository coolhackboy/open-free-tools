import { useMemo, useState } from "react";
import bwipjs from "bwip-js";
import type { FreeTool } from "@/tools/catalog";
import { ActionButton, Field, SelectInput, TextInput, ToolPanel, downloadText, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

/* Own module so bwip-js (~800 kB) only loads on the barcode pages. */
export function BarcodeTool({ tool, locale }: Props) {
  const initial = tool.preset.format || "code128";
  const [format, setFormat] = useState(initial);
  const [text, setText] = useState(initial === "upca" ? "03600029145" : initial === "ean13" ? "590123412345" : "ACME-123");
  const svg = useMemo(() => {
    try {
      return bwipjs.toSVG({ bcid: format, text, includetext: true, scale: 3, height: 12 });
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid barcode";
    }
  }, [format, text]);
  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Symbology", "码制")}>
          <SelectInput value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="code128">Code 128</option>
            <option value="ean13">EAN-13</option>
            <option value="upca">UPC-A</option>
            <option value="itf14">ITF-14</option>
            <option value="datamatrix">Data Matrix</option>
            <option value="code39">Code 39</option>
          </SelectInput>
        </Field>
        <Field label={tx(locale, "Text", "内容")}><TextInput value={text} onChange={(event) => setText(event.target.value)} /></Field>
      </div>
      {svg.startsWith("<svg") ? <div className="max-w-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-sm text-destructive">{svg}</p>}
      {svg.startsWith("<svg") ? <ActionButton type="button" onClick={() => downloadText(svg, "barcode.svg", "image/svg+xml")}>SVG</ActionButton> : null}
    </ToolPanel>
  );
}
