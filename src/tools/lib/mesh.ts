import { createZip } from "@/tools/lib/zip";

export type Triangle = [number, number, number, number, number, number, number, number, number];

export function heightmapTriangles(
  gray: Float32Array,
  columns: number,
  rows: number,
  widthMm: number,
  depthMm: number,
  maxHeight: number,
  base: number,
  invert = false,
): Triangle[] {
  const zAt = (x: number, y: number) => {
    const value = gray[y * columns + x] / 255;
    const height = (invert ? 1 - value : value) * maxHeight;
    return base + height;
  };
  const triangles: Triangle[] = [];
  const vx = (x: number) => (x / (columns - 1)) * widthMm;
  const vy = (y: number) => (y / (rows - 1)) * depthMm;
  for (let y = 0; y < rows - 1; y += 1) {
    for (let x = 0; x < columns - 1; x += 1) {
      const x0 = vx(x);
      const x1 = vx(x + 1);
      const y0 = vy(y);
      const y1 = vy(y + 1);
      triangles.push([x0, y0, zAt(x, y), x1, y0, zAt(x + 1, y), x1, y1, zAt(x + 1, y + 1)]);
      triangles.push([x0, y0, zAt(x, y), x1, y1, zAt(x + 1, y + 1), x0, y1, zAt(x, y + 1)]);
      triangles.push([x0, y0, 0, x1, y1, 0, x1, y0, 0]);
      triangles.push([x0, y0, 0, x0, y1, 0, x1, y1, 0]);
    }
  }
  for (let x = 0; x < columns - 1; x += 1) {
    triangles.push([vx(x), 0, 0, vx(x + 1), 0, 0, vx(x + 1), 0, zAt(x + 1, 0)]);
    triangles.push([vx(x), 0, 0, vx(x + 1), 0, zAt(x + 1, 0), vx(x), 0, zAt(x, 0)]);
    triangles.push([vx(x), depthMm, 0, vx(x), depthMm, zAt(x, rows - 1), vx(x + 1), depthMm, zAt(x + 1, rows - 1)]);
    triangles.push([vx(x), depthMm, 0, vx(x + 1), depthMm, zAt(x + 1, rows - 1), vx(x + 1), depthMm, 0]);
  }
  for (let y = 0; y < rows - 1; y += 1) {
    triangles.push([0, vy(y), 0, 0, vy(y), zAt(0, y), 0, vy(y + 1), zAt(0, y + 1)]);
    triangles.push([0, vy(y), 0, 0, vy(y + 1), zAt(0, y + 1), 0, vy(y + 1), 0]);
    triangles.push([widthMm, vy(y), 0, widthMm, vy(y + 1), 0, widthMm, vy(y + 1), zAt(columns - 1, y + 1)]);
    triangles.push([widthMm, vy(y), 0, widthMm, vy(y + 1), zAt(columns - 1, y + 1), widthMm, vy(y), zAt(columns - 1, y)]);
  }
  return triangles;
}

export function encodeStl(triangles: Triangle[]): Uint8Array {
  const out = new Uint8Array(84 + triangles.length * 50);
  const view = new DataView(out.buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((triangle, index) => {
    const offset = 84 + index * 50;
    const [x1, y1, z1, x2, y2, z2, x3, y3, z3] = triangle;
    const ux = x2 - x1;
    const uy = y2 - y1;
    const uz = z2 - z1;
    const vx = x3 - x1;
    const vy = y3 - y1;
    const vz = z3 - z1;
    view.setFloat32(offset, uy * vz - uz * vy, true);
    view.setFloat32(offset + 4, uz * vx - ux * vz, true);
    view.setFloat32(offset + 8, ux * vy - uy * vx, true);
    [x1, y1, z1, x2, y2, z2, x3, y3, z3].forEach((value, vertex) => {
      view.setFloat32(offset + 12 + vertex * 4, value, true);
    });
  });
  return out;
}

export function encode3mf(triangles: Triangle[]): Uint8Array {
  const vertices = new Map<string, number>();
  const points: string[] = [];
  const faces: string[] = [];
  const idOf = (x: number, y: number, z: number) => {
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    const existing = vertices.get(key);
    if (existing !== undefined) return existing;
    const id = vertices.size;
    vertices.set(key, id);
    points.push(`<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}"/>`);
    return id;
  };
  for (const [x1, y1, z1, x2, y2, z2, x3, y3, z3] of triangles) {
    faces.push(`<triangle v1="${idOf(x1, y1, z1)}" v2="${idOf(x2, y2, z2)}" v3="${idOf(x3, y3, z3)}"/>`);
  }
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources><object id="1" type="model"><mesh><vertices>${points.join("")}</vertices><triangles>${faces.join("")}</triangles></mesh></object></resources>
  <build><item objectid="1"/></build>
</model>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  const encoder = new TextEncoder();
  return createZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "3D/3dmodel.model", data: encoder.encode(model) },
  ]);
}

export function encodeObj(triangles: Triangle[]): string {
  const vertices: string[] = [];
  const faces: string[] = [];
  triangles.forEach(([x1, y1, z1, x2, y2, z2, x3, y3, z3], index) => {
    vertices.push(`v ${x1} ${y1} ${z1}`, `v ${x2} ${y2} ${z2}`, `v ${x3} ${y3} ${z3}`);
    const base = index * 3 + 1;
    faces.push(`f ${base} ${base + 1} ${base + 2}`);
  });
  return `${vertices.join("\n")}\n${faces.join("\n")}\n`;
}

export function readBinaryStl(bytes: Uint8Array): Triangle[] {
  if (bytes.length < 84) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (84 + count * 50 > bytes.length) return [];
  const triangles: Triangle[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = 84 + i * 50 + 12;
    triangles.push(Array.from({ length: 9 }, (_, index) => view.getFloat32(offset + index * 4, true)) as Triangle);
  }
  return triangles;
}
