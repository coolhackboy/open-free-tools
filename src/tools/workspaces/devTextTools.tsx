import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActionButton, Field, ResultText, SelectInput, TextInput, tx } from "@/tools/controls";
import { Area, Check, ErrorLine, Output, Segmented, message, useNow, type DevProps } from "@/tools/workspaces/devShared";
import {
  CASES,
  convertBase,
  convertCase,
  dedupeLines,
  describeCron,
  describeTimestamp,
  groupDigits,
  lorem,
  nextCronRuns,
  parseCron,
  parseTimestamp,
  relativeTime,
  runRegex,
  sortLines,
  type CaseName,
  type LoremUnit,
  type RegexMatch,
  type SortOrder,
  type TimestampUnit,
} from "@/tools/lib/devText";

/* Regex ------------------------------------------------------------------ */

type RegexReply = { ok: true; matches: RegexMatch[]; replaced: string | null } | { ok: false; error: string };

const REGEX_TIMEOUT_MS = 1500;

function regexWorkerUrl() {
  // runRegex is self-contained, so its source can run inside a Blob worker that we can terminate on runaway backtracking.
  const source = `const runRegex = ${runRegex.toString()};
self.onmessage = (event) => {
  const { pattern, flags, input, limit, replacement } = event.data;
  try {
    const matches = runRegex(pattern, flags, input, limit);
    const replaced = replacement === null ? null : input.replace(new RegExp(pattern, flags), replacement);
    self.postMessage({ ok: true, matches, replaced });
  } catch (error) {
    self.postMessage({ ok: false, error: String((error && error.message) || error) });
  }
};`;
  return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}

function highlight(input: string, matches: RegexMatch[]) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.index < cursor) return;
    parts.push(input.slice(cursor, match.index));
    parts.push(<mark key={index} className="rounded bg-accent px-0.5 text-accent-fg">{match.text || "∅"}</mark>);
    cursor = match.index + match.text.length;
  });
  parts.push(input.slice(cursor));
  return parts;
}

