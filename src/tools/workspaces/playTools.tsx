import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ActionButton, Field, ResultText, SelectInput, TextInput, ToolPanel, tx } from "@/tools/controls";
import { PLATES, memoryCloseOpen, memoryDeck, memoryFlip, reactionStats, scorePlates, seeded, tttBestMove, tttWinner, type Cell } from "@/tools/lib/play";

type Props = { tool: FreeTool; locale: string };

export const PLAY_MODES = new Set(["tic-tac-toe", "memory", "reaction", "color-blind", "gamepad"]);

/* Tic-tac-toe ------------------------------------------------------------ */

function TicTacToe({ locale }: { locale: string }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [opponent, setOpponent] = useState<"hard" | "easy" | "human">("hard");
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const { winner, line } = tttWinner(board);

  function finish(next: Cell[]) {
    const result = tttWinner(next).winner;
    if (result) setScore((current) => ({ ...current, [result]: current[result] + 1 }));
    return result;
  }

  function play(index: number) {
    if (board[index] || winner) return;
    const next = board.slice();
    next[index] = turn;
    if (finish(next) || opponent === "human") {
      setBoard(next);
      setTurn(turn === "X" ? "O" : "X");
      return;
    }
    const reply = tttBestMove(next, "O", opponent);
    if (reply >= 0) next[reply] = "O";
    finish(next);
    setBoard(next);
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
  }

  const status = winner === "draw" ? tx(locale, "Draw.", "平局。") : winner ? tx(locale, `${winner} wins.`, `${winner} 获胜。`) : opponent === "human" ? tx(locale, `${turn} to move.`, `轮到 ${turn}。`) : tx(locale, "Your move (X).", "轮到你（X）。");

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Opponent", "对手")}>
          <SelectInput value={opponent} onChange={(event) => { setOpponent(event.target.value as typeof opponent); reset(); }}>
            <option value="hard">{tx(locale, "Computer – unbeatable", "电脑 · 不可战胜")}</option>
            <option value="easy">{tx(locale, "Computer – easy", "电脑 · 简单")}</option>
            <option value="human">{tx(locale, "Two players", "双人对战")}</option>
          </SelectInput>
        </Field>
        <ActionButton type="button" data-action="run" onClick={reset}>{tx(locale, "New game", "新一局")}</ActionButton>
      </div>
      <div role="grid" aria-label={tx(locale, "Tic-tac-toe board", "井字棋棋盘")} className="mx-auto grid w-full max-w-[320px] grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            role="gridcell"
            aria-label={cell ?? tx(locale, `Empty square ${index + 1}`, `空格 ${index + 1}`)}
            onClick={() => play(index)}
            className={["aspect-square rounded-xl border-2 border-[#111] text-5xl font-bold", line?.includes(index) ? "bg-accent text-[#111]" : "bg-background", cell === "O" ? "text-[#3d6df2]" : ""].join("")}
          >
            {cell}
          </button>
        ))}
      </div>
      <ResultText>{status}</ResultText>
      <p className="text-sm text-muted-foreground">X {score.X} · O {score.O} · {tx(locale, "Draws", "平局")} {score.draw}</p>
    </>
  );
}

/* Memory ----------------------------------------------------------------- */

