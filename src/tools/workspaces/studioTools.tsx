import { useEffect, useMemo, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { boardConflicts, createPuzzle, dailySeed, findHint, type SudokuBoard } from "@/tools/lib/sudoku";
import { mixToWav } from "@/tools/lib/wav";
import {
  ActionButton,
  Field,
  StatusLine,
  TextInput,
  ToolPanel,
  downloadBlob,
  downloadText,
  tx,
} from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

function tone(frequency: number, start: number, duration: number, type: OscillatorType, context: AudioContext, destination: AudioNode) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function MusicTool({ locale }: Props) {
  const [steps, setSteps] = useState(() => {
    const grid = Array.from({ length: 4 }, () => Array(16).fill(false));
    grid[0][0] = true;
    grid[0][8] = true;
    grid[1][4] = true;
    grid[1][12] = true;
    grid[2][2] = true;
    grid[2][6] = true;
    grid[2][10] = true;
    grid[2][14] = true;
    grid[3][0] = true;
    grid[3][4] = true;
    grid[3][8] = true;
    grid[3][12] = true;
    return grid;
  });
  const [bpm, setBpm] = useState(100);
  const [status, setStatus] = useState("");
  const rows = ["Kick", "Snare", "Hat", "Bass"];
  function play(record = false) {
    const context = new AudioContext();
    const capture = record ? context.createMediaStreamDestination() : null;
    const destination = capture ?? context.destination;
    const step = 60 / bpm / 2;
    steps.forEach((row, rowIndex) => {
      row.forEach((on, index) => {
        if (!on) return;
        const when = context.currentTime + index * step;
        if (rowIndex === 0) tone(90, when, 0.12, "sine", context, destination);
        if (rowIndex === 1) tone(180, when, 0.08, "triangle", context, destination);
        if (rowIndex === 2) tone(640, when, 0.04, "square", context, destination);
        if (rowIndex === 3) tone(55 * (index % 4 === 0 ? 1 : 1.5), when, 0.18, "sawtooth", context, destination);
      });
    });
    if (!capture) return;
    const recorder = new MediaRecorder(capture.stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => downloadBlob(new Blob(chunks, { type: "audio/webm" }), "beat.webm");
    recorder.start();
    window.setTimeout(() => recorder.stop(), step * 16 * 1000 + 200);
    setStatus(tx(locale, "Recording one loop…", "正在录一个循环…"));
  }
  return (
    <ToolPanel>
      <Field label="BPM"><TextInput type="number" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /></Field>
      <div className="space-y-2">
        {rows.map((label, row) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-14 text-xs">{label}</span>
            {steps[row].map((on, index) => (
              <button key={index} type="button" className={`h-8 w-8 rounded-sm border ${on ? "bg-primary" : "bg-muted"}`} onClick={() => {
                setSteps((current) => current.map((line, lineIndex) => lineIndex === row ? line.map((value, stepIndex) => stepIndex === index ? !value : value) : line));
              }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <ActionButton type="button" onClick={() => play(false)}>{tx(locale, "Play", "播放")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => play(true)}>{tx(locale, "Record loop", "录循环")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => {
          const rate = 44100;
          const step = 60 / bpm / 2;
          const total = Math.ceil(step * 16 * rate);
          const mix = new Float32Array(total);
          steps.forEach((row, rowIndex) => row.forEach((on, index) => {
            if (!on) return;
            const frequency = [90, 180, 640, 82][rowIndex];
            const start = Math.floor(index * step * rate);
            for (let i = 0; i < rate * 0.15 && start + i < mix.length; i += 1) {
              mix[start + i] += Math.sin(2 * Math.PI * frequency * (i / rate)) * Math.exp(-i / (rate * 0.08)) * 0.3;
            }
          }));
          downloadBlob(new Blob([mixToWav([mix], rate).buffer as ArrayBuffer], { type: "audio/wav" }), "beat.wav");
        }}>WAV</ActionButton>
      </div>
      <StatusLine>{status}</StatusLine>
    </ToolPanel>
  );
}

const NOTE_FREQ: Record<string, number> = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392, A: 440, B: 493.88 };

export function SheetTool({ locale }: Props) {
  const [text, setText] = useState("C4 E4 G4 | C5 B4 G4 E4");
  const notes = text.split(/\s+/).filter((token) => token !== "|");
  function play() {
    const context = new AudioContext();
    notes.forEach((token, index) => {
      const match = token.match(/^([A-G])(\d)?$/);
      if (!match) return;
      const frequency = NOTE_FREQ[match[1]] * 2 ** ((Number(match[2] ?? 4) - 4));
      tone(frequency, context.currentTime + index * 0.4, 0.35, "sine", context, context.destination);
    });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="180"><rect width="760" height="180" fill="white"/>${[0, 1, 2, 3, 4].map((line) => `<line x1="20" y1="${40 + line * 16}" x2="740" y2="${40 + line * 16}" stroke="#111"/>`).join("")}${notes.map((token, index) => `<text x="${40 + index * 48}" y="120" font-size="16">${token.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`).join("")}</svg>`;
  const musicXml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list><part id="P1"><measure number="1">${notes.map((token) => `<note><pitch><step>${token[0]}</step><octave>${token[1] ?? "4"}</octave></pitch><duration>1</duration><type>quarter</type></note>`).join("")}</measure></part></score-partwise>`;
  return (
    <ToolPanel>
      <Field label={tx(locale, "Notes", "音符")}><TextInput value={text} onChange={(event) => setText(event.target.value)} /></Field>
      <div className="overflow-x-auto rounded-md border border-line" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex gap-2">
        <ActionButton type="button" onClick={play}>{tx(locale, "Play", "播放")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(musicXml, "melody.musicxml", "application/xml")}>MusicXML</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(svg, "staff.svg", "image/svg+xml")}>SVG</ActionButton>
      </div>
    </ToolPanel>
  );
}

const WHITE = ["C", "D", "E", "F", "G", "A", "B"];

export function PianoTool({ locale }: Props) {
  const [octave, setOctave] = useState(4);
  const [status, setStatus] = useState("");
  const chunks = useRef<Float32Array[]>([]);
  function playNote(name: string, oct = octave) {
    const context = new AudioContext();
    const frequency = NOTE_FREQ[name[0]] * 2 ** (oct - 4);
    tone(frequency, context.currentTime, 0.4, "sine", context, context.destination);
    setStatus(name + oct);
  }
  useEffect(() => {
    const keys: Record<string, string> = { a: "C", s: "D", d: "E", f: "F", g: "G", h: "A", j: "B" };
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const name = keys[event.key.toLowerCase()];
      if (!name) return;
      event.preventDefault();
      playNote(name);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [octave]);
  return (
    <ToolPanel>
      <div className="flex gap-2">
        <ActionButton type="button" tone="quiet" onClick={() => setOctave((value) => Math.max(2, value - 1))}>-</ActionButton>
        <span className="self-center text-sm">{tx(locale, "Octave", "八度")} {octave}</span>
        <ActionButton type="button" tone="quiet" onClick={() => setOctave((value) => Math.min(6, value + 1))}>+</ActionButton>
      </div>
      <div className="flex gap-1">
        {WHITE.map((name) => (
          <button key={name} type="button" className="h-36 w-12 rounded-b-md border border-border bg-white text-sm" onClick={() => playNote(name)}>{name}</button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{tx(locale, "Keyboard: A S D F G H J play the white keys.", "键盘 A S D F G H J 对应白键。")}</p>
      <StatusLine>{status}</StatusLine>
      <ActionButton type="button" onClick={() => {
        const rate = 44100;
        const sample = new Float32Array(rate);
        WHITE.forEach((name, index) => {
          const frequency = NOTE_FREQ[name];
          for (let i = 0; i < rate / 2; i += 1) sample[i + index * 2000] += Math.sin(2 * Math.PI * frequency * (i / rate)) * 0.2;
        });
        chunks.current = [sample];
        downloadBlob(new Blob([mixToWav(chunks.current, rate).buffer as ArrayBuffer], { type: "audio/wav" }), "piano.wav");
      }}>{tx(locale, "Download a scale", "下载音阶")}</ActionButton>
    </ToolPanel>
  );
}

const CHORDS: Record<string, number[]> = {
  C: [261.63, 329.63, 392],
  G: [196, 246.94, 392],
  Am: [220, 261.63, 329.63],
  F: [174.61, 220, 261.63],
  D: [293.66, 369.99, 440],
  Em: [164.81, 196, 246.94],
  E: [164.81, 207.65, 246.94],
  A: [220, 277.18, 329.63],
};

export function GuitarTool({ locale }: Props) {
  const [capo, setCapo] = useState(0);
  const [chord, setChord] = useState("C");
  function strum(name: string) {
    const context = new AudioContext();
    CHORDS[name].forEach((frequency, index) => {
      tone(frequency * 2 ** (capo / 12), context.currentTime + index * 0.03, 0.7, "triangle", context, context.destination);
    });
    setChord(name);
  }
  function downloadChord() {
    const rate = 44100;
    const mix = new Float32Array(Math.floor(rate * 0.9));
    CHORDS[chord].forEach((frequency, index) => {
      const freq = frequency * 2 ** (capo / 12);
      const start = Math.floor(index * 0.03 * rate);
      for (let i = start; i < mix.length; i += 1) {
        const t = (i - start) / rate;
        mix[i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3) * 0.25;
      }
    });
    downloadBlob(new Blob([mixToWav([mix], rate).buffer as ArrayBuffer], { type: "audio/wav" }), `${chord.toLowerCase()}-chord.wav`);
  }
  return (
    <ToolPanel>
      <Field label={tx(locale, "Capo", "变调夹")}><TextInput type="number" min={0} max={8} value={capo} onChange={(event) => setCapo(Number(event.target.value))} /></Field>
      <div className="flex flex-wrap gap-2">
        {Object.keys(CHORDS).map((name) => <ActionButton key={name} type="button" tone={name === chord ? "primary" : "quiet"} onClick={() => strum(name)}>{name}</ActionButton>)}
      </div>
      <p className="text-sm">{tx(locale, "Frets", "品格")}: {CHORDS[chord].map((frequency) => frequency.toFixed(0)).join(" · ")}</p>
      <ActionButton type="button" onClick={downloadChord}>{tx(locale, "Download WAV", "下载 WAV")}</ActionButton>
    </ToolPanel>
  );
}

export function WhiteboardTool({ locale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#111111");
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);
  return (
    <ToolPanel>
      <Field label={tx(locale, "Ink", "颜色")}><TextInput type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md border border-border bg-white"
        onPointerDown={(event) => {
          drawing.current = true;
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;
          const rect = canvas.getBoundingClientRect();
          context.strokeStyle = color;
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(((event.clientX - rect.left) / rect.width) * canvas.width, ((event.clientY - rect.top) / rect.height) * canvas.height);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;
          const rect = canvas.getBoundingClientRect();
          context.lineTo(((event.clientX - rect.left) / rect.width) * canvas.width, ((event.clientY - rect.top) / rect.height) * canvas.height);
          context.stroke();
        }}
        onPointerUp={() => { drawing.current = false; }}
      />
      <ActionButton type="button" onClick={() => canvasRef.current?.toBlob((blob) => { if (blob) downloadBlob(blob, "board.png"); })}>PNG</ActionButton>
    </ToolPanel>
  );
}

type MindNode = { id: string; text: string; x: number; y: number; parent?: string };

export function MindMapTool({ locale }: Props) {
  const [nodes, setNodes] = useState<MindNode[]>([{ id: "root", text: locale === "zh" ? "中心" : "Idea", x: 360, y: 180 }]);
  const [draft, setDraft] = useState("");
  return (
    <ToolPanel>
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        setNodes((current) => [...current, { id: `n${current.length}`, text: draft.trim(), x: 80 + current.length * 30, y: 40 + (current.length % 5) * 50, parent: "root" }]);
        setDraft("");
      }}>
        <TextInput value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={tx(locale, "New branch", "新分支")} aria-label={tx(locale, "New branch", "新分支")} />
        <ActionButton type="submit" disabled={!draft.trim()}>{tx(locale, "Add", "添加")}</ActionButton>
      </form>
      <svg viewBox="0 0 760 360" className="w-full rounded-md border border-border bg-white">
        {nodes.filter((node) => node.parent).map((node) => {
          const parent = nodes.find((item) => item.id === node.parent);
          if (!parent) return null;
          return <line key={`${node.id}-line`} x1={parent.x} y1={parent.y} x2={node.x} y2={node.y} stroke="#999" />;
        })}
        {nodes.map((node) => (
          <g key={node.id} onPointerDown={(event) => {
            const svg = (event.target as SVGElement).ownerSVGElement;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const move = (moveEvent: PointerEvent) => {
              const x = ((moveEvent.clientX - rect.left) / rect.width) * 760;
              const y = ((moveEvent.clientY - rect.top) / rect.height) * 360;
              setNodes((current) => current.map((item) => item.id === node.id ? { ...item, x, y } : item));
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}>
            <rect x={node.x - 48} y={node.y - 16} width="96" height="32" rx="8" fill={node.id === "root" ? "#111" : "#fff"} stroke="#111" />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fill={node.id === "root" ? "#fff" : "#111"}>{node.text}</text>
          </g>
        ))}
      </svg>
      <div className="flex gap-2">
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(JSON.stringify(nodes, null, 2), "mind-map.json", "application/json")}>JSON</ActionButton>
      </div>
    </ToolPanel>
  );
}

export function SudokuTool({ locale }: Props) {
  const puzzle = useMemo(() => createPuzzle(dailySeed()), []);
  const [board, setBoard] = useState<SudokuBoard>(puzzle.puzzle.map((row) => [...row]));
  const conflicts = boardConflicts(board.map((row) => [...row]));
  const given = puzzle.puzzle;
  return (
    <ToolPanel>
      <div className="mx-auto grid aspect-square w-full max-w-[26rem] grid-cols-9 overflow-hidden rounded-md border-2 border-fg/70" role="grid" aria-label={tx(locale, "Sudoku board", "数独棋盘")}>
        {board.flatMap((row, rowIndex) => row.map((value, colIndex) => {
          const fixed = given[rowIndex][colIndex] !== 0;
          const edges = [
            colIndex % 3 === 2 && colIndex < 8 ? "border-r-2 border-r-fg/70" : "border-r border-r-line-strong",
            rowIndex % 3 === 2 && rowIndex < 8 ? "border-b-2 border-b-fg/70" : "border-b border-b-line-strong",
          ].join(" ");
          return (
            <input
              key={`${rowIndex}-${colIndex}`}
              value={value || ""}
              disabled={fixed}
              inputMode="numeric"
              maxLength={2}
              aria-label={tx(locale, `Row ${rowIndex + 1}, column ${colIndex + 1}`, `第 ${rowIndex + 1} 行第 ${colIndex + 1} 列`)}
              onChange={(event) => {
                const next = Number(event.target.value.replace(/[^1-9]/g, "").slice(-1)) || 0;
                setBoard((current) => current.map((line, r) => line.map((cell, c) => r === rowIndex && c === colIndex ? next : cell)));
              }}
              className={`aspect-square w-full min-w-0 text-center text-lg outline-none focus:bg-accent-soft disabled:opacity-100 sm:text-xl ${edges} ${conflicts[rowIndex][colIndex] ? "bg-danger-soft text-danger" : fixed ? "bg-surface-2 font-semibold text-fg" : "bg-bg font-medium text-accent-ink"}`}
            />
          );
        }))}
      </div>
      {board.every((row, r) => row.every((cell, c) => cell === puzzle.solution[r][c])) ? (
        <p className="text-center text-sm font-medium text-accent-ink" role="status">{tx(locale, "Solved. Come back tomorrow for a new puzzle.", "完成了！明天会有新题。")}</p>
      ) : null}
      <div className="flex justify-center gap-2">
        <ActionButton type="button" onClick={() => {
          const hint = findHint(board, puzzle.solution);
          if (!hint) return;
          setBoard((current) => current.map((line, r) => line.map((cell, c) => r === hint.row && c === hint.col ? hint.value : cell)));
        }}>{tx(locale, "Hint", "提示")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => setBoard(puzzle.solution.map((row) => [...row]))}>{tx(locale, "Solve", "求解")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => setBoard(puzzle.puzzle.map((row) => [...row]))}>{tx(locale, "Reset", "重来")}</ActionButton>
      </div>
    </ToolPanel>
  );
}

const PASSAGES = [
  "The quick brown fox jumps over the lazy dog while the river keeps its own slow time.",
  "A good tool finishes the file you already have and leaves the original where you put it.",
  "Practice is a sequence of small accurate motions, not a race against the clock.",
];

export function TypingTool({ locale }: Props) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState<number | null>(null);
  const passage = PASSAGES[index % PASSAGES.length];
  const done = typed.length >= passage.length;
  const elapsed = started ? (Date.now() - started) / 60000 : 0;
  const correct = [...typed].filter((char, charIndex) => char === passage[charIndex]).length;
  const wpm = done && elapsed > 0 ? Math.round((correct / 5) / elapsed) : 0;
  return (
    <ToolPanel>
      <p className="text-lg leading-relaxed">{[...passage].map((char, charIndex) => (
        <span key={charIndex} className={typed[charIndex] == null ? "" : typed[charIndex] === char ? "text-emerald-700" : "bg-red-100"}>{char}</span>
      ))}</p>
      <textarea className="min-h-24 w-full rounded-md border border-input bg-background p-3" value={typed} onChange={(event) => {
        if (!started) setStarted(Date.now());
        setTyped(event.target.value);
      }} />
      <p className="text-sm">{done ? `${wpm} WPM · ${Math.round((correct / passage.length) * 100)}%` : tx(locale, "Type the passage.", "把这段打出来。")}</p>
      <ActionButton type="button" tone="quiet" onClick={() => { setIndex((value) => value + 1); setTyped(""); setStarted(null); }}>{tx(locale, "Next passage", "下一段")}</ActionButton>
    </ToolPanel>
  );
}

export function TeleprompterTool({ locale }: Props) {
  const starter = locale === "zh"
    ? "把讲稿贴在这里。空格开始滚动。这一段会往下走，方便你看着屏幕把句子念完。"
    : "Paste the script here. Press space to scroll. This paragraph keeps going so the words have room to move up the screen.";
  const [script, setScript] = useState(Array.from({ length: 14 }, () => starter).join("\n\n"));
  const [speed, setSpeed] = useState(40);
  const [mirror, setMirror] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      scroller.current?.scrollBy({ top: 1 });
    }, Math.max(8, 80 - speed));
    return () => window.clearInterval(timer);
  }, [playing, speed]);
  return (
    <ToolPanel>
      <textarea className="min-h-24 w-full rounded-md border border-input p-3" value={script} onChange={(event) => setScript(event.target.value)} />
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Speed", "速度")}><TextInput type="number" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} />{tx(locale, "Mirror", "镜像")}</label>
        <ActionButton type="button" onClick={() => setPlaying((value) => !value)}>{playing ? tx(locale, "Pause", "暂停") : tx(locale, "Play", "播放")}</ActionButton>
      </div>
      <div ref={scroller} className="h-64 overflow-hidden whitespace-pre-wrap rounded-md bg-black p-6 text-3xl leading-relaxed text-white" style={{ transform: mirror ? "scaleX(-1)" : undefined }} tabIndex={0} onKeyDown={(event) => { if (event.code === "Space") { event.preventDefault(); setPlaying((value) => !value); } }}>
        {script}
      </div>
    </ToolPanel>
  );
}
