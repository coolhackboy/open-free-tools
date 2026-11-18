import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { detectPitch, integratedLufs, normalizePeak, noteName, sine } from "@/tools/lib/audioMath";
import { encodeWav } from "@/tools/lib/wav";
import { ActionButton, DropZone, Field, ResultText, TextInput, ToolPanel, downloadBytes, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

async function decodeFile(file: File) {
  const stereo = await decodeStereo(file);
  const mixed = new Float32Array(stereo.left.length);
  for (let index = 0; index < mixed.length; index += 1) mixed[index] = (stereo.left[index] + stereo.right[index]) / 2;
  return mixed;
}

async function decodeStereo(file: File) {
  const context = new AudioContext();
  const audio = await context.decodeAudioData(await file.arrayBuffer());
  const left = new Float32Array(audio.getChannelData(0));
  const right = audio.numberOfChannels > 1 ? new Float32Array(audio.getChannelData(1)) : left.slice();
  const sampleRate = audio.sampleRate;
  await context.close();
  return { left, right, sampleRate };
}

export function AudioLabTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [bpm, setBpm] = useState("100");
  const [script, setScript] = useState("Hello! This is a quick speech test.");
  const [result, setResult] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const timer = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    void audio.current?.close();
  }, []);

  async function samples() {
    if (file) return decodeFile(file);
    return sine(440, 1, 44100, 0.2);
  }

  async function run() {
    if (timer.current) window.clearInterval(timer.current);
    if (mode === "metronome") {
      const context = new AudioContext();
      audio.current = context;
      let beat = 0;
      const tick = () => {
        beat += 1;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = beat % 4 === 1 ? 1760 : 880;
        gain.gain.value = 0.2;
        osc.connect(gain).connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.05);
        setResult(`Beat ${beat}`);
      };
      tick();
      timer.current = window.setInterval(tick, Math.round(60000 / Number(bpm || 100)));
      return;
    }
    if (mode === "tuner") {
      const context = new AudioContext();
      const osc = context.createOscillator();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      osc.frequency.value = 440;
      osc.connect(analyser);
      osc.connect(context.destination);
      osc.start();
      const data = new Float32Array(analyser.fftSize);
      window.setTimeout(() => {
        analyser.getFloatTimeDomainData(data);
        const frequency = detectPitch(data, context.sampleRate) ?? 440;
        setResult(`${noteName(frequency)} · ${Math.round(frequency)} Hz`);
        osc.stop();
        void context.close();
      }, 180);
      return;
    }
    if (mode === "tts") {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.onend = () => setResult(`Spoke: ${script}`);
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(utterance);
      setResult(window.speechSynthesis ? `Speaking: ${script}` : "Speech synthesis is unavailable.");
      return;
    }
    if (mode === "white-noise") {
      const context = new AudioContext();
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
      downloadBytes(encodeWav(channel, context.sampleRate), "white-noise.wav", "audio/wav");
      setResult(`Playing noise. white-noise.wav · ${channel.length} samples`);
      window.setTimeout(() => void context.close(), 1200);
      return;
    }
    const input = await samples();
    if (mode === "loudness" || mode === "lufs") {
      setResult(`Integrated ${integratedLufs(input).toFixed(1)} LUFS`);
      return;
    }
    if (mode === "normalize") {
      const normalized = normalizePeak(input);
      downloadBytes(encodeWav(normalized.samples, 44100), "normalized.wav", "audio/wav");
      setResult(`Gain ${normalized.gainDb.toFixed(1)} dB · normalized.wav`);
    }
  }

  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        {mode === "metronome" ? <Field label="BPM"><TextInput value={bpm} onChange={(event) => setBpm(event.target.value)} /></Field> : null}
        {mode === "tts" ? <Field label={tx(locale, "Text", "文字")}><TextInput value={script} onChange={(event) => setScript(event.target.value)} /></Field> : null}
      </div>
      {mode === "loudness" || mode === "lufs" || mode === "normalize" ? (
        <DropZone label={tx(locale, "Drop audio, or run the built-in sample", "拖入音频，或直接运行示例")} accept="audio/*,video/*" onFiles={(files) => setFile(files[0] ?? null)} />
      ) : null}
      <ActionButton data-action="run" onClick={() => void run()}>{tx(locale, "Run", "运行")}</ActionButton>
      <ResultText>{result}</ResultText>
    </ToolPanel>
  );
}
