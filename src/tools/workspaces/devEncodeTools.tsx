import { useEffect, useMemo, useState } from "react";
import { ActionButton, Field, ResultText, TextInput, downloadBytes, tx } from "@/tools/controls";
import { Area, Check, ErrorLine, Output, Segmented, message, useHydrated, useNow, type DevProps } from "@/tools/workspaces/devShared";
import {
  HASH_ALGORITHMS,
  bytesToBase64,
  decodeBase64Text,
  decodeHtmlEntities,
  decodeJwt,
  decodeUrlText,
  encodeBase64Text,
  encodeHtmlEntities,
  encodeUrlText,
  hashBytes,
  isUuid,
  styleUuid,
  uuidV4,
  type HashAlgorithm,
} from "@/tools/lib/devText";

type Direction = "encode" | "decode";

const SAMPLE_TEXT = "Hello, world! 你好 👋";

function directionOptions(locale: string): [Direction, string][] {
  return [["encode", tx(locale, "Encode", "编码")], ["decode", tx(locale, "Decode", "解码")]];
}

/* Base64 ----------------------------------------------------------------- */

export function Base64Tool({ locale, preset }: DevProps) {
  const [direction, setDirection] = useState<Direction>(preset.direction === "decode" ? "decode" : "encode");
  const [input, setInput] = useState(() => (preset.direction === "decode" ? encodeBase64Text(SAMPLE_TEXT) : SAMPLE_TEXT));
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileOut, setFileOut] = useState<{ name: string; text: string } | null>(null);

  const result = useMemo(() => {
    try {
      if (direction === "encode") return { text: encodeBase64Text(input, urlSafe) };
      const decoded = decodeBase64Text(input);
      return decoded.binary ? { text: "", bytes: decoded.bytes } : { text: decoded.text };
    } catch (error) {
      return { text: "", error: message(error) };
    }
  }, [direction, input, urlSafe]);

  const output = fileOut?.text ?? result.text;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label={tx(locale, "Direction", "方向")} value={direction} options={directionOptions(locale)} onChange={(value) => { setDirection(value); setFileOut(null); }} />
        <Check label={tx(locale, "URL-safe (- _ no padding)", "URL 安全（- _ 无填充）")} checked={urlSafe} onChange={setUrlSafe} />
        <ActionButton type="button" tone="quiet" onClick={() => { setDirection(direction === "encode" ? "decode" : "encode"); setInput(output); setFileOut(null); }}>
          {tx(locale, "Swap", "互换")}
        </ActionButton>
      </div>
      <Field label={direction === "encode" ? tx(locale, "Text to encode", "要编码的文本") : tx(locale, "Base64 to decode", "要解码的 Base64")}>
        <Area value={input} onChange={(event) => { setInput(event.target.value); setFileOut(null); }} />
      </Field>
      {direction === "encode" ? (
        <Field label={tx(locale, "Or encode a file", "或编码一个文件")}>
          <input
            type="file"
            className="text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileOut({ name: file.name, text: bytesToBase64(new Uint8Array(await file.arrayBuffer()), urlSafe) });
            }}
          />
        </Field>
      ) : null}
      <ErrorLine>{result.error}</ErrorLine>
      {result.bytes ? (
        <div className="flex flex-wrap items-center gap-3">
          <ResultText>{tx(locale, `Decoded ${result.bytes.length} bytes of binary data.`, `解码得到 ${result.bytes.length} 字节二进制数据。`)}</ResultText>
          <ActionButton type="button" onClick={() => downloadBytes(result.bytes!, "decoded.bin", "application/octet-stream")}>{tx(locale, "Download file", "下载文件")}</ActionButton>
        </div>
      ) : (
        <Output label={fileOut ? fileOut.name : tx(locale, "Result", "结果")} value={output} locale={locale} filename={direction === "encode" ? "base64.txt" : "decoded.txt"} />
      )}
    </div>
  );
}

/* URL -------------------------------------------------------------------- */

