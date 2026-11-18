import { useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { anonymizeDicom, parseDicom, sampleDicom } from "@/tools/lib/dicom";
import {
  parseGeoJson,
  parseGpx,
  parseKml,
  readDbfNames,
  readShapefile,
  sampleFeatures,
  toGeoJson,
  toGpx,
  toKml,
  writeShapefile,
  type GeoFeature,
} from "@/tools/lib/geo";
import { createStoredZip } from "@/tools/lib/zip";
import { unzip } from "@/tools/lib/unzip";
import { parseCsv, toCsv } from "@/tools/lib/sheets";
import { ActionButton, DropZone, ResultText, ToolPanel, canvasToBlob, downloadBytes, downloadText, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

let sqlitePromise: Promise<void> | null = null;

function draw(canvas: HTMLCanvasElement, features: GeoFeature[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#f4f2ec";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const coords = features.flatMap((feature) => feature.coordinates);
  if (!coords.length) return;
  const xs = coords.map((pair) => pair[0]);
  const ys = coords.map((pair) => pair[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const project = (pair: number[]) => [(pair[0] - minX) / spanX * (canvas.width - 40) + 20, canvas.height - ((pair[1] - minY) / spanY * (canvas.height - 40) + 20)];
  context.strokeStyle = "#111";
  context.fillStyle = "#d4ff00";
  context.lineWidth = 2;
  features.forEach((feature) => {
    const points = feature.coordinates.map(project);
    if (feature.kind === "Point") {
      context.beginPath();
      context.arc(points[0][0], points[0][1], 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      return;
    }
    context.beginPath();
    points.forEach((point, index) => (index ? context.lineTo(point[0], point[1]) : context.moveTo(point[0], point[1])));
    if (feature.kind === "Polygon") context.fill();
    context.stroke();
  });
}

async function readFeatures(file: File): Promise<GeoFeature[]> {
  const text = await file.text();
  if (file.name.endsWith(".kml") || text.includes("<kml")) return parseKml(text);
  if (file.name.endsWith(".gpx") || text.includes("<gpx")) return parseGpx(text);
  if (file.name.endsWith(".zip") || file.name.endsWith(".shp")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (file.name.endsWith(".shp")) return readShapefile(bytes);
    const files = await unzip(bytes);
    const shp = [...files.entries()].find(([name]) => name.endsWith(".shp"))?.[1];
    const dbf = [...files.entries()].find(([name]) => name.endsWith(".dbf"))?.[1];
    if (!shp) throw new Error("The zip needs a .shp file.");
    const features = readShapefile(shp);
    if (dbf) {
      const names = readDbfNames(dbf);
      features.forEach((feature, index) => {
        if (names[index]) feature.name = names[index];
      });
    }
    return features;
  }
  return parseGeoJson(text);
}

export function GeoTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState("");
  const [table, setTable] = useState<string[][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function run() {
    const features = files[0] && !mode.startsWith("dicom") && mode !== "parquet" && mode !== "parquet-csv" && mode !== "sqlite" && mode !== "explore"
      ? await readFeatures(files[0])
      : sampleFeatures();
    const paint = () => {
      if (canvasRef.current) draw(canvasRef.current, features);
    };
    if (mode === "geo-kml" || mode === "gpx-kml") {
      const kml = toKml(features);
      downloadText(kml, "map.kml", "application/vnd.google-earth.kml+xml");
      paint();
      setResult(`${features.length} ${features.length === 1 ? "feature" : "features"} · map.kml`);
      return;
    }
    if (mode === "kml-gpx" || mode === "gpx") {
      const gpx = toGpx(mode === "gpx" && files[0] ? features : features);
      if (mode === "kml-gpx") downloadText(gpx, "track.gpx", "application/gpx+xml");
      paint();
      setResult(mode === "kml-gpx" ? `${features.length} ${features.length === 1 ? "feature" : "features"} · track.gpx` : `${features.length} ${features.length === 1 ? "feature" : "features"}`);
      return;
    }
    if (mode === "kml-geo" || mode === "shp-geo" || mode === "geojson") {
      const converted = mode === "shp-geo" && !files[0]
        ? readShapefile(writeShapefile(sampleFeatures().filter((feature) => feature.kind === "Polygon")).shp)
        : features;
      const json = toGeoJson(converted);
      if (mode !== "geojson") downloadText(json, "map.geojson", "application/geo+json");
      if (canvasRef.current) draw(canvasRef.current, converted);
      setResult(`${converted.length} ${converted.length === 1 ? "feature" : "features"}`);
      return;
    }
    if (mode === "geo-shp") {
      const written = writeShapefile(features.filter((feature) => feature.kind === "Polygon").length ? features.filter((feature) => feature.kind === "Polygon") : features);
      const zip = createStoredZip([
        { name: "map.shp", data: written.shp },
        { name: "map.shx", data: written.shx },
        { name: "map.dbf", data: written.dbf },
      ]);
      downloadBytes(zip, "map.zip", "application/zip");
      paint();
      setResult(`${written.shp.byteLength} byte shapefile · map.zip`);
      return;
    }
    if (mode === "gis" || mode === "kml" || mode === "shp") {
      const shown = mode === "kml" ? parseKml(toKml(features)) : mode === "shp" ? readShapefile(writeShapefile(features.filter((item) => item.kind === "Polygon")).shp) : features;
      if (canvasRef.current) draw(canvasRef.current, shown);
      setResult(`${shown.length} ${shown.length === 1 ? "feature" : "features"}`);
      return;
    }
    if (mode === "dicom" || mode === "dicom-anon" || mode === "dicom-jpg") {
      const bytes = files[0] ? new Uint8Array(await files[0].arrayBuffer()) : sampleDicom();
      const image = parseDicom(mode === "dicom-anon" ? anonymizeDicom(bytes) : bytes);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = image.cols;
        canvas.height = image.rows;
        const context = canvas.getContext("2d");
        if (context) {
          const pixels = context.createImageData(image.cols, image.rows);
          for (let i = 0; i < image.pixels.length; i += 1) {
            pixels.data[i * 4] = image.pixels[i];
            pixels.data[i * 4 + 1] = image.pixels[i];
            pixels.data[i * 4 + 2] = image.pixels[i];
            pixels.data[i * 4 + 3] = 255;
          }
          context.putImageData(pixels, 0, 0);
        }
      }
      if (mode === "dicom-anon") {
        const clean = anonymizeDicom(bytes);
        downloadBytes(clean, "anonymized.dcm", "application/dicom");
        setResult(`Patient ${parseDicom(clean).patientName}`);
        return;
      }
      if (mode === "dicom-jpg" && canvas) {
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        downloadBytes(new Uint8Array(await blob.arrayBuffer()), "dicom.jpg", "image/jpeg");
        setResult(`dicom.jpg · ${image.cols}×${image.rows}`);
        return;
      }
      setResult(`${image.patientName} · ${image.cols}×${image.rows}`);
      return;
    }
    if (mode === "parquet" || mode === "parquet-csv") {
      const { parquetReadObjects } = await import("hyparquet");
      const { parquetWriteBuffer } = await import("hyparquet-writer");
      const buffer = files[0]
        ? await files[0].arrayBuffer()
        : parquetWriteBuffer({ codec: "UNCOMPRESSED", columnData: [{ name: "name", data: ["Ada", "Lin"], type: "STRING" }, { name: "n", data: [1, 2], type: "INT32" }] });
      const rows = await parquetReadObjects({ file: buffer });
      const header = Object.keys(rows[0] ?? {});
      const tableRows = [header, ...rows.map((row) => header.map((key) => String(row[key] ?? "")))];
      setTable(tableRows);
      if (mode === "parquet-csv") {
        downloadText(toCsv(tableRows), "data.csv", "text/csv");
        setResult(`${rows.length} rows · data.csv`);
        return;
      }
      setResult(`${rows.length} rows · ${header.length} columns`);
      return;
    }
    if (mode === "sqlite") {
      sqlitePromise ??= new Promise<void>((resolve, reject) => {
        if ((window as unknown as { initSqlJs?: unknown }).initSqlJs) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not load the SQLite engine."));
        document.body.appendChild(script);
      });
      await sqlitePromise;
      const initSqlJs = (window as unknown as { initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<{ Database: new (data?: Uint8Array) => { exec: (sql: string) => { columns: string[]; values: unknown[][] }[] } }> }).initSqlJs;
      const SQL = await initSqlJs({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/${file}` });
      const database = files[0] ? new SQL.Database(new Uint8Array(await files[0].arrayBuffer())) : new SQL.Database();
      if (!files[0]) {
        database.exec("CREATE TABLE people (name, n)");
        database.exec("INSERT INTO people VALUES ('Ada', 1), ('Lin', 2)");
      }
      const query = database.exec("SELECT name, n FROM people");
      const header = query[0]?.columns ?? [];
      const values = query[0]?.values ?? [];
      setTable([header, ...values.map((row) => row.map((value) => String(value ?? "")))]);
      setResult(`${values.length} rows · ${header.join(", ")}`);
      return;
    }
    const csv = files[0] ? await files[0].text() : "name,amount\nAda,12\nLin,7";
    const rows = files[0]?.name.endsWith(".json") ? JSON.parse(csv) : parseCsv(csv);
    const tableRows = Array.isArray(rows) && rows.length && !Array.isArray(rows[0])
      ? [["value"], ...(rows as unknown[]).map((row) => [JSON.stringify(row)])]
      : (rows as string[][]);
    setTable(tableRows);
    const numbers = tableRows.slice(1).map((row) => Number(row[1])).filter((value) => Number.isFinite(value));
    const total = numbers.reduce((sum, value) => sum + value, 0);
    setResult(`${Math.max(0, tableRows.length - 1)} rows · ${tableRows[0]?.length ?? 0} columns · sum ${total}`);
  }

  const mapped = mode === "dicom" || mode === "dicom-anon" || mode === "dicom-jpg" || mode === "gis" || mode === "kml" || mode === "geojson" || mode === "gpx" || mode === "shp" || mode.endsWith("kml") || mode.endsWith("geo") || mode.endsWith("gpx") || mode.endsWith("shp");
  return (
    <ToolPanel>
      <DropZone
        label={tx(locale, "Drop a file, or run the sample", "拖入文件，或直接运行示例")}
        accept={mode.startsWith("dicom") ? ".dcm,application/dicom" : mode === "sqlite" ? ".sqlite,.db" : mode.startsWith("parquet") ? ".parquet" : ".geojson,.json,.kml,.gpx,.zip,.shp,.csv"}
        onFiles={setFiles}
      />
      {mapped ? <canvas ref={canvasRef} width={360} height={220} className="w-full rounded-lg border border-border bg-[#f4f2ec]" /> : null}
      <ActionButton data-action="run" onClick={() => void run().catch((error: unknown) => setResult(error instanceof Error ? error.message : "Could not finish."))}>{tx(locale, "Run", "运行")}</ActionButton>
      {table.length ? (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <tbody>{table.slice(0, 8).map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-border px-2 py-1">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : null}
      <ResultText>{result}</ResultText>
    </ToolPanel>
  );
}
