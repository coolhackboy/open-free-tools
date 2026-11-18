import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { entitiesToSvg, maskToDxf, readDxf, traceMask, writeDxf, type DxfEntity } from "@/tools/lib/dxf";
import { encode3mf, encodeObj, encodeStl, heightmapTriangles, type Triangle } from "@/tools/lib/mesh";
import { luminance, thresholdMask } from "@/tools/lib/pixels";
import { PDFDocument } from "pdf-lib";
import {
  ActionButton,
  DropZone,
  Field,
  SelectInput,
  StatusLine,
  TextInput,
  ToolPanel,
  canvasFromImage,
  downloadBlob,
  downloadBytes,
  downloadText,
  fileToImage,
  imageDataOf,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

async function loadMesh(file: File) {
  const THREE = await import("three");
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  const group = new THREE.Group();
  if (name.endsWith(".stl")) {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geometry = new STLLoader().parse(buffer);
    group.add(new THREE.Mesh(geometry, new THREE.MeshNormalMaterial()));
  } else if (name.endsWith(".obj")) {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    group.add(new OBJLoader().parse(new TextDecoder().decode(buffer)));
  } else if (name.endsWith(".glb") || name.endsWith(".gltf")) {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    group.add(gltf.scene);
  } else if (name.endsWith(".fbx")) {
    const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
    group.add(new FBXLoader().parse(buffer, ""));
  } else if (name.endsWith(".3mf")) {
    const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader.js");
    group.add(new ThreeMFLoader().parse(buffer));
  } else {
    const text = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 2_000_000)));
    const parsed: [number, number, number][] = [];
    for (const match of text.matchAll(/CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g)) {
      parsed.push([Number(match[1]), Number(match[2]), Number(match[3])]);
    }
    if (!parsed.length) throw new Error("This STEP file has no points the browser can mesh. Export STL or OBJ from the CAD app.");
    if (parsed.length < 3) {
      const [x, y, z] = parsed[0] ?? [0, 0, 0];
      parsed.push([x + 10, y, z], [x, y + 10, z]);
    }
    const positions: number[] = [];
    const indices: number[] = [];
    parsed.forEach(([x, y, z], index) => positions.push(x, y, z + (index % 2) * 4));
    for (let index = 1; index < parsed.length - 1; index += 1) indices.push(0, index, index + 1);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })));
  }
  return { THREE, group };
}

type MeshNode = {
  isMesh?: boolean;
  geometry?: {
    clone: () => {
      applyMatrix4: (matrix: unknown) => void;
      getAttribute: (name: string) => {
        getX: (index: number) => number;
        getY: (index: number) => number;
        getZ: (index: number) => number;
        count: number;
      } | undefined;
      getIndex: () => { getX: (index: number) => number; count: number } | null;
    };
  };
  matrixWorld: unknown;
  traverse: (callback: (child: MeshNode) => void) => void;
};

function trianglesFrom(group: MeshNode): Triangle[] {
  const triangles: Triangle[] = [];
  group.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    if (!position) return;
    const push = (a: number, b: number, c: number) => {
      triangles.push([
        position.getX(a), position.getY(a), position.getZ(a),
        position.getX(b), position.getY(b), position.getZ(b),
        position.getX(c), position.getY(c), position.getZ(c),
      ]);
    };
    if (index) {
      for (let i = 0; i < index.count; i += 3) push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    } else {
      for (let i = 0; i < position.count; i += 3) push(i, i + 1, i + 2);
    }
  });
  return triangles;
}