function MemoryGame({ locale }: { locale: string }) {
  const [pairs, setPairs] = useState(8);
  const [deck, setDeck] = useState(() => memoryDeck(8, 1));
  const [moves, setMoves] = useState(0);
  const closing = useRef<number | null>(null);
  const done = deck.every((card) => card.done);

  useEffect(() => () => {
    if (closing.current) window.clearTimeout(closing.current);
  }, []);

  function start(count = pairs) {
    if (closing.current) window.clearTimeout(closing.current);
    setDeck(memoryDeck(count, Date.now()));
    setMoves(0);
  }

  function flip(id: number) {
    const result = memoryFlip(deck, id);
    if (result.deck === deck) return;
    setDeck(result.deck);
    if (result.moved) setMoves((value) => value + 1);
    if (result.pending) closing.current = window.setTimeout(() => setDeck((current) => memoryCloseOpen(current)), 800);
  }

  const columns = deck.length <= 12 ? 4 : deck.length <= 16 ? 4 : 6;
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Pairs", "对数")}>
          <SelectInput value={pairs} onChange={(event) => { const value = Number(event.target.value); setPairs(value); start(value); }}>
            {[6, 8, 12].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectInput>
        </Field>
        <ActionButton type="button" data-action="run" onClick={() => start()}>{tx(locale, "New game", "新一局")}</ActionButton>
      </div>
      <div className="mx-auto grid w-full max-w-[460px] gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {deck.map((card) => (
          <button
            key={card.id}
            type="button"
            aria-label={card.open || card.done ? card.face : tx(locale, "Hidden card", "背面朝上的卡片")}
            onClick={() => flip(card.id)}
            className={["aspect-square rounded-xl border-2 border-[#111] text-3xl transition-colors", card.done ? "bg-accent/70" : card.open ? "bg-background" : "bg-[#8c7bff]"].join(" ")}
          >
            {card.open || card.done ? card.face : ""}
          </button>
        ))}
      </div>
      <ResultText>{done ? tx(locale, `Solved in ${moves} moves.`, `用 ${moves} 步完成。`) : tx(locale, `Moves: ${moves}`, `步数：${moves}`)}</ResultText>
    </>
  );
}

/* Reaction time ---------------------------------------------------------- */

