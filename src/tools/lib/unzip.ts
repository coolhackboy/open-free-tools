export async function unzip(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= data.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(data.subarray(nameStart, nameStart + nameLen));
    const start = nameStart + nameLen + extraLen;
    const stored = data.subarray(start, start + compSize);
    let bytes: Uint8Array = stored;
    if (method === 8) {
      const copy = new Uint8Array(stored.byteLength);
      copy.set(stored);
      const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (method !== 0) {
      throw new Error(`Unsupported zip method ${method}`);
    }
    if (name && !name.endsWith("/")) out.set(name, bytes);
    offset = start + compSize;
  }
  return out;
}