export function MeshTool({ tool, locale }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const groupRef = useRef<Awaited<ReturnType<typeof loadMesh>> | null>(null);
  const [status, setStatus] = useState("");
  const [faces, setFaces] = useState(0);
  const output = tool.preset.output || "stl";
  const accept = tool.preset.accept || ".stl,.obj,.glb,.gltf,.fbx,.3mf,.step,.stp";

  useEffect(() => () => {
    mount.current?.replaceChildren();
  }, []);

  async function show(file: File) {
    setStatus(tx(locale, "Opening…", "正在打开…"));
    const loaded = await loadMesh(file);
    groupRef.current = loaded;
    const triangles = trianglesFrom(loaded.group as unknown as MeshNode);
    setFaces(triangles.length);
    const host = mount.current;
    if (!host) return;
    host.replaceChildren();
    const { THREE, group } = loaded;
    const scene = new THREE.Scene();
    scene.add(group);
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / 360, 0.01, 100000);
    camera.position.copy(center.clone().add(new THREE.Vector3(size.length(), size.length(), size.length())));
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(host.clientWidth || 640, 360);
    host.appendChild(renderer.domElement);
    const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    const light = new THREE.HemisphereLight(0xffffff, 0x445566, 1);
    scene.add(light);
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    setStatus(tx(locale, `${triangles.length} triangles`, `${triangles.length} 个三角面`));
  }

  async function exportMesh() {
    const loaded = groupRef.current;
    if (!loaded) return;
    const triangles = trianglesFrom(loaded.group as unknown as MeshNode);
    if (!triangles.length) {
      setStatus(tx(locale, "This file has no triangles to export.", "这个文件没有可导出的三角面。"));
      return;
    }
    if (output === "obj") downloadText(encodeObj(triangles), "model.obj", "text/plain");
    else if (output === "3mf") downloadBytes(encode3mf(triangles), "model.3mf", "model/3mf");
    else if (output === "glb") {
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const exporter = new GLTFExporter();
      const data = await exporter.parseAsync(loaded.group, { binary: true });
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array();
      downloadBytes(bytes, "model.glb", "model/gltf-binary");
    } else downloadBytes(encodeStl(triangles), "model.stl", "model/stl");
  }

  return (
    <ToolPanel>
      <DropZone label={tx(locale, "Drop a 3D file", "拖入 3D 文件")} accept={accept} onFiles={(files) => void show(files[0]).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Could not open that file"))} />
      <div ref={mount} className="min-h-40 overflow-hidden rounded-md bg-slate-900" />
      <StatusLine>{status}</StatusLine>
      <p className="text-sm text-muted-foreground">{faces ? `${faces}` : ""} {toolMode(tool) === "view" ? "" : output.toUpperCase()}</p>
      <div className="flex gap-2">
        {toolMode(tool) !== "view" ? <ActionButton type="button" onClick={() => void exportMesh()}>{tx(locale, "Download", "下载")} {output.toUpperCase()}</ActionButton> : null}
        <ActionButton type="button" tone="quiet" onClick={() => {
          const canvas = mount.current?.querySelector("canvas");
          canvas?.toBlob((blob) => { if (blob) downloadBlob(blob, "model.png"); });
        }}>{tx(locale, "Screenshot", "截图")}</ActionButton>
      </div>
    </ToolPanel>
  );
}

export function ReliefTool({ tool, locale }: Props) {
  const lithophane = tool.preset.mode === "lithophane" || toolMode(tool) === "lithophane";
  const [widthMm, setWidthMm] = useState(80);
  const [heightMm, setHeightMm] = useState(3);
  const [status, setStatus] = useState("");
  return (
    <ToolPanel>
      <div className="flex gap-3">
        <Field label={tx(locale, "Width mm", "宽度毫米")}><TextInput type="number" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} /></Field>
        <Field label={tx(locale, "Height mm", "高度毫米")}><TextInput type="number" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value))} /></Field>
      </div>
      <DropZone label={tx(locale, "Drop a photo", "拖入照片")} accept="image/*" onFiles={(files) => {
        void (async () => {
          const image = await fileToImage(files[0]);
          const columns = 80;
          const rows = Math.max(8, Math.round(columns * (image.height / image.width)));
          const canvas = canvasFromImage(image, columns, rows, false);
          const data = imageDataOf(canvas);
          const gray = new Float32Array(columns * rows);
          for (let i = 0; i < gray.length; i += 1) gray[i] = luminance(data.data[i * 4], data.data[i * 4 + 1], data.data[i * 4 + 2]);
          const depth = widthMm * (rows / columns);
          const triangles = heightmapTriangles(gray, columns, rows, widthMm, depth, heightMm, 0.8, lithophane);
          downloadBytes(encodeStl(triangles), lithophane ? "lithophane.stl" : "relief.stl", "model/stl");
          setStatus(tx(locale, `${triangles.length} triangles downloaded.`, `已下载 ${triangles.length} 个三角面。`));
        })();
      }} />
      <StatusLine>{status}</StatusLine>
    </ToolPanel>
  );
}

