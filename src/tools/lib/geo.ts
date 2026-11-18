export type GeoFeature = {
  name: string;
  kind: "Point" | "Line" | "Polygon";
  coordinates: number[][];
};

export function sampleFeatures(): GeoFeature[] {
  return [
    { name: "Pin", kind: "Point", coordinates: [[-122.42, 37.78]] },
    { name: "Path", kind: "Line", coordinates: [[-122.5, 37.7], [-122.3, 37.9]] },
    {
      name: "Block",
      kind: "Polygon",
      coordinates: [
        [-122.45, 37.75],
        [-122.4, 37.75],
        [-122.4, 37.8],
        [-122.45, 37.8],
        [-122.45, 37.75],
      ],
    },
  ];
}

function escapeXml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function pairs(text: string): number[][] {
  return text
    .trim()
    .split(/\s+/)
    .map((item) => item.split(",").map(Number))
    .filter((pair) => pair.length >= 2 && pair.every(Number.isFinite));
}

export function parseGeoJson(text: string): GeoFeature[] {
  const data = JSON.parse(text) as {
    type?: string;
    features?: { properties?: { name?: string }; geometry?: { type?: string; coordinates?: unknown } }[];
    geometry?: { type?: string; coordinates?: unknown };
    coordinates?: unknown;
    properties?: { name?: string };
  };
  const features = data.type === "FeatureCollection" ? data.features ?? [] : data.type === "Feature" ? [data] : [{ geometry: data, properties: data.properties }];
  const parsed: GeoFeature[] = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    const name = feature.properties?.name || "Feature";
    if (geometry?.type === "Point") parsed.push({ name, kind: "Point", coordinates: [geometry.coordinates as number[]] });
    if (geometry?.type === "LineString") parsed.push({ name, kind: "Line", coordinates: geometry.coordinates as number[][] });
    if (geometry?.type === "Polygon") parsed.push({ name, kind: "Polygon", coordinates: (geometry.coordinates as number[][][])[0] ?? [] });
  }
  return parsed;
}

export function toGeoJson(features: GeoFeature[]) {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: features.map((feature) => ({
        type: "Feature",
        properties: { name: feature.name },
        geometry:
          feature.kind === "Point"
            ? { type: "Point", coordinates: feature.coordinates[0] }
            : feature.kind === "Line"
              ? { type: "LineString", coordinates: feature.coordinates }
              : { type: "Polygon", coordinates: [feature.coordinates] },
      })),
    },
    null,
    2,
  );
}

