export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

export function mixToWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const length = channels.reduce((max, channel) => Math.max(max, channel.length), 0);
  const mixed = new Float32Array(length);
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) mixed[i] += channel[i];
  }
  const peak = mixed.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  if (peak > 1) {
    for (let i = 0; i < mixed.length; i += 1) mixed[i] /= peak;
  }
  return encodeWav(mixed, sampleRate);
}
