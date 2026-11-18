export type DicomImage = {
  patientName: string;
  patientId: string;
  rows: number;
  cols: number;
  pixels: Uint8Array;
};

const SHORT_VR = new Set(["AE", "AS", "AT", "CS", "DA", "DS", "DT", "FL", "FD", "IS", "LO", "LT", "PN", "SH", "SL", "SS", "ST", "TM", "UI", "UL", "US"]);

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function pad(value: string, nul: boolean) {
  const raw = new TextEncoder().encode(value);
  if (raw.length % 2 === 0) return raw;
  const out = new Uint8Array(raw.length + 1);
  out.set(raw);
  out[raw.length] = nul ? 0 : 0x20;
  return out;
}

function element(group: number, el: number, vr: string, value: Uint8Array) {
  const head = concat([u16(group), u16(el), new TextEncoder().encode(vr)]);
  if (SHORT_VR.has(vr)) return concat([head, u16(value.length), value]);
  return concat([head, u16(0), u32(value.length), value]);
}

function textElement(group: number, el: number, vr: string, value: string) {
  return element(group, el, vr, pad(value, vr === "UI"));
}

export function sampleDicom(): Uint8Array {
  const pixels = new Uint8Array(64);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = i * 4;
  const metaBody = concat([
    textElement(0x0002, 0x0002, "UI", "1.2.840.10008.5.1.4.1.1.7"),
    textElement(0x0002, 0x0003, "UI", "1.2.3.4.5"),
    textElement(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1"),
    textElement(0x0002, 0x0012, "UI", "1.2.3.4"),
  ]);
  const meta = concat([element(0x0002, 0x0000, "UL", u32(metaBody.length)), metaBody]);
  const dataset = concat([
    textElement(0x0008, 0x0016, "UI", "1.2.840.10008.5.1.4.1.1.7"),
    textElement(0x0010, 0x0010, "PN", "TEST^PATIENT"),
    textElement(0x0010, 0x0020, "LO", "P001"),
    textElement(0x0028, 0x0004, "CS", "MONOCHROME2"),
    element(0x0028, 0x0010, "US", u16(8)),
    element(0x0028, 0x0011, "US", u16(8)),
    element(0x0028, 0x0100, "US", u16(8)),
    element(0x0028, 0x0101, "US", u16(8)),
    element(0x0028, 0x0102, "US", u16(7)),
    element(0x0028, 0x0103, "US", u16(0)),
    element(0x7fe0, 0x0010, "OB", pixels),
  ]);
  return concat([new Uint8Array(128), new TextEncoder().encode("DICM"), meta, dataset]);
}

function readElement(data: Uint8Array, offset: number, explicit: boolean) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const group = view.getUint16(offset, true);
  const el = view.getUint16(offset + 2, true);
  if (!explicit) {
    const length = view.getUint32(offset + 4, true);
    return { group, el, vr: "", valueStart: offset + 8, length, next: offset + 8 + length };
  }
  const vr = new TextDecoder().decode(data.subarray(offset + 4, offset + 6));
  if (!SHORT_VR.has(vr)) {
    const length = view.getUint32(offset + 8, true);
    return { group, el, vr, valueStart: offset + 12, length, next: offset + 12 + length };
  }
  const length = view.getUint16(offset + 6, true);
  return { group, el, vr, valueStart: offset + 8, length, next: offset + 8 + length };
}

export function parseDicom(data: Uint8Array): DicomImage {
  const magic = new TextDecoder().decode(data.subarray(128, 132));
  if (magic !== "DICM") throw new Error("This file does not start with a DICOM header.");
  let offset = 132;
  const explicit = /[A-Z]/.test(String.fromCharCode(data[136] ?? 0));
  let patientName = "";
  let patientId = "";
  let rows = 0;
  let cols = 0;
  let pixels = new Uint8Array();
  while (offset + 8 <= data.length) {
    const item = readElement(data, offset, explicit);
    if (item.length === 0xffffffff) throw new Error("This DICOM file uses an undefined length this viewer does not read.");
    const value = data.subarray(item.valueStart, item.valueStart + item.length);
    const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
    if (item.group === 0x0010 && item.el === 0x0010) patientName = new TextDecoder().decode(value).replace(/\0/g, "").trim();
    if (item.group === 0x0010 && item.el === 0x0020) patientId = new TextDecoder().decode(value).replace(/\0/g, "").trim();
    if (item.group === 0x0028 && item.el === 0x0010 && value.length >= 2) rows = view.getUint16(0, true);
    if (item.group === 0x0028 && item.el === 0x0011 && value.length >= 2) cols = view.getUint16(0, true);
    if (item.group === 0x7fe0 && item.el === 0x0010) pixels = new Uint8Array(value);
    offset = item.next;
  }
  if (!rows || !cols || pixels.length < rows * cols) throw new Error("This DICOM file has no 8-bit image the browser can draw.");
  return { patientName, patientId, rows, cols, pixels: pixels.subarray(0, rows * cols) };
}

export function anonymizeDicom(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.byteLength);
  out.set(data);
  const explicit = /[A-Z]/.test(String.fromCharCode(data[136] ?? 0));
  let offset = 132;
  while (offset + 8 <= out.length) {
    const item = readElement(out, offset, explicit);
    if (item.length === 0xffffffff) break;
    if (item.group === 0x0010 && (item.el === 0x0010 || item.el === 0x0020)) {
      const label = new TextEncoder().encode(item.el === 0x0010 ? "ANONYMOUS" : "ANON");
      out.fill(0x20, item.valueStart, item.valueStart + item.length);
      out.set(label.subarray(0, Math.min(label.length, item.length)), item.valueStart);
    }
    offset = item.next;
  }
  return out;
}
