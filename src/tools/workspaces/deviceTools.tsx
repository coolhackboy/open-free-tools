import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ActionButton, ResultText, ToolPanel, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

const COLORS = [
  ["#ff2d2d", "red"],
  ["#19c37d", "green"],
  ["#2f6bff", "blue"],
  ["#ffffff", "white"],
  ["#111111", "black"],
];

export function DeviceTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [result, setResult] = useState("");
  const [color, setColor] = useState(0);
  const [keys, setKeys] = useState<string[]>([]);
  const [pointer, setPointer] = useState("Move the pointer inside the box.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function noteKey(key: string) {
    setKeys((current) => [key, ...current].slice(0, 8));
    setResult(`Key ${key}`);
  }

  async function run() {
    if (mode === "keyboard") {
      noteKey("A");
      return;
    }
    if (mode === "mouse") {
      setPointer("Click 1 · 120, 80");
      setResult("Click 1 · 120, 80");
      return;
    }
    if (mode === "screen") {
      const next = (color + 1) % COLORS.length;
      setColor(next);
      setResult(`Color ${COLORS[next][1]}`);
      return;
    }
    if (mode === "speaker") {
      const context = new AudioContext();
      const osc = context.createOscillator();
      osc.frequency.value = 440;
      osc.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.6);
      setResult("Playing 440 Hz");
      window.setTimeout(() => void context.close(), 800);
      return;
    }
    if (mode === "mic" || mode === "webcam") {
      try {
        const media = await navigator.mediaDevices.getUserMedia(mode === "mic" ? { audio: true } : { video: true, audio: false });
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (mode === "webcam" && videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
          setResult("Camera is on");
          return;
        }
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        context.createMediaStreamSource(media).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        window.setTimeout(() => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
          setResult(`Level ${peak}`);
          media.getTracks().forEach((track) => track.stop());
          void context.close();
        }, 250);
      } catch {
        setResult(mode === "mic" ? "Microphone is unavailable." : "Camera is unavailable.");
      }
    }
  }

  return (
    <ToolPanel>
      {mode === "keyboard" ? (
        <div
          tabIndex={0}
          className="rounded-lg border border-dashed border-input p-6 text-center outline-none focus:border-foreground"
          onKeyDown={(event) => {
            event.preventDefault();
            noteKey(event.key);
          }}
        >
          {tx(locale, "Click here and press keys.", "点这里后按键。")}
          <div className="mt-3 flex flex-wrap justify-center gap-2">{keys.map((key, index) => <span key={`${key}-${index}`} className="rounded bg-muted px-2 py-1 text-sm">{key}</span>)}</div>
        </div>
      ) : null}
      {mode === "mouse" ? (
        <div
          className="rounded-lg border border-dashed border-input p-8 text-center"
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const text = `${Math.round(event.clientX - bounds.left)}, ${Math.round(event.clientY - bounds.top)}`;
            setPointer(text);
            setResult(text);
          }}
          onClick={() => setResult((current) => current.startsWith("Click") ? current : `Click 1 · ${pointer}`)}
        >
          {pointer}
        </div>
      ) : null}
      {mode === "screen" ? <div className="h-40 rounded-lg border border-border" style={{ background: COLORS[color][0] }} /> : null}
      {mode === "webcam" ? <video ref={videoRef} className="max-h-64 w-full rounded-lg bg-black" muted playsInline /> : null}
      <ActionButton data-action="run" onClick={() => void run()}>{tx(locale, "Run", "运行")}</ActionButton>
      <ResultText>{result}</ResultText>
    </ToolPanel>
  );
}
