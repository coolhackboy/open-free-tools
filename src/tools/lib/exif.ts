export type ExifTag = { label: string; value: string };

const TAGS: Record<number, string> = {
  271: "Camera make",
  272: "Camera model",
  274: "Orientation",
  305: "Software",
  306: "Date",
  315: "Artist",
  33432: "Copyright",
  34853: "GPS",
};

const GPS_TAGS: Record<number, string> = {
  1: "Latitude ref",
  2: "Latitude",
  3: "Longitude ref",
  4: "Longitude",
  5: "Altitude ref",
  6: "Altitude",
};

function ascii(bytes: Uint8Array, start: number, length: number) {
  return new TextDecoder("latin1").decode(bytes.subarray(start, start + length)).replace(/\0+$/g, "");
}

function readExifValue(view: DataView, offset: number, type: number, count: number, little: boolean): string {
  const size = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] ?? 1;
  const total = size * count;
  const valueOffset = total > 4 ? view.getUint32(offset + 8, little) + 12 : offset + 8;
  if (type === 2) return ascii(new Uint8Array(view.buffer, view.byteOffset), valueOffset, count).trim();
  if (type === 5 && count >= 1 && valueOffset + 8 <= view.byteLength) {
    const parts = [];
    for (let i = 0; i < Math.min(count, 4); i += 1) {
      const num = view.getUint32(valueOffset + i * 8, little);
      const den = view.getUint32(valueOffset + i * 8 + 4, little) || 1;
      parts.push((num / den).toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));
    }
    return parts.join(", ");
  }
  if ((type === 3 || type === 4) && valueOffset + size <= view.byteLength) {
    return String(type === 3 ? view.getUint16(valueOffset, little) : view.getUint32(valueOffset, little));
  }
  return "";
}

function readIfd(view: DataView, ifdOffset: number, little: boolean, tags: Record<number, string>, base = 0): ExifTag[] {
  if (ifdOffset < 8 || ifdOffset + 2 > view.byteLength) return [];
  const count = view.getUint16(ifdOffset, little);
  const found: ExifTag[] = [];
  for (let i = 0; i < count; i += 1) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const length = view.getUint32(entry + 4, little);
    const label = tags[tag];
    if (!label) continue;
    if (tag === 34853) {
      const pointer = view.getUint32(entry + 8, little);
      found.push(...readIfd(view, base + pointer, little, GPS_TAGS, base));
      continue;
    }
    const value = readExifValue(view, entry, type, length, little);
    if (value) found.push({ label, value });
  }
  return found;
}

export function readJpegExif(bytes: Uint8Array): ExifTag[] {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return [];
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1 && offset + 14 < bytes.length && ascii(bytes, offset + 4, 4) === "Exif") {
      const tiff = offset + 10;
      if (tiff + 8 > bytes.length) return [];
      const little = bytes[tiff] === 0x49;
      const view = new DataView(bytes.buffer, bytes.byteOffset + tiff, bytes.length - tiff);
      try {
        const ifd = view.getUint32(4, little);
        return readIfd(view, ifd, little, TAGS);
      } catch {
        return [];
      }
    }
    offset += 2 + size;
  }
  return [];
}

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      parts.push(bytes.subarray(offset));
      break;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xda) {
      parts.push(bytes.subarray(offset));
      break;
    }
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const drop = marker === 0xe1 || marker === 0xe2 || marker === 0xed || marker === 0xfe;
    if (!drop) parts.push(bytes.subarray(offset, offset + 2 + size));
    offset += 2 + size;
  }
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

export function readPngText(bytes: Uint8Array): ExifTag[] {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value)) return [];
  const tags: ExifTag[] = [];
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    if (type === "tEXt") {
      const data = ascii(bytes, offset + 8, length);
      const split = data.indexOf("\0");
      tags.push({ label: split >= 0 ? data.slice(0, split) : "Text", value: data.slice(split + 1) });
    } else if (type === "eXIf") {
      tags.push({ label: "EXIF", value: "Embedded EXIF chunk" });
    }
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return tags;
}

export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value)) return bytes;
  const keep = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP"]);
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (keep.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === "IEND") break;
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

export function scanSignals(bytes: Uint8Array, needles: string[]): string[] {
  const text = ascii(bytes, 0, Math.min(bytes.length, 2_000_000)).toLowerCase();
  return needles.filter((needle) => text.includes(needle.toLowerCase()));
}
