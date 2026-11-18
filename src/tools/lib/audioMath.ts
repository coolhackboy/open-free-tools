export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.floor(sampleRate / 70), samples.length - 2);
  let bestLag = -1;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    const limit = samples.length - lag;
    for (let i = 0; i < limit; i += 8) corr += samples[i] * samples[i + lag];
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || best <= 0) return null;
  return sampleRate / bestLag;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteName(frequency: number): string {
  const semis = Math.round(12 * Math.log2(frequency / 440));
  const midi = 69 + semis;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function integratedLufs(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  const mean = sum / Math.max(1, samples.length);
  if (mean <= 0) return -70;
  return -0.691 + 10 * Math.log10(mean);
}

export function normalizePeak(samples: Float32Array, target = 0.89): { samples: Float32Array; gainDb: number } {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? target / peak : 1;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * gain;
  return { samples: out, gainDb: 20 * Math.log10(gain || 1) };
}

export function noiseGate(samples: Float32Array, threshold = 0.08): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = Math.abs(samples[i]) < threshold ? samples[i] * 0.05 : samples[i];
  }
  return out;
}

export function cancelCenter(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = (left[i] - right[i]) * 0.5;
  return out;
}

export function sine(frequency: number, seconds: number, sampleRate: number, amplitude = 0.4): Float32Array {
  const out = new Float32Array(Math.floor(sampleRate * seconds));
  for (let i = 0; i < out.length; i += 1) out[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;
  return out;
}
