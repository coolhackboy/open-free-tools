export type DxfEntity =
  | { type: "line"; layer: string; x1: number; y1: number; x2: number; y2: number }
  | { type: "polyline"; layer: string; points: [number, number][]; closed: boolean }
  | { type: "circle"; layer: string; cx: number; cy: number; r: number }
  | { type: "text"; layer: string; x: number; y: number; text: string };

export function writeDxf(entities: DxfEntity[]): string {
  const lines = ["0", "SECTION", "2", "ENTITIES"];
  for (const entity of entities) {
    if (entity.type === "line") {
      lines.push("0", "LINE", "8", entity.layer, "10", String(entity.x1), "20", String(entity.y1), "11", String(entity.x2), "21", String(entity.y2));
    } else if (entity.type === "polyline") {
      lines.push("0", "LWPOLYLINE", "8", entity.layer, "90", String(entity.points.length), "70", entity.closed ? "1" : "0");
      for (const [x, y] of entity.points) lines.push("10", String(x), "20", String(y));
    } else if (entity.type === "circle") {
      lines.push("0", "CIRCLE", "8", entity.layer, "10", String(entity.cx), "20", String(entity.cy), "40", String(entity.r));
    } else {
      lines.push("0", "TEXT", "8", entity.layer, "10", String(entity.x), "20", String(entity.y), "40", "8", "1", entity.text);
    }
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

export function readDxf(source: string): DxfEntity[] {
  const rows = source.replace(/\r/g, "").split("\n").map((row) => row.trim());
  const entities: DxfEntity[] = [];
  let index = 0;
  const pairs: [string, string][] = [];
  while (index + 1 < rows.length) {
    pairs.push([rows[index], rows[index + 1]]);
    index += 2;
  }
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i][0] !== "0") continue;
    const kind = pairs[i][1];
    if (!["LINE", "LWPOLYLINE", "CIRCLE", "TEXT"].includes(kind)) continue;
    const data: Record<string, string[]> = {};
    let j = i + 1;
    for (; j < pairs.length; j += 1) {
      if (pairs[j][0] === "0") break;
      data[pairs[j][0]] ??= [];
      data[pairs[j][0]].push(pairs[j][1]);
    }
    const layer = data["8"]?.[0] ?? "0";
    const num = (code: string, nth = 0) => Number(data[code]?.[nth] ?? 0);
    if (kind === "LINE") {
      entities.push({ type: "line", layer, x1: num("10"), y1: num("20"), x2: num("11"), y2: num("21") });
    } else if (kind === "CIRCLE") {
      entities.push({ type: "circle", layer, cx: num("10"), cy: num("20"), r: num("40") });
    } else if (kind === "TEXT") {
      entities.push({ type: "text", layer, x: num("10"), y: num("20"), text: data["1"]?.[0] ?? "" });
    } else {
      const xs = data["10"] ?? [];
      const ys = data["20"] ?? [];
      entities.push({
        type: "polyline",
        layer,
        closed: data["70"]?.[0] === "1",
        points: xs.map((x, point) => [Number(x), Number(ys[point] ?? 0)]),
      });
    }
    i = j - 1;
  }
  return entities;
}

export function entitiesToSvg(entities: DxfEntity[], padding = 8): string {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const entity of entities) {
    if (entity.type === "line") {
      xs.push(entity.x1, entity.x2);
      ys.push(entity.y1, entity.y2);
    }
    if (entity.type === "polyline") entity.points.forEach(([x, y]) => { xs.push(x); ys.push(y); });
    if (entity.type === "circle") {
      xs.push(entity.cx - entity.r, entity.cx + entity.r);
      ys.push(entity.cy - entity.r, entity.cy + entity.r);
    }
    if (entity.type === "text") {
      xs.push(entity.x);
      ys.push(entity.y);
    }
  }
  if (!xs.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"></svg>`;
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const width = Math.max(1, Math.max(...xs) - minX + padding);
  const height = Math.max(1, Math.max(...ys) - minY + padding);
  const body = entities.map((entity) => {
    if (entity.type === "line") {
      return `<line x1="${entity.x1 - minX}" y1="${height - (entity.y1 - minY)}" x2="${entity.x2 - minX}" y2="${height - (entity.y2 - minY)}" stroke="#111" fill="none"/>`;
    }
    if (entity.type === "polyline") {
      const points = entity.points.map(([x, y]) => `${x - minX},${height - (y - minY)}`).join(" ");
      return `<polyline points="${points}" stroke="#111" fill="none" ${entity.closed ? "" : ""}/>`;
    }
    if (entity.type === "circle") {
      return `<circle cx="${entity.cx - minX}" cy="${height - (entity.cy - minY)}" r="${entity.r}" stroke="#111" fill="none"/>`;
    }
    return `<text x="${entity.x - minX}" y="${height - (entity.y - minY)}" font-size="12" fill="#111">${entity.text.replace(/[&<>]/g, "")}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
}

export type Point = [number, number];

function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  const dx = ex - sx;
  const dy = ey - sy;
  const length = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = Math.abs(dy * points[i][0] - dx * points[i][1] + ex * sy - ey * sx) / length;
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  if (max > epsilon) {
    return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
  }
  return [points[0], points[points.length - 1]];
}

export function traceMask(mask: Uint8Array, width: number, height: number, epsilon = 1.4): Point[][] {
  const seen = new Uint8Array(mask.length);
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const contours: Point[][] = [];
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] > 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || seen[start] || filled(x - 1, y)) continue;
      const points: Point[] = [];
      let cx = x;
      let cy = y;
      let dir = 0;
      let guard = 0;
      do {
        points.push([cx, cy]);
        seen[cy * width + cx] = 1;
        let found = false;
        for (let turn = 0; turn < 8; turn += 1) {
          const next = (dir + turn) % 8;
          const nx = cx + dirs[next][0];
          const ny = cy + dirs[next][1];
          if (!filled(nx, ny)) continue;
          cx = nx;
          cy = ny;
          dir = (next + 6) % 8;
          found = true;
          break;
        }
        if (!found) break;
        guard += 1;
      } while ((cx !== x || cy !== y) && guard < width * height);
      if (points.length > 12) contours.push(simplify(points, epsilon));
      if (contours.length > 80) return contours;
    }
  }
  return contours;
}

export function maskToDxf(mask: Uint8Array, width: number, height: number, scale = 1): string {
  const entities: DxfEntity[] = traceMask(mask, width, height).map((points) => ({
    type: "polyline" as const,
    layer: "CUT",
    closed: true,
    points: points.map(([x, y]) => [x * scale, (height - y) * scale] as Point),
  }));
  return writeDxf(entities);
}

export function contoursToSvg(contours: Point[][], width: number, height: number, fill = "#111111"): string {
  const paths = contours.map((points) => {
    const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
    return `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${paths}</svg>`;
}
