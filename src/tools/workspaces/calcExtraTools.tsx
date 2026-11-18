import { useState, type ReactNode } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { Field, SelectInput, TextInput, ToolPanel, tx } from "@/tools/controls";
import { ACTIVITY_LEVELS, calories, compoundInterest, discount, salary, tip, type CompoundFrequency, type PayPeriod, type Sex } from "@/tools/lib/finance";
import { fromRoman, toRoman } from "@/tools/lib/roman";

type Props = { tool: FreeTool; locale: string };

export const CALC_EXTRA_MODES = new Set(["tip", "discount", "compound", "calorie", "bmr", "salary", "hourly", "roman"]);

const num = (text: string) => Number(String(text).replace(/,/g, "").trim());

/** Deterministic grouping so server and browser render the same digits. */
function fmt(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const [whole, fraction] = Math.abs(value).toFixed(digits).split(".");
  return `${value < 0 ? "-" : ""}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}

function Stat({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={["rounded-md border p-3", strong ? "border-accent-ink bg-accent-soft" : "border-border"].join(" ")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={["font-mono", strong ? "text-xl font-semibold" : "text-base"].join(" ")} data-stat>{value}</dd>
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return (
    <Field label={label}>
      <TextInput inputMode="decimal" type="number" step={step ?? "any"} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function TipCalc({ locale }: { locale: string }) {
  const [bill, setBill] = useState("86.40");
  const [percent, setPercent] = useState("18");
  const [people, setPeople] = useState("3");
  const [round, setRound] = useState(false);
  const out = tip(num(bill), num(percent), num(people), round);
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <NumberField label={tx(locale, "Bill amount", "账单金额")} value={bill} onChange={setBill} />
        <NumberField label={tx(locale, "Tip %", "小费 %")} value={percent} onChange={setPercent} />
        <NumberField label={tx(locale, "People", "人数")} value={people} onChange={setPeople} step="1" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[10, 15, 18, 20, 25].map((value) => (
          <button key={value} type="button" aria-pressed={num(percent) === value} onClick={() => setPercent(String(value))} className={["rounded-full border px-3 py-1 text-xs font-semibold", num(percent) === value ? "border-transparent bg-accent text-accent-fg" : "border-border"].join(" ")}>{value}%</button>
        ))}
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={round} onChange={(event) => setRound(event.target.checked)} />{tx(locale, "Round each share up", "每人金额向上取整")}</label>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Stat strong label={tx(locale, "Each person pays", "每人支付")} value={fmt(out.perPerson)} />
        <Stat label={tx(locale, "Tip", "小费")} value={fmt(out.tip)} />
        <Stat label={tx(locale, "Total with tip", "含小费总额")} value={fmt(out.total)} />
        <Stat label={tx(locale, "Tip per person", "每人小费")} value={fmt(out.tipPerPerson)} />
      </dl>
    </>
  );
}

function DiscountCalc({ locale }: { locale: string }) {
  const [price, setPrice] = useState("120");
  const [percent, setPercent] = useState("25");
  const [extra, setExtra] = useState("0");
  const [tax, setTax] = useState("0");
  const out = discount(num(price), num(percent), num(extra), num(tax));
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <NumberField label={tx(locale, "Original price", "原价")} value={price} onChange={setPrice} />
        <NumberField label={tx(locale, "Discount %", "折扣 %")} value={percent} onChange={setPercent} />
        <NumberField label={tx(locale, "Extra discount %", "叠加折扣 %")} value={extra} onChange={setExtra} />
        <NumberField label={tx(locale, "Sales tax %", "税率 %")} value={tax} onChange={setTax} />
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Stat strong label={tx(locale, "Final price", "到手价")} value={fmt(out.final)} />
        <Stat label={tx(locale, "You save", "节省")} value={fmt(out.saved)} />
        <Stat label={tx(locale, "Total discount", "总折扣")} value={`${fmt(out.effectivePercent, 1)}%`} />
        <Stat label={tx(locale, "Tax", "税额")} value={fmt(out.tax)} />
      </dl>
      <p className="text-xs text-muted-foreground">{tx(locale, "Two discounts stack on each other: 20% then 10% is 28% off, not 30%.", "两次折扣是叠加计算的：先打 8 折再打 9 折等于 7.2 折，不是 7 折。")}</p>
    </>
  );
}

function CompoundCalc({ locale }: { locale: string }) {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("10");
  const [monthly, setMonthly] = useState("200");
  const [frequency, setFrequency] = useState<CompoundFrequency>(12);
  const out = compoundInterest(num(principal), num(rate), Math.min(100, num(years)), frequency, num(monthly));
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <NumberField label={tx(locale, "Starting amount", "初始本金")} value={principal} onChange={setPrincipal} />
        <NumberField label={tx(locale, "Annual rate %", "年利率 %")} value={rate} onChange={setRate} />
        <NumberField label={tx(locale, "Years", "年数")} value={years} onChange={setYears} />
        <NumberField label={tx(locale, "Monthly contribution", "每月追加")} value={monthly} onChange={setMonthly} />
        <Field label={tx(locale, "Compounding", "复利频率")}>
          <SelectInput value={frequency} onChange={(event) => setFrequency(Number(event.target.value) as CompoundFrequency)}>
            <option value={1}>{tx(locale, "Yearly", "每年")}</option>
            <option value={2}>{tx(locale, "Half-yearly", "每半年")}</option>
            <option value={4}>{tx(locale, "Quarterly", "每季度")}</option>
            <option value={12}>{tx(locale, "Monthly", "每月")}</option>
            <option value={52}>{tx(locale, "Weekly", "每周")}</option>
            <option value={365}>{tx(locale, "Daily", "每天")}</option>
          </SelectInput>
        </Field>
      </div>
      <dl className="grid gap-2 sm:grid-cols-3">
        <Stat strong label={tx(locale, "Future balance", "到期金额")} value={fmt(out.balance)} />
        <Stat label={tx(locale, "Total contributed", "累计投入")} value={fmt(out.contributed)} />
        <Stat label={tx(locale, "Interest earned", "利息收益")} value={fmt(out.interest)} />
      </dl>
      {out.schedule.length ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="pb-2 text-left font-medium">{tx(locale, "Year by year", "逐年明细")}</caption>
            <thead><tr className="border-b border-border"><th className="py-1">{tx(locale, "Year", "年")}</th><th className="py-1">{tx(locale, "Contributed", "投入")}</th><th className="py-1">{tx(locale, "Interest", "利息")}</th><th className="py-1">{tx(locale, "Balance", "余额")}</th></tr></thead>
            <tbody>
              {out.schedule.map((row) => (
                <tr key={row.year} className="border-b border-border/60 font-mono"><td className="py-1">{row.year}</td><td className="py-1">{fmt(row.contributed)}</td><td className="py-1">{fmt(row.interest)}</td><td className="py-1">{fmt(row.balance)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function CalorieCalc({ locale, bmrOnly }: { locale: string; bmrOnly: boolean }) {
  const [sex, setSex] = useState<Sex>("female");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("65");
  const [height, setHeight] = useState("168");
  const [activity, setActivity] = useState<string>("moderate");
  const factor = ACTIVITY_LEVELS.find((item) => item.id === activity)?.factor ?? 1.55;
  const out = calories(sex, num(weight), num(height), num(age), factor);
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Sex", "性别")}>
          <SelectInput value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
            <option value="female">{tx(locale, "Female", "女")}</option>
            <option value="male">{tx(locale, "Male", "男")}</option>
          </SelectInput>
        </Field>
        <NumberField label={tx(locale, "Age", "年龄")} value={age} onChange={setAge} step="1" />
        <NumberField label={tx(locale, "Weight kg", "体重 kg")} value={weight} onChange={setWeight} />
        <NumberField label={tx(locale, "Height cm", "身高 cm")} value={height} onChange={setHeight} />
        {!bmrOnly ? (
          <Field label={tx(locale, "Activity", "活动量")}>
            <SelectInput value={activity} onChange={(event) => setActivity(event.target.value)}>
              {ACTIVITY_LEVELS.map((item) => <option key={item.id} value={item.id}>{tx(locale, item.en, item.zh)}</option>)}
            </SelectInput>
          </Field>
        ) : null}
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {bmrOnly ? (
          <>
            <Stat strong label={tx(locale, "BMR (kcal/day)", "基础代谢 BMR（千卡/天）")} value={fmt(out.bmr, 0)} />
            {ACTIVITY_LEVELS.map((item) => <Stat key={item.id} label={tx(locale, item.en, item.zh)} value={fmt(out.bmr * item.factor, 0)} />)}
          </>
        ) : (
          <>
            <Stat strong label={tx(locale, "Maintain weight (kcal/day)", "维持体重（千卡/天）")} value={fmt(out.maintain, 0)} />
            <Stat label={tx(locale, "Mild loss, about 0.25 kg/week", "轻度减重，约 0.25 kg/周")} value={fmt(out.mildLoss, 0)} />
            <Stat label={tx(locale, "Loss, about 0.5 kg/week", "减重，约 0.5 kg/周")} value={fmt(out.loss, 0)} />
            <Stat label={tx(locale, "Gain, about 0.5 kg/week", "增重，约 0.5 kg/周")} value={fmt(out.gain, 0)} />
            <Stat label={tx(locale, "BMR (at rest)", "基础代谢 BMR")} value={fmt(out.bmr, 0)} />
          </>
        )}
      </dl>
      <p className="text-xs text-muted-foreground">{tx(locale, "Mifflin-St Jeor equation. Estimates for healthy adults, not medical advice.", "使用 Mifflin-St Jeor 公式。结果是对健康成年人的估算，不构成医疗建议。")}</p>
    </>
  );
}

const PERIODS: [PayPeriod, string, string][] = [
  ["hour", "Hourly", "时薪"],
  ["day", "Daily", "日薪"],
  ["week", "Weekly", "周薪"],
  ["biweek", "Every two weeks", "双周薪"],
  ["month", "Monthly", "月薪"],
  ["year", "Yearly", "年薪"],
];

function SalaryCalc({ locale, hourlyFirst }: { locale: string; hourlyFirst: boolean }) {
  const [amount, setAmount] = useState(hourlyFirst ? "25" : "60000");
  const [period, setPeriod] = useState<PayPeriod>(hourlyFirst ? "hour" : "year");
  const [hours, setHours] = useState("40");
  const [weeks, setWeeks] = useState("52");
  const [days, setDays] = useState("5");
  const out = salary(num(amount), period, num(hours), num(weeks), num(days));
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <NumberField label={tx(locale, "Pay", "薪资")} value={amount} onChange={setAmount} />
        <Field label={tx(locale, "Per", "周期")}>
          <SelectInput value={period} onChange={(event) => setPeriod(event.target.value as PayPeriod)}>
            {PERIODS.map(([id, en, zh]) => <option key={id} value={id}>{tx(locale, en, zh)}</option>)}
          </SelectInput>
        </Field>
        <NumberField label={tx(locale, "Hours per week", "每周工时")} value={hours} onChange={setHours} />
        <NumberField label={tx(locale, "Days per week", "每周天数")} value={days} onChange={setDays} />
        <NumberField label={tx(locale, "Paid weeks per year", "每年带薪周数")} value={weeks} onChange={setWeeks} />
      </div>
      <dl className="grid gap-2 sm:grid-cols-3">
        {PERIODS.map(([id, en, zh]) => <Stat key={id} strong={id === (hourlyFirst ? "year" : "hour")} label={tx(locale, en, zh)} value={fmt(out[id])} />)}
      </dl>
      <p className="text-xs text-muted-foreground">{tx(locale, "Gross pay before tax. 40 hours × 52 weeks = 2,080 working hours a year.", "按税前收入计算。40 小时 × 52 周 = 每年 2,080 个工作小时。")}</p>
    </>
  );
}

function RomanCalc({ locale }: { locale: string }) {
  const [number, setNumber] = useState("2026");
  const [roman, setRoman] = useState("MMXXVI");
  const [error, setError] = useState("");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx(locale, "Number (1–3999)", "数字（1–3999）")}>
          <TextInput
            inputMode="numeric"
            className="text-lg"
            value={number}
            onChange={(event) => {
              setNumber(event.target.value);
              try {
                setRoman(toRoman(Number(event.target.value)));
                setError("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : String(reason));
              }
            }}
          />
        </Field>
        <Field label={tx(locale, "Roman numeral", "罗马数字")}>
          <TextInput
            className="font-serif text-lg uppercase tracking-wider"
            value={roman}
            onChange={(event) => {
              setRoman(event.target.value.toUpperCase());
              try {
                setNumber(String(fromRoman(event.target.value)));
                setError("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : String(reason));
              }
            }}
          />
        </Field>
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : <p className="text-base font-semibold" role="status">{number} = {roman}</p>}
      <p className="text-xs text-muted-foreground">I = 1 · V = 5 · X = 10 · L = 50 · C = 100 · D = 500 · M = 1000</p>
    </>
  );
}

export function CalcExtraTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  return (
    <ToolPanel>
      {mode === "tip" ? <TipCalc locale={locale} /> : null}
      {mode === "discount" ? <DiscountCalc locale={locale} /> : null}
      {mode === "compound" ? <CompoundCalc locale={locale} /> : null}
      {mode === "calorie" || mode === "bmr" ? <CalorieCalc locale={locale} bmrOnly={mode === "bmr"} /> : null}
      {mode === "salary" || mode === "hourly" ? <SalaryCalc locale={locale} hourlyFirst={mode === "hourly"} /> : null}
      {mode === "roman" ? <RomanCalc locale={locale} /> : null}
    </ToolPanel>
  );
}