function ReactionTest({ locale }: { locale: string }) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const started = useRef(0);
  const timer = useRef<number | null>(null);
  const stats = reactionStats(times);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function press() {
    if (phase === "idle" || phase === "done" || phase === "early") {
      setPhase("wait");
      timer.current = window.setTimeout(() => {
        started.current = performance.now();
        setPhase("go");
      }, 1500 + Math.random() * 2500);
      return;
    }
    if (phase === "wait") {
      if (timer.current) window.clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    const value = Math.round(performance.now() - started.current);
    setLast(value);
    setTimes((current) => [...current, value].slice(-5));
    setPhase("done");
  }

  const colors = { idle: "#3d6df2", wait: "#ff5a4e", go: "#2fbf5a", early: "#ffd84d", done: "#3d6df2" } as const;
  const label = {
    idle: tx(locale, "Click or press Space to start", "点击或按空格开始"),
    wait: tx(locale, "Wait for green…", "等变绿…"),
    go: tx(locale, "Click!", "点！"),
    early: tx(locale, "Too soon. Click to try again.", "太早了，点击重试。"),
    done: tx(locale, `${last} ms. Click to go again.`, `${last} 毫秒，点击再来一次。`),
  }[phase];

  return (
    <>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          press();
        }}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            press();
          }
        }}
        className="flex h-64 w-full select-none items-center justify-center rounded-2xl text-2xl font-bold text-white"
        style={{ background: colors[phase], color: phase === "early" ? "#111" : "#fff" }}
        data-phase={phase}
      >
        {label}
      </button>
      {stats ? (
        <dl className="grid gap-2 sm:grid-cols-4">
          {([
            [tx(locale, "Average", "平均"), stats.average],
            [tx(locale, "Median", "中位数"), stats.median],
            [tx(locale, "Best", "最快"), stats.best],
            [tx(locale, "Tries", "次数"), times.length],
          ] as const).map(([name, value], index) => (
            <div key={name} className="rounded-md border border-border p-3">
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="font-mono text-lg">{index === 3 ? value : `${Math.round(value)} ms`}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "Keeps your last 5 tries. Most people land between 200 and 300 ms on a mouse; screens and input devices add a few milliseconds.", "保留最近 5 次。多数人用鼠标在 200 到 300 毫秒之间；显示器和输入设备会额外增加几毫秒。")}</p>
    </>
  );
}

/* Color blind test ------------------------------------------------------- */

function drawPlate(canvas: HTMLCanvasElement, index: number) {
  const plate = PLATES[index];
  const size = 360;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const maskContext = mask.getContext("2d")!;
  maskContext.fillStyle = "#000";
  maskContext.font = `900 ${plate.answer.length > 1 ? 170 : 210}px Arial, sans-serif`;
  maskContext.textAlign = "center";
  maskContext.textBaseline = "middle";
  maskContext.fillText(plate.answer, size / 2, size / 2 + 8);
  const pixels = maskContext.getImageData(0, 0, size, size).data;
  context.clearRect(0, 0, size, size);
  const random = seeded(index + 7);
  const placed: [number, number, number][] = [];
  for (let attempt = 0; attempt < 9000 && placed.length < 1400; attempt += 1) {
    const radius = 3 + random() * 7;
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (size / 2 - radius - 2);
    const x = size / 2 + Math.cos(angle) * distance;
    const y = size / 2 + Math.sin(angle) * distance;
    if (placed.some(([px, py, pr]) => (px - x) ** 2 + (py - y) ** 2 < (pr + radius + 1) ** 2)) continue;
    placed.push([x, y, radius]);
    const inside = pixels[(Math.round(y) * size + Math.round(x)) * 4 + 3] > 128;
    const palette = inside ? plate.figure : plate.ground;
    context.fillStyle = palette[Math.floor(random() * palette.length)];
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function ColorBlindTest({ locale }: { locale: string }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const finished = step >= PLATES.length;

  useEffect(() => {
    if (canvas.current && !finished) drawPlate(canvas.current, step);
  }, [step, finished]);

  function submit(answer: string) {
    setAnswers((current) => [...current, answer]);
    setValue("");
    setStep((current) => current + 1);
  }

  const score = finished ? scorePlates(answers) : null;
  const summary = score
    ? {
        typical: tx(locale, "Your answers match typical color vision.", "你的答案与常见色觉一致。"),
        "red-green": tx(locale, "You missed several red-green plates, a pattern seen with red-green color vision deficiency.", "你答错了几张红绿色板，这和红绿色觉异常的表现相符。"),
        "blue-yellow": tx(locale, "You missed the blue-yellow plate, which can point to a blue-yellow difference.", "你答错了蓝黄色板，可能存在蓝黄色觉差异。"),
        unclear: tx(locale, "The control plate was missed, so the result is unclear. Check your screen brightness and try again.", "对照板答错了，结果不明确。请检查屏幕亮度后重试。"),
      }[score.result]
    : "";

  return (
    <>
      {!finished ? (
        <>
          <p className="text-sm font-medium">{tx(locale, `Plate ${step + 1} of ${PLATES.length}: what number do you see?`, `第 ${step + 1}/${PLATES.length} 张：你看到的数字是？`)}</p>
          <canvas ref={canvas} width={360} height={360} className="mx-auto block aspect-square w-full max-w-[360px] rounded-full" aria-label={tx(locale, "Color vision test plate", "色觉测试图")} />
          <form className="flex flex-wrap items-end justify-center gap-3" onSubmit={(event) => { event.preventDefault(); submit(value); }}>
            <Field label={tx(locale, "Number", "数字")}><TextInput inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} /></Field>
            <ActionButton type="submit" data-action="run">{tx(locale, "Next", "下一张")}</ActionButton>
            <ActionButton type="button" tone="quiet" onClick={() => submit("")}>{tx(locale, "I can't see a number", "看不出数字")}</ActionButton>
          </form>
        </>
      ) : (
        <>
          <ResultText>{`${tx(locale, `${score!.correct} of ${score!.total} correct. `, `答对 ${score!.correct}/${score!.total}。`)}${summary}`}</ResultText>
          <ActionButton type="button" data-action="run" onClick={() => { setStep(0); setAnswers([]); }}>{tx(locale, "Take the test again", "重新测试")}</ActionButton>
        </>
      )}
      <p className="text-xs text-muted-foreground">{tx(locale, "A quick screening inspired by Ishihara plates, drawn in your browser. Screens vary, so this is not a medical diagnosis; an eye care professional can test you properly.", "参考石原氏色板思路、在浏览器里绘制的快速筛查。不同屏幕显示有差异，结果不是医学诊断；准确检查请咨询眼科专业人员。")}</p>
    </>
  );
}

/* Gamepad ---------------------------------------------------------------- */

type PadState = { index: number; id: string; mapping: string; buttons: { pressed: boolean; value: number }[]; axes: number[]; vibration: boolean };

function readPads(): PadState[] {
  return [...(navigator.getGamepads?.() ?? [])].filter((pad): pad is Gamepad => Boolean(pad)).map((pad) => ({
    index: pad.index,
    id: pad.id,
    mapping: pad.mapping,
    buttons: pad.buttons.map((button) => ({ pressed: button.pressed, value: button.value })),
    axes: [...pad.axes],
    vibration: Boolean((pad as Gamepad & { vibrationActuator?: unknown }).vibrationActuator),
  }));
}

const STANDARD_BUTTONS = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "LS", "RS", "↑", "↓", "←", "→", "Home"];

function GamepadTester({ locale }: { locale: string }) {
  const [pads, setPads] = useState<PadState[]>([]);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    if (!("getGamepads" in navigator)) {
      setSupported(false);
      return;
    }
    let frame = 0;
    const loop = () => {
      setPads(readPads());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  async function rumble(index: number) {
    const pad = navigator.getGamepads()[index] as (Gamepad & { vibrationActuator?: { playEffect: (type: string, params: object) => Promise<unknown> } }) | null;
    await pad?.vibrationActuator?.playEffect("dual-rumble", { duration: 600, strongMagnitude: 1, weakMagnitude: 0.6 });
  }

  if (!supported) return <ResultText>{tx(locale, "This browser does not support the Gamepad API.", "此浏览器不支持 Gamepad API。")}</ResultText>;
  if (!pads.length) return <p className="rounded-lg border border-dashed border-input p-8 text-center text-sm" role="status">{tx(locale, "Connect a controller by USB or Bluetooth, then press any button.", "用 USB 或蓝牙连接手柄，然后按任意键。")}</p>;

  return (
    <div className="space-y-6">
      {pads.map((pad) => (
        <section key={pad.index} className="space-y-3" aria-label={pad.id}>
          <p className="text-sm font-semibold">#{pad.index + 1} · {pad.id}{pad.mapping ? ` · ${pad.mapping}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            {pad.buttons.map((button, index) => (
              <span key={index} className={["min-w-12 rounded-md border px-2 py-1 text-center font-mono text-xs", button.pressed ? "border-transparent bg-accent text-accent-fg" : "border-border"].join(" ")} data-button={index}>
                {pad.mapping === "standard" ? STANDARD_BUTTONS[index] ?? index : index}
                {button.value > 0 && button.value < 1 ? ` ${button.value.toFixed(2)}` : ""}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-6">
            {Array.from({ length: Math.ceil(pad.axes.length / 2) }, (_, stick) => {
              const x = pad.axes[stick * 2] ?? 0;
              const y = pad.axes[stick * 2 + 1] ?? 0;
              return (
                <div key={stick} className="text-center">
                  <div className="relative h-28 w-28 rounded-full border-2 border-[#111] bg-background">
                    <span className="absolute h-4 w-4 rounded-full bg-[#3d6df2]" style={{ left: `${50 + x * 42}%`, top: `${50 + y * 42}%`, transform: "translate(-50%, -50%)" }} />
                  </div>
                  <p className="mt-1 font-mono text-xs">{x.toFixed(2)}, {y.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          {pad.vibration ? <ActionButton type="button" tone="quiet" onClick={() => void rumble(pad.index)}>{tx(locale, "Test vibration", "测试震动")}</ActionButton> : null}
          <p className="text-xs text-muted-foreground">{tx(locale, "Sticks resting away from 0.00 by more than about 0.10 point to stick drift.", "摇杆静止时如果偏离 0.00 超过约 0.10，可能存在漂移。")}</p>
        </section>
      ))}
    </div>
  );
}

export function PlayTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  return (
    <ToolPanel>
      {mode === "tic-tac-toe" ? <TicTacToe locale={locale} /> : null}
      {mode === "memory" ? <MemoryGame locale={locale} /> : null}
      {mode === "reaction" ? <ReactionTest locale={locale} /> : null}
      {mode === "color-blind" ? <ColorBlindTest locale={locale} /> : null}
      {mode === "gamepad" ? <GamepadTester locale={locale} /> : null}
    </ToolPanel>
  );
}