export function toKml(features: GeoFeature[]) {
  const marks = features
    .map((feature) => {
      const coords = feature.coordinates.map((pair) => `${pair[0]},${pair[1]},0`).join(" ");
      const body =
        feature.kind === "Point"
          ? `<Point><coordinates>${coords}</coordinates></Point>`
          : feature.kind === "Line"
            ? `<LineString><coordinates>${coords}</coordinates></LineString>`
            : `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      return `<Placemark><name>${escapeXml(feature.name)}</name>${body}</Placemark>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${marks}</Document></kml>`;
}

export function parseKml(text: string): GeoFeature[] {
  const marks = text.match(/<Placemark>[\s\S]*?<\/Placemark>/g) ?? [];
  const parsed: GeoFeature[] = [];
  for (const mark of marks) {
    const name = mark.match(/<name>([^<]*)<\/name>/)?.[1] || "Feature";
    const point = mark.match(/<Point>[\s\S]*?<coordinates>([^<]*)<\/coordinates>/);
    const line = mark.match(/<LineString>[\s\S]*?<coordinates>([^<]*)<\/coordinates>/);
    const polygon = mark.match(/<LinearRing>[\s\S]*?<coordinates>([^<]*)<\/coordinates>/);
    if (point) parsed.push({ name, kind: "Point", coordinates: pairs(point[1]).slice(0, 1) });
    else if (line) parsed.push({ name, kind: "Line", coordinates: pairs(line[1]) });
    else if (polygon) parsed.push({ name, kind: "Polygon", coordinates: pairs(polygon[1]) });
  }
  return parsed;
}

export function toGpx(features: GeoFeature[]) {
  const points = features
    .filter((feature) => feature.kind === "Point")
    .map((feature) => `<wpt lat="${feature.coordinates[0][1]}" lon="${feature.coordinates[0][0]}"><name>${escapeXml(feature.name)}</name></wpt>`)
    .join("");
  const tracks = features
    .filter((feature) => feature.kind !== "Point")
    .map((feature) => {
      const pts = feature.coordinates.map((pair) => `<trkpt lat="${pair[1]}" lon="${pair[0]}"></trkpt>`).join("");
      return `<trk><name>${escapeXml(feature.name)}</name><trkseg>${pts}</trkseg></trk>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1">${points}${tracks}</gpx>`;
}

export function parseGpx(text: string): GeoFeature[] {
  const points = [...text.matchAll(/<wpt lat="([^"]+)" lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/g)].map((match) => ({
    name: match[3].match(/<name>([^<]*)<\/name>/)?.[1] || "Waypoint",
    kind: "Point" as const,
    coordinates: [[Number(match[2]), Number(match[1])]],
  }));
  const tracks = [...text.matchAll(/<trk>([\s\S]*?)<\/trk>/g)].map((match) => ({
    name: match[1].match(/<name>([^<]*)<\/name>/)?.[1] || "Track",
    kind: "Line" as const,
    coordinates: [...match[1].matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"/g)].map((point) => [Number(point[2]), Number(point[1])]),
  }));
  return [...points, ...tracks];
}

function shapeType(features: GeoFeature[]) {
  if (features.some((feature) => feature.kind === "Polygon")) return 5;
  if (features.some((feature) => feature.kind === "Line")) return 3;
  return 1;
}

