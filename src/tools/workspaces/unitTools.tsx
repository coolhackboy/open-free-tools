import { useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { ActionButton, Field, SelectInput, TextInput, ToolPanel, tx } from "@/tools/controls";
import { UNITS, UNIT_CATEGORIES, categoryOf, convertUnit, findUnit, formatUnitValue, type UnitCategory } from "@/tools/lib/units";

type Props = { tool: FreeTool; locale: string };

const DEFAULT_PAIR: Record<UnitCategory, [string, string]> = {
  length: ["m", "ft"],
  weight: ["kg", "lb"],
  temperature: ["c", "f"],
  area: ["m2", "ft2"],
  volume: ["l", "gal"],
  speed: ["kmh", "mph"],
};

const parse = (text: string) => Number(text.replace(/,/g, "").trim());

export function UnitTool({ tool, locale }: Props) {
  const presetFrom = tool.preset.from;
  const presetCategory = (presetFrom && categoryOf(presetFrom)) || "length";
  const locked = Boolean(presetFrom && tool.preset.to);
  const [category, setCategory] = useState<UnitCategory>(presetCategory);
  const [from, setFrom] = useState(presetFrom || DEFAULT_PAIR.length[0]);
  const [to, setTo] = useState(tool.preset.to || DEFAULT_PAIR.length[1]);
  const [left, setLeft] = useState(tool.preset.value || "1");
  const [right, setRight] = useState(() => {
    const value = parse(tool.preset.value || "1");
    return formatUnitValue(convertUnit(value, presetCategory, presetFrom || DEFAULT_PAIR.length[0], tool.preset.to || DEFAULT_PAIR.length[1]));
  });

  const label = (id: string) => {
    const unit = findUnit(category, id);
    return unit ? `${tx(locale, unit.en, unit.zh)} (${unit.symbol})` : id;
  };

  function recalc(value: string, fromId: string, toId: string, cat = category) {
    const number = parse(value);
    return value.trim() && Number.isFinite(number) ? formatUnitValue(convertUnit(number, cat, fromId, toId)) : "";
  }

  function pickCategory(next: UnitCategory) {
    const [a, b] = DEFAULT_PAIR[next];
    setCategory(next);
    setFrom(a);
    setTo(b);
    setRight(recalc(left, a, b, next));
  }

  const fromUnit = findUnit(category, from);
  const toUnit = findUnit(category, to);
  const one = formatUnitValue(convertUnit(1, category, from, to));
  const table = [1, 2, 5, 10, 20, 50, 100].map((value) => [value, formatUnitValue(convertUnit(value, category, from, to))] as const);

  return (
    <ToolPanel>
      {!locked ? (
        <div role="group" aria-label={tx(locale, "Category", "类别")} className="flex flex-wrap gap-2">
          {UNIT_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => pickCategory(item.id)}
              className={["rounded-full border px-3 py-1.5 text-small font-semibold", category === item.id ? "border-transparent bg-accent text-accent-fg" : "border-border"].join("")}
            >
              {tx(locale, item.en, item.zh)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-2">
          <Field label={label(from)}>
            <TextInput inputMode="decimal" className="text-lg" value={left} data-unit-input="from" onChange={(event) => { setLeft(event.target.value); setRight(recalc(event.target.value, from, to)); }} />
          </Field>
          <SelectInput aria-label={tx(locale, "From unit", "原单位")} value={from} onChange={(event) => { setFrom(event.target.value); setRight(recalc(left, event.target.value, to)); }}>
            {UNITS[category].map((unit) => <option key={unit.id} value={unit.id}>{tx(locale, unit.en, unit.zh)} ({unit.symbol})</option>)}
          </SelectInput>
        </div>
        <ActionButton type="button" tone="quiet" aria-label={tx(locale, "Swap units", "交换单位")} onClick={() => { setFrom(to); setTo(from); setLeft(right); setRight(left); }}>⇄</ActionButton>
        <div className="flex flex-col gap-2">
          <Field label={label(to)}>
            <TextInput inputMode="decimal" className="text-lg" value={right} data-unit-input="to" onChange={(event) => { setRight(event.target.value); setLeft(recalc(event.target.value, to, from)); }} />
          </Field>
          <SelectInput aria-label={tx(locale, "To unit", "目标单位")} value={to} onChange={(event) => { setTo(event.target.value); setRight(recalc(left, from, event.target.value)); }}>
            {UNITS[category].map((unit) => <option key={unit.id} value={unit.id}>{tx(locale, unit.en, unit.zh)} ({unit.symbol})</option>)}
          </SelectInput>
        </div>
      </div>
      {left.trim() && right ? (
        <p className="text-base font-semibold" data-result role="status">{left} {fromUnit?.symbol} = {right} {toUnit?.symbol}</p>
      ) : null}
      {category !== "temperature" ? <p className="text-sm text-muted-foreground">1 {fromUnit?.symbol} = {one} {toUnit?.symbol}</p> : null}
      <table className="w-full max-w-md text-left text-sm">
        <caption className="pb-2 text-left font-medium">{tx(locale, "Quick reference", "速查表")}</caption>
        <thead><tr className="border-b border-border"><th className="py-1">{fromUnit?.symbol}</th><th className="py-1">{toUnit?.symbol}</th></tr></thead>
        <tbody>
          {table.map(([value, out]) => <tr key={value} className="border-b border-border/60"><td className="py-1 font-mono">{value}</td><td className="py-1 font-mono">{out}</td></tr>)}
        </tbody>
      </table>
    </ToolPanel>
  );
}