export function UrlTool({ locale, preset }: DevProps) {
  const [direction, setDirection] = useState<Direction>(preset.direction === "decode" ? "decode" : "encode");
  const [input, setInput] = useState(() => (preset.direction === "decode" ? "https://example.com/search?q=caf%C3%A9%20%26%20cr%C3%A8me&lang=fr" : "café & crème / 50% off?"));
  const [whole, setWhole] = useState(false);
  const [plus, setPlus] = useState(true);

  const result = useMemo(() => {
    try {
      return { text: direction === "encode" ? encodeUrlText(input, whole) : decodeUrlText(input, plus) };
    } catch (error) {
      return { text: "", error: message(error) };
    }
  }, [direction, input, whole, plus]);

  const params = useMemo(() => {
    const source = direction === "decode" ? input : result.text;
    try {
      const url = new URL(source.trim());
      return [...url.searchParams.entries()];
    } catch {
      return [];
    }
  }, [direction, input, result.text]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label={tx(locale, "Direction", "方向")} value={direction} options={directionOptions(locale)} onChange={setDirection} />
        {direction === "encode" ? (
          <Check label={tx(locale, "Keep URL structure (encodeURI)", "保留网址结构（encodeURI）")} checked={whole} onChange={setWhole} />
        ) : (
          <Check label={tx(locale, "Treat + as space", "把 + 当作空格")} checked={plus} onChange={setPlus} />
        )}
        <ActionButton type="button" tone="quiet" onClick={() => { setDirection(direction === "encode" ? "decode" : "encode"); setInput(result.text); }}>
          {tx(locale, "Swap", "互换")}
        </ActionButton>
      </div>
      <Field label={tx(locale, "Input", "输入")}>
        <Area value={input} onChange={(event) => setInput(event.target.value)} />
      </Field>
      <ErrorLine>{result.error}</ErrorLine>
      <Output label={tx(locale, "Result", "结果")} value={result.text} locale={locale} />
      {params.length ? (
        <table className="w-full text-left text-sm">
          <caption className="pb-2 text-left font-medium">{tx(locale, "Query parameters", "查询参数")}</caption>
          <thead><tr className="border-b border-border"><th className="py-1 pr-3">{tx(locale, "Name", "名称")}</th><th className="py-1">{tx(locale, "Value", "值")}</th></tr></thead>
          <tbody>
            {params.map(([key, value], index) => (
              <tr key={`${key}-${index}`} className="border-b border-border/60"><td className="py-1 pr-3 font-mono">{key}</td><td className="break-all py-1 font-mono">{value}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

/* HTML entities ---------------------------------------------------------- */

export function EntityTool({ locale }: DevProps) {
  const [direction, setDirection] = useState<Direction>("encode");
  const [input, setInput] = useState('<a href="/free-tools">Tom & Jerry’s “café”</a>');
  const [nonAscii, setNonAscii] = useState(false);
  const output = direction === "encode" ? encodeHtmlEntities(input, nonAscii) : decodeHtmlEntities(input);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label={tx(locale, "Direction", "方向")} value={direction} options={directionOptions(locale)} onChange={setDirection} />
        {direction === "encode" ? <Check label={tx(locale, "Also encode non-ASCII characters", "同时编码非 ASCII 字符")} checked={nonAscii} onChange={setNonAscii} /> : null}
        <ActionButton type="button" tone="quiet" onClick={() => { setDirection(direction === "encode" ? "decode" : "encode"); setInput(output); }}>{tx(locale, "Swap", "互换")}</ActionButton>
      </div>
      <Field label={tx(locale, "Input", "输入")}><Area value={input} onChange={(event) => setInput(event.target.value)} /></Field>
      <Output label={tx(locale, "Result", "结果")} value={output} locale={locale} />
    </div>
  );
}

/* UUID ------------------------------------------------------------------- */

export function UuidTool({ locale, preset }: DevProps) {
  const guid = preset.style === "guid";
  const hydrated = useHydrated();
  const [count, setCount] = useState("5");
  const [upper, setUpper] = useState(guid);
  const [braces, setBraces] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [made, setMade] = useState<string[] | null>(null);
  const [initial] = useState<string[]>(() => (typeof window === "undefined" ? [] : Array.from({ length: 5 }, () => uuidV4())));
  const [check, setCheck] = useState("");
  // Random ids exist only in the browser; the server and hydration render show the empty placeholder.
  const raw = made ?? (hydrated ? initial : []);
  const list = raw.map((item) => styleUuid(item, { upper, braces, hyphens }));
  const text = list.join("\n");
  const total = Math.max(1, Math.min(1000, Math.floor(Number(count)) || 1));
  const version = isUuid(check) ? check.replace(/[{}-]/g, "")[12] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "How many (1–1000)", "数量（1–1000）")}><TextInput type="number" min={1} max={1000} value={count} onChange={(event) => setCount(event.target.value)} /></Field>
        <ActionButton type="button" data-action="run" onClick={() => setMade(Array.from({ length: total }, () => uuidV4()))}>{tx(locale, guid ? "Generate GUIDs" : "Generate UUIDs", guid ? "生成 GUID" : "生成 UUID")}</ActionButton>
      </div>
      <div className="flex flex-wrap gap-4">
        <Check label={tx(locale, "Uppercase", "大写")} checked={upper} onChange={setUpper} />
        <Check label={tx(locale, "Braces { }", "花括号 { }")} checked={braces} onChange={setBraces} />
        <Check label={tx(locale, "Hyphens", "连字符")} checked={hyphens} onChange={setHyphens} />
      </div>
      <Output label={tx(locale, "Version 4 UUIDs", "版本 4 UUID")} value={text} locale={locale} filename={guid ? "guids.txt" : "uuids.txt"} rows={Math.min(12, Math.max(5, list.length))} />
      <Field label={tx(locale, "Validate a UUID", "校验一个 UUID")}>
        <TextInput value={check} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" onChange={(event) => setCheck(event.target.value)} />
      </Field>
      {check.trim() ? (
        <ResultText>{version ? tx(locale, `Valid UUID, version ${version}.`, `有效的 UUID，版本 ${version}。`) : tx(locale, "Not a valid UUID.", "不是有效的 UUID。")}</ResultText>
      ) : null}
    </div>
  );
}

/* Hash ------------------------------------------------------------------- */

export function HashTool({ locale, preset }: DevProps) {
  const primary = (HASH_ALGORITHMS as readonly string[]).includes(preset.algorithm) ? (preset.algorithm as HashAlgorithm) : "SHA-256";
  const [input, setInput] = useState("hello world");
  const [file, setFile] = useState<File | null>(null);
  const [upper, setUpper] = useState(false);
  const [hashes, setHashes] = useState<Partial<Record<HashAlgorithm, string>>>({});
  const [error, setError] = useState("");
  const [compare, setCompare] = useState("");
  const order = [primary, ...HASH_ALGORITHMS.filter((item) => item !== primary)];

  useEffect(() => {
    let alive = true;
    const algorithms = [primary, ...HASH_ALGORITHMS.filter((item) => item !== primary)];
    (async () => {
      const bytes = file ? new Uint8Array(await file.arrayBuffer()) : new TextEncoder().encode(input);
      const out: Partial<Record<HashAlgorithm, string>> = {};
      for (const algorithm of algorithms) out[algorithm] = await hashBytes(bytes, algorithm);
      if (alive) {
        setHashes(out);
        setError("");
      }
    })().catch((reason) => {
      if (alive) setError(message(reason));
    });
    return () => {
      alive = false;
    };
  }, [input, file, primary]);

  const wanted = compare.trim().toLowerCase();
  const matched = wanted ? order.find((algorithm) => hashes[algorithm] === wanted) : undefined;

  return (
    <div className="space-y-4">
      <Field label={tx(locale, "Text", "文本")}>
        <Area value={input} onChange={(event) => { setInput(event.target.value); setFile(null); }} />
      </Field>
      <Field label={tx(locale, "Or hash a file", "或计算文件哈希")}>
        <input type="file" className="text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </Field>
      {file ? <p className="text-sm text-muted-foreground">{tx(locale, `Hashing ${file.name}`, `正在计算 ${file.name}`)}</p> : null}
      <Check label={tx(locale, "Uppercase hex", "大写十六进制")} checked={upper} onChange={setUpper} />
      <ErrorLine>{error}</ErrorLine>
      <dl className="grid gap-2">
        {order.map((algorithm) => {
          const value = hashes[algorithm] ?? "";
          const shown = upper ? value.toUpperCase() : value;
          return (
            <div key={algorithm} className={["rounded-md border p-3", algorithm === primary ? "border-accent-ink bg-accent-soft" : "border-border"].join(" ")}>
              <dt className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold">
                {algorithm}
                <button type="button" className="text-xs font-semibold text-primary" disabled={!shown} onClick={() => void navigator.clipboard?.writeText(shown)}>{tx(locale, "Copy", "复制")}</button>
              </dt>
              <dd className="break-all font-mono text-small" data-hash={algorithm}>{shown || "…"}</dd>
            </div>
          );
        })}
      </dl>
      <Field label={tx(locale, "Compare with a known hash", "与已知哈希比对")}>
        <TextInput value={compare} onChange={(event) => setCompare(event.target.value)} />
      </Field>
      {wanted ? <ResultText>{matched ? tx(locale, `Match: ${matched}`, `一致：${matched}`) : tx(locale, "No match.", "不一致。")}</ResultText> : null}
    </div>
  );
}

/* JWT -------------------------------------------------------------------- */

const SAMPLE_JWT = [
  encodeBase64Text(JSON.stringify({ alg: "HS256", typ: "JWT" }), true),
  encodeBase64Text(JSON.stringify({ sub: "1234567890", name: "Jane Doe", role: "editor", iat: 1767225600, exp: 1798761600 }), true),
  "c2lnbmF0dXJlLW5vdC12ZXJpZmllZA",
].join(".");

export function JwtTool({ locale }: DevProps) {
  const [token, setToken] = useState(SAMPLE_JWT);
  const now = useNow();
  const decoded = useMemo(() => {
    try {
      return { value: decodeJwt(token, now ?? 0) };
    } catch (error) {
      return { error: message(error) };
    }
  }, [token, now]);
  const value = decoded.value;
  return (
    <div className="space-y-4">
      <Field label={tx(locale, "Encoded JWT", "JWT 令牌")}>
        <Area value={token} onChange={(event) => setToken(event.target.value)} className="break-all" />
      </Field>
      <ErrorLine>{decoded.error}</ErrorLine>
      {value ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Output label={tx(locale, "Header", "头部")} value={JSON.stringify(value.header, null, 2)} locale={locale} rows={6} />
            <Output label={tx(locale, "Payload", "载荷")} value={JSON.stringify(value.payload, null, 2)} locale={locale} rows={10} />
          </div>
          {value.times.length ? (
            <ul className="space-y-1 text-sm">
              {value.times.map((item) => (
                <li key={item.claim}><span className="font-mono font-semibold">{item.claim}</span> · {item.value} · {item.iso}</li>
              ))}
            </ul>
          ) : null}
          {now !== null && value.expired !== null ? (
            <ResultText>{value.expired ? tx(locale, "This token has expired.", "此令牌已过期。") : tx(locale, "This token has not expired yet.", "此令牌尚未过期。")}</ResultText>
          ) : null}
          <p className="text-xs text-muted-foreground">{tx(locale, "The signature is shown but not verified. Decoding happens in this tab; do not paste production secrets into any website.", "签名只显示、不校验。解码在当前页面完成；生产环境的密钥不要粘贴到任何网站。")}</p>
        </>
      ) : null}
    </div>
  );
}
