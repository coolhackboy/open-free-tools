export type SpeechCue = { start: number; end: number; text: string };

export function resampleLinear(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input.slice();
  const length = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const out = new Float32Array(length);
  const scale = input.length <= 1 ? 0 : (input.length - 1) / Math.max(1, length - 1);
  for (let index = 0; index < length; index += 1) {
    const position = index * scale;
    const left = Math.floor(position);
    const right = Math.min(input.length - 1, left + 1);
    const mix = position - left;
    out[index] = input[left] * (1 - mix) + input[right] * mix;
  }
  return out;
}

export function clipSeconds(samples: Float32Array, sampleRate: number, seconds: number) {
  const count = Math.max(1, Math.min(samples.length, Math.floor(seconds * sampleRate)));
  const out = new Float32Array(count);
  out.set(samples.subarray(0, count));
  return out;
}

function stamp(value: number) {
  const safe = Math.max(0, value);
  return new Date(safe * 1000).toISOString().slice(11, 23).replace(".", ",");
}

export function cuesToSrt(cues: SpeechCue[]) {
  return cues.map((cue, index) => {
    const end = cue.end > cue.start ? cue.end : cue.start + 2;
    return `${index + 1}\n${stamp(cue.start)} --> ${stamp(end)}\n${cue.text}\n`;
  }).join("\n");
}