export function RegexTool({ locale }: DevProps) {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)\\.com");
  const [flags, setFlags] = useState("gi");
  const [input, setInput] = useState("Contact ana@example.com or BOB@example.org for help.");
  const [replacement, setReplacement] = useState("");
  const [useReplace, setUseReplace] = useState(false);
  const [reply, setReply] = useState<RegexReply | null>(null);
  const [busy, setBusy] = useState(false);
  const worker = useRef<{ worker: Worker; url: string } | null>(null);

  useEffect(() => () => {
    if (worker.current) {
      worker.current.worker.terminate();
      URL.revokeObjectURL(worker.current.url);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!pattern) {
        setReply(null);
        return;
      }
      if (!worker.current) {
        const url = regexWorkerUrl();
        worker.current = { worker: new Worker(url), url };
      }
      const current = worker.current;
      setBusy(true);
      const timeout = window.setTimeout(() => {
        current.worker.terminate();
        URL.revokeObjectURL(current.url);
        worker.current = null;
        setBusy(false);
        setReply({ ok: false, error: tx(locale, `Stopped after ${REGEX_TIMEOUT_MS / 1000}s. The pattern may backtrack catastrophically.`, `运行超过 ${REGEX_TIMEOUT_MS / 1000} 秒已停止，这个表达式可能出现灾难性回溯。`) });
      }, REGEX_TIMEOUT_MS);
      current.worker.onmessage = (event: MessageEvent<RegexReply>) => {
        window.clearTimeout(timeout);
        setBusy(false);
        setReply(event.data);
      };
      current.worker.postMessage({ pattern, flags, input, limit: 1000, replacement: useReplace ? replacement : null });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [pattern, flags, input, replacement, useReplace, locale]);

  const matches = reply?.ok ? reply.matches : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Field label={tx(locale, "Pattern", "正则表达式")}><TextInput className="font-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} /></Field>
        <Field label={tx(locale, "Flags", "标志")}><TextInput className="w-24 font-mono" value={flags} onChange={(event) => setFlags(event.target.value.replace(/[^dgimsuyv]/g, ""))} /></Field>
      </div>
      <p className="text-xs text-muted-foreground">{tx(locale, "JavaScript (ECMAScript) syntax. Flags: g global, i ignore case, m multiline, s dotAll, u unicode, y sticky, d indices.", "使用 JavaScript（ECMAScript）语法。标志：g 全局、i 忽略大小写、m 多行、s 点号匹配换行、u Unicode、y 粘连、d 索引。")}</p>
      <Field label={tx(locale, "Test string", "测试文本")}><Area value={input} onChange={(event) => setInput(event.target.value)} /></Field>
      <div className="flex flex-wrap items-end gap-3">
        <Check label={tx(locale, "Replace", "替换")} checked={useReplace} onChange={setUseReplace} />
        {useReplace ? <Field label={tx(locale, "Replacement ($1, $<name>)", "替换为（$1、$<name>）")}><TextInput className="font-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} /></Field> : null}
      </div>
      {busy ? <p className="text-sm text-muted-foreground">{tx(locale, "Matching…", "匹配中…")}</p> : null}
      {reply && !reply.ok ? <ErrorLine>{reply.error}</ErrorLine> : null}
      {reply?.ok ? (
        <>
          <ResultText>{tx(locale, `${matches.length} match${matches.length === 1 ? "" : "es"}`, `${matches.length} 处匹配`)}</ResultText>
          <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-sm" data-regex-preview>{highlight(input, matches)}</pre>
          {matches.length ? (
            <ol className="space-y-1 text-sm">
              {matches.slice(0, 100).map((match, index) => (
                <li key={`${match.index}-${index}`} className="font-mono">
                  #{index + 1} @{match.index}: “{match.text}”
                  {match.groups.length ? <span className="text-muted-foreground"> · {match.groups.map((group, at) => `$${at + 1}=${group ?? "∅"}`).join(" · ")}</span> : null}
                  {match.named ? <span className="text-muted-foreground"> · {Object.entries(match.named).map(([key, value]) => `${key}=${value}`).join(" · ")}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
          {reply.replaced !== null ? <Output label={tx(locale, "Replaced text", "替换结果")} value={reply.replaced} locale={locale} /> : null}
        </>
      ) : null}
    </div>
  );
}

/* Case ------------------------------------------------------------------- */

const CASE_LABELS: Record<CaseName, [string, string]> = {
  upper: ["UPPERCASE", "大写"],
  lower: ["lowercase", "小写"],
  title: ["Title Case", "标题格式"],
  sentence: ["Sentence case", "句首大写"],
  camel: ["camelCase", "小驼峰"],
  pascal: ["PascalCase", "大驼峰"],
  snake: ["snake_case", "下划线"],
  kebab: ["kebab-case", "短横线"],
  constant: ["CONSTANT_CASE", "常量格式"],
};

export function CaseTool({ locale, preset }: DevProps) {
  const [name, setName] = useState<CaseName>((CASES as readonly string[]).includes(preset.case) ? (preset.case as CaseName) : "title");
  const [input, setInput] = useState("the quick brown fox jumps over the lazy dog. it was fast!");
  const output = convertCase(input, name);
  return (
    <div className="space-y-4">
      <Segmented label={tx(locale, "Case", "格式")} value={name} options={CASES.map((item) => [item, tx(locale, ...CASE_LABELS[item])])} onChange={setName} />
      <Field label={tx(locale, "Text", "文本")}><Area value={input} onChange={(event) => setInput(event.target.value)} /></Field>
      <Output label={tx(locale, CASE_LABELS[name][0], CASE_LABELS[name][1])} value={output} locale={locale} filename="text.txt" />
      <p className="text-xs text-muted-foreground">{tx(locale, `${input.length} characters`, `${input.length} 个字符`)}</p>
    </div>
  );
}

/* Lorem ipsum ------------------------------------------------------------ */

export function LoremTool({ locale }: DevProps) {
  const [count, setCount] = useState("3");
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [classic, setClassic] = useState(true);
  const [html, setHtml] = useState(false);
  const [seed, setSeed] = useState(1);
  const text = lorem(Number(count) || 1, unit, seed, classic);
  const output = html && unit === "paragraphs" ? text.split("\n\n").map((item) => `<p>${item}</p>`).join("\n") : text;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Amount", "数量")}><TextInput type="number" min={1} value={count} onChange={(event) => setCount(event.target.value)} /></Field>
        <Segmented label={tx(locale, "Unit", "单位")} value={unit} options={[["paragraphs", tx(locale, "Paragraphs", "段落")], ["sentences", tx(locale, "Sentences", "句子")], ["words", tx(locale, "Words", "单词")]]} onChange={setUnit} />
        <ActionButton type="button" data-action="run" onClick={() => setSeed((value) => value + 1)}>{tx(locale, "Regenerate", "重新生成")}</ActionButton>
      </div>
      <div className="flex flex-wrap gap-4">
        <Check label={tx(locale, "Start with “Lorem ipsum dolor sit amet”", "以 “Lorem ipsum dolor sit amet” 开头")} checked={classic} onChange={setClassic} />
        {unit === "paragraphs" ? <Check label={tx(locale, "Wrap in <p> tags", "用 <p> 标签包裹")} checked={html} onChange={setHtml} /> : null}
      </div>
      <Output label={tx(locale, "Placeholder text", "占位文本")} value={output} locale={locale} filename="lorem-ipsum.txt" rows={10} />
      <p className="text-xs text-muted-foreground">{tx(locale, `${output.split(/\s+/).filter(Boolean).length} words`, `${output.split(/\s+/).filter(Boolean).length} 个单词`)}</p>
    </div>
  );
}

/* Lines ------------------------------------------------------------------ */

const SAMPLE_LINES = "banana\napple\nCherry\napple\n\nbanana\nitem 10\nitem 2\nApple";

export function LinesTool({ locale, preset }: DevProps) {
  const sortFirst = preset.mode === "sort";
  const [action, setAction] = useState<"dedupe" | "sort">(sortFirst ? "sort" : "dedupe");
  const [input, setInput] = useState(SAMPLE_LINES);
  const [order, setOrder] = useState<SortOrder>("az");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [trim, setTrim] = useState(true);
  const [dropEmpty, setDropEmpty] = useState(true);
  const [alsoDedupe, setAlsoDedupe] = useState(false);
  const [seed, setSeed] = useState(1);
  const options = { ignoreCase, trim, dropEmpty };

  const result = useMemo(() => {
    if (action === "dedupe") {
      const out = dedupeLines(input, options);
      return { text: out.text, note: tx(locale, `${out.before} lines → ${out.after} lines (${out.before - out.after} removed)`, `${out.before} 行 → ${out.after} 行（删除 ${out.before - out.after} 行）`) };
    }
    const source = alsoDedupe ? dedupeLines(input, options).text : input;
    const text = sortLines(source, order, { ...options, seed, locale });
    return { text, note: tx(locale, `${text ? text.split("\n").length : 0} lines`, `${text ? text.split("\n").length : 0} 行`) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, input, order, ignoreCase, trim, dropEmpty, alsoDedupe, seed, locale]);

  return (
    <div className="space-y-4">
      <Segmented label={tx(locale, "Action", "操作")} value={action} options={[["dedupe", tx(locale, "Remove duplicates", "删除重复行")], ["sort", tx(locale, "Sort lines", "排序")]]} onChange={setAction} />
      {action === "sort" ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={tx(locale, "Order", "顺序")}>
            <SelectInput value={order} onChange={(event) => setOrder(event.target.value as SortOrder)}>
              <option value="az">{tx(locale, "A → Z", "A → Z")}</option>
              <option value="za">{tx(locale, "Z → A", "Z → A")}</option>
              <option value="natural">{tx(locale, "Natural (item 2 before item 10)", "自然顺序（item 2 在 item 10 前）")}</option>
              <option value="length">{tx(locale, "By length", "按长度")}</option>
              <option value="reverse">{tx(locale, "Reverse current order", "倒序")}</option>
              <option value="shuffle">{tx(locale, "Shuffle", "随机打乱")}</option>
            </SelectInput>
          </Field>
          {order === "shuffle" ? <ActionButton type="button" onClick={() => setSeed((value) => value + 1)}>{tx(locale, "Shuffle again", "再打乱一次")}</ActionButton> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Check label={tx(locale, "Ignore case", "忽略大小写")} checked={ignoreCase} onChange={setIgnoreCase} />
        <Check label={tx(locale, "Trim spaces", "去掉首尾空格")} checked={trim} onChange={setTrim} />
        <Check label={tx(locale, "Remove empty lines", "删除空行")} checked={dropEmpty} onChange={setDropEmpty} />
        {action === "sort" ? <Check label={tx(locale, "Also remove duplicates", "同时去重")} checked={alsoDedupe} onChange={setAlsoDedupe} /> : null}
      </div>
      <Field label={tx(locale, "One item per line", "每行一项")}><Area value={input} onChange={(event) => setInput(event.target.value)} rows={10} /></Field>
      <ResultText>{result.note}</ResultText>
      <Output label={tx(locale, "Result", "结果")} value={result.text} locale={locale} filename="lines.txt" rows={10} />
    </div>
  );
}

/* Unix timestamp --------------------------------------------------------- */

export function TimestampTool({ locale }: DevProps) {
  const now = useNow();
  const [input, setInput] = useState("1767225600");
  const [unit, setUnit] = useState<TimestampUnit>("auto");
  const parsed = useMemo(() => {
    try {
      const value = parseTimestamp(input, unit);
      return { value, info: describeTimestamp(value.ms) };
    } catch (error) {
      return { error: message(error) };
    }
  }, [input, unit]);
  const rows: [string, string][] = parsed.info
    ? [
        [tx(locale, "Unix seconds", "Unix 秒"), String(parsed.info.seconds)],
        [tx(locale, "Unix milliseconds", "Unix 毫秒"), String(parsed.info.milliseconds)],
        ["ISO 8601 (UTC)", parsed.info.iso],
        ["UTC", parsed.info.utc],
      ]
    : [];
  // Local time and "x ago" depend on the visitor's clock and zone, so they only appear after hydration.
  if (parsed.info && now !== null) {
    rows.push([tx(locale, "Your local time", "本地时间"), new Date(parsed.value!.ms).toLocaleString(locale, { dateStyle: "full", timeStyle: "long" })]);
    rows.push([tx(locale, "Relative", "相对时间"), relativeTime(parsed.value!.ms, now, locale)]);
  }
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-3 text-sm">
        <span className="text-muted-foreground">{tx(locale, "Current Unix time: ", "当前 Unix 时间：")}</span>
        <span className="font-mono font-semibold" data-now>{now === null ? "…" : Math.floor(now / 1000)}</span>
        <ActionButton type="button" tone="quiet" className="ml-3" disabled={now === null} onClick={() => now !== null && setInput(String(Math.floor(now / 1000)))}>{tx(locale, "Use now", "使用当前时间")}</ActionButton>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Timestamp or date", "时间戳或日期")}><TextInput className="font-mono" value={input} onChange={(event) => setInput(event.target.value)} /></Field>
        <Field label={tx(locale, "Unit", "单位")}>
          <SelectInput value={unit} onChange={(event) => setUnit(event.target.value as TimestampUnit)}>
            <option value="auto">{tx(locale, "Detect", "自动识别")}</option>
            <option value="s">{tx(locale, "Seconds", "秒")}</option>
            <option value="ms">{tx(locale, "Milliseconds", "毫秒")}</option>
            <option value="us">{tx(locale, "Microseconds", "微秒")}</option>
            <option value="ns">{tx(locale, "Nanoseconds", "纳秒")}</option>
          </SelectInput>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">{tx(locale, "Enter epoch seconds, milliseconds, or a date such as 2026-10-24T12:00:00Z. Dates without a zone use your local time.", "可输入 epoch 秒、毫秒，或 2026-10-24T12:00:00Z 这样的日期。不带时区的日期按本地时间处理。")}</p>
      <ErrorLine>{parsed.error}</ErrorLine>
      {rows.length ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/* Cron ------------------------------------------------------------------- */

const CRON_PRESETS: [string, string, string][] = [
  ["* * * * *", "Every minute", "每分钟"],
  ["*/5 * * * *", "Every 5 minutes", "每 5 分钟"],
  ["0 * * * *", "Every hour", "每小时"],
  ["0 0 * * *", "Every day at midnight", "每天 0 点"],
  ["0 9 * * 1-5", "Weekdays at 09:00", "工作日 9 点"],
  ["0 0 * * 0", "Every Sunday", "每周日"],
  ["0 0 1 * *", "First day of the month", "每月 1 日"],
  ["0 0 1 1 *", "Every year on Jan 1", "每年 1 月 1 日"],
];

const CRON_FIELDS: [string, string, string][] = [
  ["Minute", "分钟", "0-59"],
  ["Hour", "小时", "0-23"],
  ["Day of month", "日", "1-31"],
  ["Month", "月", "1-12"],
  ["Day of week", "星期", "0-6"],
];

export function CronTool({ locale }: DevProps) {
  const zh = locale === "zh";
  const now = useNow();
  const [expression, setExpression] = useState("*/15 9-17 * * 1-5");
  const [utc, setUtc] = useState(false);
  const fields = expression.trim().split(/\s+/);
  const parsed = useMemo(() => {
    try {
      return { schedule: parseCron(expression) };
    } catch (error) {
      return { error: message(error) };
    }
  }, [expression]);
  const nextMinute = now === null ? null : Math.floor(now / 60000);
  const runs = useMemo(
    () => (parsed.schedule && nextMinute !== null ? nextCronRuns(parsed.schedule, nextMinute * 60000, 8, utc) : []),
    [parsed.schedule, nextMinute, utc],
  );
  function setField(index: number, value: string) {
    const next = [...(fields.length === 5 ? fields : ["*", "*", "*", "*", "*"])];
    next[index] = value.replace(/\s+/g, "") || "*";
    setExpression(next.join(" "));
  }
  return (
    <div className="space-y-4">
      <Field label={tx(locale, "Cron expression", "Cron 表达式")}><TextInput className="font-mono text-base" value={expression} onChange={(event) => setExpression(event.target.value)} /></Field>
      <div className="grid gap-2 sm:grid-cols-5">
        {CRON_FIELDS.map(([en, cn, range], index) => (
          <Field key={en} label={`${tx(locale, en, cn)} (${range})`}>
            <TextInput className="font-mono" value={fields.length === 5 ? fields[index] : ""} onChange={(event) => setField(index, event.target.value)} />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CRON_PRESETS.map(([value, en, cn]) => (
          <button key={value} type="button" onClick={() => setExpression(value)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-foreground">{tx(locale, en, cn)}</button>
        ))}
      </div>
      <ErrorLine>{parsed.error}</ErrorLine>
      {parsed.schedule ? <ResultText>{describeCron(parsed.schedule, zh)}</ResultText> : null}
      <Check label={tx(locale, "Show next runs in UTC", "按 UTC 显示下次运行")} checked={utc} onChange={setUtc} />
      {runs.length ? (
        <ol className="space-y-1 font-mono text-sm" aria-label={tx(locale, "Next runs", "接下来的运行时间")}>
          {runs.map((time) => (
            <li key={time}>{utc ? new Date(time).toISOString().replace("T", " ").slice(0, 16) + " UTC" : new Date(time).toLocaleString(locale, { weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</li>
          ))}
        </ol>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "Standard 5-field cron (Linux crontab, Kubernetes CronJob, GitHub Actions). Names like MON or JAN and macros like @daily also work.", "标准 5 字段 cron（Linux crontab、Kubernetes CronJob、GitHub Actions）。也支持 MON、JAN 这类名称和 @daily 这类宏。")}</p>
    </div>
  );
}

/* Number base ------------------------------------------------------------ */

const BASES: [number, string, string][] = [
  [2, "Binary", "二进制"],
  [8, "Octal", "八进制"],
  [10, "Decimal", "十进制"],
  [16, "Hexadecimal", "十六进制"],
];

const BASE_SAMPLES: Record<number, string> = { 2: "11111111", 8: "377", 10: "255", 16: "FF" };

export function BaseTool({ locale, preset }: DevProps) {
  const initialFrom = Number(preset.from) || 10;
  const [from, setFrom] = useState(initialFrom);
  const [input, setInput] = useState(BASE_SAMPLES[initialFrom] ?? "255");
  const [custom, setCustom] = useState("36");
  const [grouped, setGrouped] = useState(true);
  const result = useMemo(() => {
    try {
      convertBase(input, from, 10);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: message(error) };
    }
  }, [input, from]);
  const customBase = Math.max(2, Math.min(36, Math.floor(Number(custom)) || 36));
  const targets: [number, string][] = [...BASES.map(([base, en, cn]) => [base, `${tx(locale, en, cn)} (${base})`] as [number, string]), [customBase, tx(locale, `Base ${customBase}`, `${customBase} 进制`)]];
  const show = (base: number) => {
    const value = convertBase(input, from, base);
    const upper = base > 10 ? value.toUpperCase() : value;
    return grouped && base === 2 ? groupDigits(upper, 4) : grouped && base === 16 ? groupDigits(upper, 2) : grouped && base === 10 ? groupDigits(upper, 3).replace(/ /g, ",") : upper;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Number", "数字")}><TextInput className="font-mono text-base" value={input} onChange={(event) => setInput(event.target.value)} /></Field>
        <Field label={tx(locale, "From base", "原进制")}>
          <SelectInput value={from} onChange={(event) => setFrom(Number(event.target.value))}>
            {Array.from({ length: 35 }, (_, index) => index + 2).map((base) => <option key={base} value={base}>{BASES.find(([item]) => item === base)?.[1] ? `${base} · ${tx(locale, BASES.find(([item]) => item === base)![1], BASES.find(([item]) => item === base)![2])}` : base}</option>)}
          </SelectInput>
        </Field>
        <Field label={tx(locale, "Custom base (2–36)", "自定义进制（2–36）")}><TextInput type="number" min={2} max={36} value={custom} onChange={(event) => setCustom(event.target.value)} /></Field>
      </div>
      <Check label={tx(locale, "Group digits", "数字分组")} checked={grouped} onChange={setGrouped} />
      {!result.ok ? <ErrorLine>{result.error}</ErrorLine> : (
        <dl className="grid gap-2 sm:grid-cols-2">
          {targets.map(([base, label]) => {
            const value = show(base);
            return (
              <div key={`${base}-${label}`} className={["rounded-md border p-3", base === (Number(preset.to) || 0) ? "border-accent-ink" : "border-border"].join(" ")}>
                <dt className="flex items-center justify-between text-xs text-muted-foreground">
                  {label}
                  <button type="button" className="font-semibold text-primary" onClick={() => void navigator.clipboard?.writeText(value.replace(/[ ,]/g, ""))}>{tx(locale, "Copy", "复制")}</button>
                </dt>
                <dd className="break-all font-mono text-sm" data-base={base}>{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
      <p className="text-xs text-muted-foreground">{tx(locale, "Works with very large integers (BigInt). Prefixes 0x, 0b and 0o are accepted for their own base.", "支持超大整数（BigInt）。对应进制下可带 0x、0b、0o 前缀。")}</p>
    </div>
  );
}
