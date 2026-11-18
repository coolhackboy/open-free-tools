import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { evaluateExpression } from "@/tools/lib/expr";
import { ActionButton, Field, ResultText, TextInput, ToolPanel, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

const ZONES = ["UTC", "Asia/Shanghai", "Asia/Tokyo", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function payment(principal: number, annualRate: number, years: number) {
  const monthly = annualRate / 100 / 12;
  const count = years * 12;
  if (monthly === 0) return principal / count;
  const factor = (1 + monthly) ** count;
  return (principal * monthly * factor) / (factor - 1);
}

export function CalcTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [birth, setBirth] = useState("2000-01-01");
  const [asOf, setAsOf] = useState("2026-10-12");
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-10-12");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [principal, setPrincipal] = useState("200000");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("30");
  const [part, setPart] = useState("20");
  const [whole, setWhole] = useState("50");
  const [expression, setExpression] = useState("sin(0)+2*3");
  const [grades, setGrades] = useState("A 3\nB 3");
  const [dice, setDice] = useState("2d6");
  const [low, setLow] = useState("1");
  const [high, setHigh] = useState("100");
  const [segments, setSegments] = useState("Yes, No, Maybe");
  const [minutes, setMinutes] = useState("5");
  const [target, setTarget] = useState("2026-12-31T00:00");
  const [result, setResult] = useState("");
  const [clocks, setClocks] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  function run() {
    stop();
    if (mode === "age") {
      const from = new Date(`${birth}T00:00:00`);
      const to = new Date(`${asOf}T00:00:00`);
      let yearsOut = to.getFullYear() - from.getFullYear();
      let months = to.getMonth() - from.getMonth();
      let days = to.getDate() - from.getDate();
      if (days < 0) {
        months -= 1;
        days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
      }
      if (months < 0) {
        yearsOut -= 1;
        months += 12;
      }
      setResult(`${yearsOut} years, ${months} months, ${days} days`);
      return;
    }
    if (mode === "bmi") {
      const meters = Number(height) / 100;
      const value = Number(weight) / (meters * meters);
      const band = value < 18.5 ? "Underweight" : value < 25 ? "Normal" : value < 30 ? "Overweight" : "Obese";
      setResult(`BMI ${value.toFixed(1)} · ${band}`);
      return;
    }
    if (mode === "date") {
      const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
      setResult(`${Math.round(ms / 86400000)} days`);
      return;
    }
    if (mode === "gpa") {
      const points: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
      let quality = 0;
      let hours = 0;
      grades.split(/\n/).forEach((line) => {
        const [grade, credit] = line.trim().split(/\s+/);
        if (!grade || !credit || points[grade.toUpperCase()] === undefined) return;
        quality += points[grade.toUpperCase()] * Number(credit);
        hours += Number(credit);
      });
      setResult(hours ? `GPA ${ (quality / hours).toFixed(2) } · ${hours} ${tx(locale, "hours", "学分")}` : tx(locale, "Add a grade and course hours.", "请输入成绩和学分。"));
      return;
    }
    if (mode === "loan" || mode === "mortgage") {
      const monthly = payment(Number(principal), Number(rate), Number(years));
      const total = monthly * Number(years) * 12;
      setResult(mode === "loan" ? `Monthly ${money(monthly)}` : `Monthly ${money(monthly)} · interest ${money(total - Number(principal))}`);
      return;
    }
    if (mode === "percentage") {
      setResult(`${part} is ${((Number(part) / Number(whole)) * 100).toFixed(1)}% of ${whole}`);
      return;
    }
    if (mode === "scientific") {
      try {
        setResult(String(evaluateExpression(expression)));
      } catch (error) {
        setResult(error instanceof Error ? error.message : "Could not evaluate.");
      }
      return;
    }
    if (mode === "dice") {
      const match = dice.match(/(\d+)d(\d+)/i);
      const count = match ? Number(match[1]) : 1;
      const sides = match ? Number(match[2]) : 6;
      const rolls = Array.from({ length: Math.min(count, 20) }, () => 1 + Math.floor(Math.random() * sides));
      setResult(`Rolled ${rolls.join(" + ")} · total ${rolls.reduce((sum, value) => sum + value, 0)}`);
      return;
    }
    if (mode === "coin") {
      setResult(Math.random() < 0.5 ? "Heads" : "Tails");
      return;
    }
    if (mode === "random") {
      const min = Math.ceil(Number(low));
      const max = Math.floor(Number(high));
      setResult(String(min + Math.floor(Math.random() * (max - min + 1))));
      return;
    }
    if (mode === "wheel") {
      const items = segments.split(",").map((item) => item.trim()).filter(Boolean);
      setResult(items[Math.floor(Math.random() * items.length)] || "Add segments.");
      return;
    }
    if (mode === "world") {
      const format = () => ZONES.map((zone) => `${zone} ${new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date())}`);
      setClocks(format());
      setResult(format().join(" · "));
      timer.current = window.setInterval(() => {
        const next = format();
        setClocks(next);
        setResult(next.join(" · "));
      }, 1000);
      return;
    }
    const seconds = mode === "pomodoro" ? 25 * 60 : mode === "countdown"
      ? Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000))
      : mode === "stopwatch"
        ? 0
        : Math.max(1, Number(minutes)) * 60;
    let left = seconds;
    const label = mode === "pomodoro" ? "Focus" : mode === "stopwatch" ? "Running" : mode === "countdown" ? "Remaining" : "Running";
    const paint = () => {
      const mm = String(Math.floor(Math.abs(left) / 60)).padStart(2, "0");
      const ss = String(Math.abs(left) % 60).padStart(2, "0");
      setResult(`${label} ${mm}:${ss}`);
    };
    paint();
    timer.current = window.setInterval(() => {
      left += mode === "stopwatch" ? 1 : -1;
      if (mode !== "stopwatch" && left <= 0) {
        left = 0;
        paint();
        stop();
        return;
      }
      paint();
    }, 1000);
  }

  return (
    <ToolPanel>
      <div className="flex flex-wrap gap-3">
        {mode === "age" ? (
          <>
            <Field label={tx(locale, "Birth date", "出生日期")}><TextInput type="date" value={birth} onChange={(event) => setBirth(event.target.value)} /></Field>
            <Field label={tx(locale, "As of", "计算到")}><TextInput type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "bmi" ? (
          <>
            <Field label={tx(locale, "Weight kg", "体重 kg")}><TextInput value={weight} onChange={(event) => setWeight(event.target.value)} /></Field>
            <Field label={tx(locale, "Height cm", "身高 cm")}><TextInput value={height} onChange={(event) => setHeight(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "date" ? (
          <>
            <Field label={tx(locale, "Start", "开始")}><TextInput type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
            <Field label={tx(locale, "End", "结束")}><TextInput type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "gpa" ? (
          <Field label={tx(locale, "Grade and course hours", "成绩和学分")}><textarea className="min-h-24 rounded-md border border-input bg-background p-2 text-sm" value={grades} onChange={(event) => setGrades(event.target.value)} /></Field>
        ) : null}
        {mode === "loan" || mode === "mortgage" ? (
          <>
            <Field label={tx(locale, "Principal", "本金")}><TextInput value={principal} onChange={(event) => setPrincipal(event.target.value)} /></Field>
            <Field label={tx(locale, "Rate %", "年利率 %")}><TextInput value={rate} onChange={(event) => setRate(event.target.value)} /></Field>
            <Field label={tx(locale, "Years", "年数")}><TextInput value={years} onChange={(event) => setYears(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "percentage" ? (
          <>
            <Field label={tx(locale, "Part", "部分")}><TextInput value={part} onChange={(event) => setPart(event.target.value)} /></Field>
            <Field label={tx(locale, "Whole", "整体")}><TextInput value={whole} onChange={(event) => setWhole(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "scientific" ? <Field label={tx(locale, "Expression", "算式")}><TextInput value={expression} onChange={(event) => setExpression(event.target.value)} /></Field> : null}
        {mode === "dice" ? <Field label={tx(locale, "Dice", "骰子")}><TextInput value={dice} onChange={(event) => setDice(event.target.value)} /></Field> : null}
        {mode === "random" ? (
          <>
            <Field label={tx(locale, "Min", "最小")}><TextInput value={low} onChange={(event) => setLow(event.target.value)} /></Field>
            <Field label={tx(locale, "Max", "最大")}><TextInput value={high} onChange={(event) => setHigh(event.target.value)} /></Field>
          </>
        ) : null}
        {mode === "wheel" ? <Field label={tx(locale, "Segments", "分区")}><TextInput value={segments} onChange={(event) => setSegments(event.target.value)} /></Field> : null}
        {mode === "timer" ? <Field label={tx(locale, "Minutes", "分钟")}><TextInput value={minutes} onChange={(event) => setMinutes(event.target.value)} /></Field> : null}
        {mode === "countdown" ? <Field label={tx(locale, "Target", "目标时间")}><TextInput type="datetime-local" value={target} onChange={(event) => setTarget(event.target.value)} /></Field> : null}
      </div>
      <ActionButton data-action="run" onClick={run}>{tx(locale, mode === "coin" ? "Flip" : mode === "dice" ? "Roll" : mode === "wheel" ? "Spin" : "Run", mode === "coin" ? "抛硬币" : mode === "dice" ? "掷骰" : mode === "wheel" ? "转动" : "运行")}</ActionButton>
      {clocks.length ? <ul className="grid gap-1 text-sm sm:grid-cols-2">{clocks.map((line) => <li key={line}>{line}</li>)}</ul> : null}
      <ResultText>{result}</ResultText>
    </ToolPanel>
  );
}