function bounds(features: GeoFeature[]) {
  const coords = features.flatMap((feature) => feature.coordinates);
  const xs = coords.map((pair) => pair[0]);
  const ys = coords.map((pair) => pair[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function writeShapefile(features: GeoFeature[]) {
  const type = shapeType(features);
  const usable = features.filter((feature) => (type === 5 ? feature.kind === "Polygon" : type === 3 ? feature.kind === "Line" : feature.kind === "Point"));
  const records = usable.map((feature) => shapeRecord(type, feature.coordinates));
  const box = bounds(usable);
  const shp = shapeFile(type, box, records);
  const shx = indexFile(type, box, records);
  const dbf = dbfFile(usable.map((feature) => feature.name));
  return { shp, shx, dbf };
}

function shapeRecord(type: number, coordinates: number[][]) {
  const body = new DataView(new ArrayBuffer(type === 1 ? 20 : 44 + 4 + coordinates.length * 16));
  body.setInt32(0, type, true);
  if (type === 1) {
    body.setFloat64(4, coordinates[0][0], true);
    body.setFloat64(12, coordinates[0][1], true);
    return new Uint8Array(body.buffer);
  }
  const xs = coordinates.map((pair) => pair[0]);
  const ys = coordinates.map((pair) => pair[1]);
  body.setFloat64(4, Math.min(...xs), true);
  body.setFloat64(12, Math.min(...ys), true);
  body.setFloat64(20, Math.max(...xs), true);
  body.setFloat64(28, Math.max(...ys), true);
  body.setInt32(36, 1, true);
  body.setInt32(40, coordinates.length, true);
  body.setInt32(44, 0, true);
  coordinates.forEach((pair, index) => {
    body.setFloat64(48 + index * 16, pair[0], true);
    body.setFloat64(56 + index * 16, pair[1], true);
  });
  return new Uint8Array(body.buffer);
}

function shapeFile(type: number, box: number[], records: Uint8Array[]) {
  const content = records.reduce((sum, record) => sum + 8 + record.length, 0);
  const file = new Uint8Array(100 + content);
  const view = new DataView(file.buffer);
  view.setInt32(0, 9994, false);
  view.setInt32(24, (file.length / 2) | 0, false);
  view.setInt32(28, 1000, true);
  view.setInt32(32, type, true);
  box.forEach((value, index) => view.setFloat64(36 + index * 8, value, true));
  let offset = 100;
  records.forEach((record, index) => {
    view.setInt32(offset, index + 1, false);
    view.setInt32(offset + 4, record.length / 2, false);
    file.set(record, offset + 8);
    offset += 8 + record.length;
  });
  return file;
}

function indexFile(type: number, box: number[], records: Uint8Array[]) {
  const file = new Uint8Array(100 + records.length * 8);
  const view = new DataView(file.buffer);
  view.setInt32(0, 9994, false);
  view.setInt32(24, file.length / 2, false);
  view.setInt32(28, 1000, true);
  view.setInt32(32, type, true);
  box.forEach((value, index) => view.setFloat64(36 + index * 8, value, true));
  let word = 50;
  records.forEach((record, index) => {
    view.setInt32(100 + index * 8, word, false);
    view.setInt32(104 + index * 8, record.length / 2, false);
    word += 4 + record.length / 2;
  });
  return file;
}

function dbfFile(names: string[]) {
  const header = 32 + 32 + 1;
  const record = 1 + 32;
  const file = new Uint8Array(header + names.length * record + 1);
  const view = new DataView(file.buffer);
  file[0] = 3;
  view.setUint32(4, names.length, true);
  view.setUint16(8, header, true);
  view.setUint16(10, record, true);
  const field = new TextEncoder().encode("NAME");
  file.set(field, 32);
  file[32 + 11] = 67;
  file[32 + 16] = 32;
  file[header - 1] = 0x0d;
  const encoder = new TextEncoder();
  names.forEach((name, index) => {
    const start = header + index * record;
    file[start] = 0x20;
    const bytes = encoder.encode(name).subarray(0, 32);
    file.set(bytes, start + 1);
    for (let i = 1 + bytes.length; i < record; i += 1) file[start + i] = 0x20;
  });
  file[file.length - 1] = 0x1a;
  return file;
}

export function readShapefile(shp: Uint8Array): GeoFeature[] {
  const view = new DataView(shp.buffer, shp.byteOffset, shp.byteLength);
  const type = view.getInt32(32, true);
  const features: GeoFeature[] = [];
  let offset = 100;
  while (offset + 12 <= shp.length) {
    const words = view.getInt32(offset + 4, false);
    const record = shp.subarray(offset + 8, offset + 8 + words * 2);
    const recordView = new DataView(record.buffer, record.byteOffset, record.byteLength);
    const recordType = recordView.getInt32(0, true);
    if (recordType === 1) {
      features.push({ name: `Shape ${features.length + 1}`, kind: "Point", coordinates: [[recordView.getFloat64(4, true), recordView.getFloat64(12, true)]] });
    } else if (recordType === 3 || recordType === 5) {
      const count = recordView.getInt32(40, true);
      const coordinates: number[][] = [];
      for (let i = 0; i < count; i += 1) coordinates.push([recordView.getFloat64(48 + i * 16, true), recordView.getFloat64(56 + i * 16, true)]);
      features.push({ name: `Shape ${features.length + 1}`, kind: recordType === 5 ? "Polygon" : "Line", coordinates });
    }
    offset += 8 + words * 2;
    if (type === 0) break;
  }
  return features;
}

export function readDbfNames(dbf: Uint8Array) {
  const view = new DataView(dbf.buffer, dbf.byteOffset, dbf.byteLength);
  const count = view.getUint32(4, true);
  const header = view.getUint16(8, true);
  const record = view.getUint16(10, true);
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = header + index * record + 1;
    names.push(new TextDecoder().decode(dbf.subarray(start, start + 32)).replace(/\0/g, "").trim());
  }
  return names;
}