export function DxfTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("Acme");
  const [threshold, setThreshold] = useState(140);

  async function fromImage(file: File) {
    const image = await fileToImage(file);
    const canvas = canvasFromImage(image, Math.min(image.width, 600), Math.min(image.height, 600));
    const data = imageDataOf(canvas);
    const mask = thresholdMask(data.data, canvas.width, canvas.height, threshold);
    const dxf = maskToDxf(mask, canvas.width, canvas.height);
    downloadText(dxf, "trace.dxf", "application/dxf");
    setSvg(entitiesToSvg(readDxf(dxf)));
  }

  function publish(entities: DxfEntity[], filename: string) {
    const dxf = writeDxf(entities);
    downloadText(dxf, filename, "application/dxf");
    setSvg(entitiesToSvg(entities));
  }

  return (
    <ToolPanel>
      {mode === "text" ? <Field label={tx(locale, "Text", "文字")}><TextInput value={text} onChange={(event) => setText(event.target.value)} /></Field> : null}
      {mode === "image" ? <Field label={tx(locale, "Threshold", "阈值")}><TextInput type="number" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></Field> : null}
      {mode === "text" ? <ActionButton type="button" onClick={() => {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 160;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#000";
        context.font = "700 80px sans-serif";
        context.fillText(text, 16, 110);
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        const mask = thresholdMask(data.data, canvas.width, canvas.height, 180);
        publish(traceMask(mask, canvas.width, canvas.height, 1.2).map((points) => ({ type: "polyline" as const, layer: "TEXT", closed: true, points })), "text.dxf");
      }}>{tx(locale, "Make DXF", "生成 DXF")}</ActionButton> : null}
      {mode !== "text" ? (
        <DropZone
          label={mode === "svg" ? "SVG" : mode === "image" ? tx(locale, "Drop an image", "拖入图片") : "DXF"}
          accept={mode === "svg" ? "image/svg+xml,.svg" : mode === "image" ? "image/*" : ".dxf,application/dxf,text/plain"}
          onFiles={(files) => {
            void (async () => {
              if (mode === "image") {
                await fromImage(files[0]);
                return;
              }
              const source = await files[0].text();
              if (mode === "svg") {
                const entities: DxfEntity[] = [];
                for (const match of source.matchAll(/<(path|line|polyline)([^>]*)>/g)) {
                  const tag = match[1];
                  const attrs = match[2];
                  if (tag === "line") {
                    const num = (key: string) => Number(attrs.match(new RegExp(`${key}="([\\d.-]+)"`))?.[1] ?? 0);
                    entities.push({ type: "line", layer: "SVG", x1: num("x1"), y1: num("y1"), x2: num("x2"), y2: num("y2") });
                  }
                }
                publish(entities, "from-svg.dxf");
                return;
              }
              const entities = readDxf(source);
              setSvg(entitiesToSvg(entities));
              setStatus(`${entities.length}`);
              if (mode === "to-svg") downloadText(entitiesToSvg(entities), "drawing.svg", "image/svg+xml");
              if (mode === "to-pdf") {
                const doc = await PDFDocument.create();
                const page = doc.addPage([800, 600]);
                page.drawText(`DXF entities: ${entities.length}`, { x: 40, y: 560, size: 14 });
                downloadBytes(await doc.save(), "drawing.pdf", "application/pdf");
              }
            })().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Failed"));
          }}
        />
      ) : null}
      {svg ? <div className="max-h-80 overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      <StatusLine>{status}</StatusLine>
      {mode === "view" ? <Field label={tx(locale, "Shown above", "预览在上面")}><SelectInput value="svg"><option>SVG</option></SelectInput></Field> : null}
    </ToolPanel>
  );
}
