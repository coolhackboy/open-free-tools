/** Pure helpers for the network free tools (what-is-my-ip, dns-lookup, currency, speed test). */

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function isIpv4(value: string) {
  return IPV4.test(value);
}

export function isIpv6(value: string) {
  return value.includes(":") && /^[0-9a-f:.]+$/i.test(value) && value.split("::").length <= 2;
}

function cleanIp(raw: string | null | undefined) {
  if (!raw) return "";
  let value = raw.trim();
  if (value.startsWith("[")) value = value.slice(1, value.indexOf("]"));
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(value)) value = value.replace(/:\d+$/, "");
  if (value.toLowerCase().startsWith("::ffff:") && isIpv4(value.slice(7))) value = value.slice(7);
  return isIpv4(value) || isIpv6(value) ? value : "";
}

/** Parses the key=value text served by Cloudflare's public /cdn-cgi/trace endpoint. */
export function parseTrace(text: string) {
  const fields = new Map<string, string>();
  for (const line of text.split(String.fromCharCode(10))) {
    const at = line.indexOf("=");
    if (at > 0) fields.set(line.slice(0, at).trim(), line.slice(at + 1).trim());
  }
  const ip = cleanIp(fields.get("ip"));
  const loc = (fields.get("loc") ?? "").toUpperCase();
  return { ip: ip || null, version: ip ? ipVersion(ip) : null, country: /^[A-Z]{2}$/.test(loc) && loc !== "XX" ? loc : null };
}

export function ipVersion(ip: string) {
  return isIpv4(ip) ? 4 : isIpv6(ip) ? 6 : 0;
}

/* DNS -------------------------------------------------------------------- */

export const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA"] as const;
export type DnsType = (typeof DNS_TYPES)[number];

const TYPE_NAMES: Record<number, string> = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 46: "RRSIG", 257: "CAA" };

export const DNS_STATUS: Record<number, string> = {
  0: "NOERROR",
  1: "FORMERR",
  2: "SERVFAIL",
  3: "NXDOMAIN",
  4: "NOTIMP",
  5: "REFUSED",
};

/** Accepts a domain or a pasted URL and returns the normalized ASCII host name. */
export function normalizeDomain(input: string) {
  let value = input.trim();
  if (!value) throw new Error("Enter a domain such as example.com.");
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = new URL(value).hostname;
    else value = new URL(`http://${value}`).hostname;
  } catch {
    throw new Error("That does not look like a domain name.");
  }
  value = value.replace(/\.$/, "").toLowerCase();
  if (value.length > 253 || !/^([a-z0-9_]([a-z0-9-_]{0,61}[a-z0-9_])?\.)+[a-z0-9-]{2,63}$/.test(value)) {
    throw new Error("That does not look like a domain name.");
  }
  return value;
}

export type DnsAnswer = { name: string; type: string; ttl: number; data: string };

export function parseDohJson(json: unknown): { status: string; answers: DnsAnswer[]; authority: DnsAnswer[] } {
  if (!json || typeof json !== "object") throw new Error("Unexpected DNS response.");
  const body = json as { Status?: number; Answer?: unknown[]; Authority?: unknown[] };
  const map = (list: unknown[] | undefined) =>
    (list ?? []).map((item) => {
      const record = item as { name?: string; type?: number; TTL?: number; data?: string };
      return { name: String(record.name ?? ""), type: TYPE_NAMES[record.type ?? 0] ?? String(record.type ?? ""), ttl: Number(record.TTL ?? 0), data: String(record.data ?? "") };
    });
  return { status: DNS_STATUS[body.Status ?? -1] ?? `CODE ${body.Status}`, answers: map(body.Answer), authority: map(body.Authority) };
}

/* Currency --------------------------------------------------------------- */

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "KRW", "INR", "CAD", "AUD", "CHF", "HKD", "SGD", "BRL", "MXN", "RUB", "TRY", "IDR", "VND", "THB", "PHP", "MYR", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ZAR", "AED", "SAR", "ILS", "TWD"] as const;

export function isCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

/** Reads the Frankfurter v2 /rate response: { date, base, quote, rate }. */
export function parseRate(json: unknown) {
  const body = json as { rate?: unknown; date?: unknown; base?: unknown; quote?: unknown };
  const rate = Number(body?.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("No rate was returned for this pair.");
  return { rate, date: String(body.date ?? ""), base: String(body.base ?? ""), quote: String(body.quote ?? "") };
}

export function convertAmount(amount: number, rate: number) {
  return amount * rate;
}

/** Fixed decimals per currency so server and browser agree and JPY/KRW show no cents. */
export function formatMoney(value: number, code: string) {
  const digits = ["JPY", "KRW", "VND", "IDR", "HUF"].includes(code) ? 0 : 2;
  if (!Number.isFinite(value)) return "—";
  const [whole, fraction] = Math.abs(value).toFixed(digits).split(".");
  return `${value < 0 ? "-" : ""}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""} ${code}`;
}

/* Speed test ------------------------------------------------------------- */

/** Bits per second to a readable Mbps / Gbps string. */
export function formatBandwidth(bps: number | undefined | null) {
  if (bps === undefined || bps === null || !Number.isFinite(bps)) return "—";
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(bps >= 1e8 ? 0 : 1)} Mbps`;
  return `${(bps / 1e3).toFixed(0)} kbps`;
}

export function formatLatency(ms: number | undefined | null) {
  return ms === undefined || ms === null || !Number.isFinite(ms) ? "—" : `${Math.round(ms)} ms`;
}
