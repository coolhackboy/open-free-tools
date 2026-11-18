import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ActionButton, Field, ResultText, SelectInput, TextInput, ToolPanel, tx } from "@/tools/controls";
import { CopyButton, ErrorLine, message } from "@/tools/workspaces/devShared";
import {
  CURRENCIES,
  DNS_TYPES,
  convertAmount,
  formatBandwidth,
  formatLatency,
  formatMoney,
  normalizeDomain,
  parseDohJson,
  parseRate,
  parseTrace,
  type DnsAnswer,
  type DnsType,
} from "@/tools/lib/net";

type Props = { tool: FreeTool; locale: string };

function countryName(code: string, locale: string) {
  try {
    const name = new Intl.DisplayNames([locale === "zh" ? "zh-CN" : "en"], { type: "region" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 10000) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("You appear to be offline.");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The request timed out. Try again.");
    if (error instanceof TypeError) throw new Error("The service could not be reached. Check your connection or try again later.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/** fetch with a timeout and a readable offline message. Only ever called from a click or submit. */
async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 10000) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("You appear to be offline.");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error((body && (body.message || body.error)) || `Request failed (${response.status}).`);
    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The request timed out. Try again.");
    if (error instanceof TypeError) throw new Error("The service could not be reached. Check your connection or try again later.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={["rounded-md border p-3", strong ? "border-accent-ink bg-accent-soft" : "border-border"].join(" ")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={["break-all font-mono", strong ? "text-2xl font-semibold" : "text-base"].join(" ")}>{value}</dd>
    </div>
  );
}

/* What is my IP ---------------------------------------------------------- */

function IpTool({ locale }: { locale: string }) {
  const [info, setInfo] = useState<{ ip: string | null; version: number | null; country: string | null } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const text = await fetchText("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
      const parsed = parseTrace(text);
      if (!parsed.ip) throw new Error("The IP service returned an unexpected answer.");
      setInfo({ ...parsed, country: parsed.country ? countryName(parsed.country, locale) : null });
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return (
    <>
      <ActionButton type="button" data-action="run" disabled={busy} onClick={() => void run()}>{busy ? tx(locale, "Checking…", "查询中…") : tx(locale, "Show my IP address", "显示我的 IP 地址")}</ActionButton>
      <ErrorLine>{error}</ErrorLine>
      {info ? (
        <>
          <dl className="grid gap-2 sm:grid-cols-3">
            <Stat strong label={tx(locale, "Your public IP", "你的公网 IP")} value={info.ip ?? tx(locale, "Not available", "无法获取")} />
            <Stat label={tx(locale, "Version", "版本")} value={info.version ? `IPv${info.version}` : "—"} />
            <Stat label={tx(locale, "Country (from the network)", "国家/地区（按网络判断）")} value={info.country ?? "—"} />
          </dl>
          {info.ip ? <CopyButton text={info.ip} locale={locale} /> : null}
          {ua ? <p className="break-all text-xs text-muted-foreground">{tx(locale, "Browser user agent: ", "浏览器 UA：")}{ua}</p> : null}
        </>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "The address comes from Cloudflare's public trace endpoint (cloudflare.com/cdn-cgi/trace). A VPN, proxy or mobile carrier changes the address websites see. This site does not store the lookup.", "地址来自 Cloudflare 的公开 trace 接口（cloudflare.com/cdn-cgi/trace）。使用 VPN、代理或移动网络时，网站看到的地址会变化。本站不保存这次查询。")}</p>
    </>
  );
}

/* DNS lookup ------------------------------------------------------------- */

function DnsTool({ locale }: { locale: string }) {
  const [domain, setDomain] = useState("example.com");
  const [type, setType] = useState<DnsType | "ALL">("ALL");
  const [results, setResults] = useState<{ type: string; status: string; answers: DnsAnswer[] }[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const name = normalizeDomain(domain);
      setDomain(name);
      const types = type === "ALL" ? ["A", "AAAA", "CNAME", "MX", "NS", "TXT"] : [type];
      const out = await Promise.all(
        types.map(async (item) => {
          const json = await fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${item}`, { headers: { accept: "application/dns-json" } });
          const parsed = parseDohJson(json);
          return { type: item, status: parsed.status, answers: parsed.answers.filter((answer) => answer.type === item || item === "CNAME" || answer.type === "CNAME") };
        }),
      );
      setResults(out);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <Field label={tx(locale, "Domain", "域名")}><TextInput value={domain} onChange={(event) => setDomain(event.target.value)} autoCapitalize="none" spellCheck={false} /></Field>
        <Field label={tx(locale, "Record type", "记录类型")}>
          <SelectInput value={type} onChange={(event) => setType(event.target.value as DnsType | "ALL")}>
            <option value="ALL">{tx(locale, "Common (A, AAAA, CNAME, MX, NS, TXT)", "常用（A、AAAA、CNAME、MX、NS、TXT）")}</option>
            {DNS_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectInput>
        </Field>
        <ActionButton type="submit" data-action="run" disabled={busy}>{busy ? tx(locale, "Looking up…", "查询中…") : tx(locale, "Look up", "查询")}</ActionButton>
      </form>
      <ErrorLine>{error}</ErrorLine>
      {results ? (
        <div className="space-y-4">
          {results.map((group) => (
            <section key={group.type} aria-label={group.type}>
              <h3 className="mb-1 text-sm font-semibold">{group.type} <span className="font-normal text-muted-foreground">· {group.status}</span></h3>
              {group.answers.length ? (
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-border"><th className="py-1 pr-3">{tx(locale, "Name", "名称")}</th><th className="py-1 pr-3">TTL</th><th className="py-1">{tx(locale, "Value", "值")}</th></tr></thead>
                  <tbody>
                    {group.answers.map((answer, index) => (
                      <tr key={`${answer.data}-${index}`} className="border-b border-border/60 align-top"><td className="py-1 pr-3 font-mono">{answer.type !== group.type ? `${answer.name} (${answer.type})` : answer.name}</td><td className="py-1 pr-3 font-mono">{answer.ttl}</td><td className="break-all py-1 font-mono">{answer.data}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-muted-foreground">{tx(locale, "No records.", "没有记录。")}</p>}
            </section>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "Queries go from your browser to Cloudflare's public resolver 1.1.1.1 over HTTPS (DNS over HTTPS). Results reflect public DNS, not your local hosts file.", "查询从你的浏览器通过 HTTPS（DNS over HTTPS）发往 Cloudflare 公共解析器 1.1.1.1。结果反映公共 DNS，不包含本机 hosts 文件。")}</p>
    </>
  );
}

/* Currency --------------------------------------------------------------- */

const rateCache = new Map<string, { rate: number; date: string }>();

function CurrencyTool({ locale }: { locale: string }) {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [rate, setRate] = useState<{ rate: number; date: string; pair: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(base = from, quote = to) {
    setError("");
    if (base === quote) {
      setRate({ rate: 1, date: "", pair: `${base}${quote}` });
      return;
    }
    const key = `${base}${quote}`;
    const cached = rateCache.get(key);
    if (cached) {
      setRate({ ...cached, pair: key });
      return;
    }
    setBusy(true);
    try {
      const parsed = parseRate(await fetchJson(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`));
      rateCache.set(key, { rate: parsed.rate, date: parsed.date });
      setRate({ rate: parsed.rate, date: parsed.date, pair: key });
    } catch (reason) {
      setRate(null);
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  const value = Number(amount.replace(/,/g, ""));
  const current = rate && rate.pair === `${from}${to}` ? rate : null;
  return (
    <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <Field label={tx(locale, "Amount", "金额")}><TextInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
        <Field label={tx(locale, "From", "从")}>
          <SelectInput value={from} onChange={(event) => setFrom(event.target.value)}>{CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}</SelectInput>
        </Field>
        <ActionButton type="button" tone="quiet" aria-label={tx(locale, "Swap currencies", "交换币种")} onClick={() => { setFrom(to); setTo(from); if (current) void run(to, from); }}>⇄</ActionButton>
        <Field label={tx(locale, "To", "到")}>
          <SelectInput value={to} onChange={(event) => setTo(event.target.value)}>{CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}</SelectInput>
        </Field>
        <ActionButton type="submit" data-action="run" disabled={busy}>{busy ? tx(locale, "Loading rate…", "获取汇率…") : tx(locale, "Convert", "换算")}</ActionButton>
      </form>
      <ErrorLine>{error}</ErrorLine>
      {current && Number.isFinite(value) ? (
        <>
          <ResultText>{`${formatMoney(value, from)} = ${formatMoney(convertAmount(value, current.rate), to)}`}</ResultText>
          <p className="text-sm text-muted-foreground">
            1 {from} = {current.rate.toPrecision(6)} {to} · 1 {to} = {(1 / current.rate).toPrecision(6)} {from}
            {current.date ? tx(locale, ` · Reference rate for ${current.date}`, ` · ${current.date} 参考汇率`) : ""}
          </p>
        </>
      ) : null}
      <p className="text-xs text-muted-foreground">{tx(locale, "Daily mid-market reference rates from Frankfurter (central bank data, including the ECB). Banks and card networks add their own margin, so the amount you pay will differ.", "汇率来自 Frankfurter 的每日中间价参考（央行数据，包括欧洲央行）。银行和卡组织会加收差价，实际支付金额会不同。")}</p>
    </>
  );
}

/* Speed test ------------------------------------------------------------- */

type SpeedSummary = { download?: number; upload?: number; latency?: number; jitter?: number; downLoadedLatency?: number; upLoadedLatency?: number };

const SPEED_STEPS = [
  { type: "latency", numPackets: 1 },
  { type: "download", bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: "latency", numPackets: 20 },
  { type: "download", bytes: 1e5, count: 8 },
  { type: "download", bytes: 1e6, count: 6 },
  { type: "upload", bytes: 1e5, count: 6 },
  { type: "upload", bytes: 1e6, count: 4 },
  { type: "download", bytes: 1e7, count: 4 },
  { type: "upload", bytes: 1e7, count: 2 },
  { type: "download", bytes: 25e6, count: 2 },
];

function SpeedTool({ locale }: { locale: string }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [summary, setSummary] = useState<SpeedSummary>({});
  const [error, setError] = useState("");
  const engine = useRef<{ pause(): void } | null>(null);

  useEffect(() => () => engine.current?.pause(), []);

  async function run() {
    setError("");
    setSummary({});
    setPhase("running");
    try {
      const { default: SpeedTest } = await import("@cloudflare/speedtest");
      const test = new SpeedTest({
        autoStart: false,
        // Do not send the finished results to Cloudflare's aggregate log; only the measurement traffic goes out.
        logAimApiUrl: null,
        logMeasurementApiUrl: null,
        measurements: SPEED_STEPS as never,
      });
      engine.current = test;
      test.onResultsChange = () => setSummary({ ...test.results.getSummary() });
      test.onFinish = (results) => {
        setSummary({ ...results.getSummary() });
        setPhase("done");
      };
      test.onError = (reason: string) => {
        setError(tx(locale, `The test could not finish: ${reason}`, `测速未能完成：${reason}`));
        setPhase("idle");
      };
      test.play();
    } catch (reason) {
      setError(message(reason));
      setPhase("idle");
    }
  }

  return (
    <>
      <ActionButton type="button" data-action="run" disabled={phase === "running"} onClick={() => void run()}>
        {phase === "running" ? tx(locale, "Testing…", "测速中…") : phase === "done" ? tx(locale, "Run again", "再测一次") : tx(locale, "Start speed test", "开始测速")}
      </ActionButton>
      <ErrorLine>{error}</ErrorLine>
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <Stat strong label={tx(locale, "Download", "下载")} value={formatBandwidth(summary.download)} />
        <Stat strong label={tx(locale, "Upload", "上传")} value={formatBandwidth(summary.upload)} />
        <Stat label={tx(locale, "Latency (idle)", "延迟（空闲）")} value={formatLatency(summary.latency)} />
        <Stat label={tx(locale, "Jitter", "抖动")} value={formatLatency(summary.jitter)} />
        <Stat label={tx(locale, "Latency while downloading", "下载时延迟")} value={formatLatency(summary.downLoadedLatency)} />
        <Stat label={tx(locale, "Latency while uploading", "上传时延迟")} value={formatLatency(summary.upLoadedLatency)} />
      </dl>
      <p className="text-xs text-muted-foreground">{tx(locale, "Measured against Cloudflare's network with the open-source @cloudflare/speedtest engine. A full run transfers roughly 100–150 MB, so avoid metered connections. Close other downloads for a cleaner result.", "使用开源的 @cloudflare/speedtest 引擎，对 Cloudflare 网络测速。完整测试大约消耗 100–150 MB 流量，按流量计费的网络请谨慎使用。关闭其他下载可让结果更准。")}</p>
    </>
  );
}

export function NetTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  return (
    <ToolPanel>
      {mode === "ip" ? <IpTool locale={locale} /> : null}
      {mode === "dns" ? <DnsTool locale={locale} /> : null}
      {mode === "currency" ? <CurrencyTool locale={locale} /> : null}
      {mode === "speed" ? <SpeedTool locale={locale} /> : null}
    </ToolPanel>
  );
}
