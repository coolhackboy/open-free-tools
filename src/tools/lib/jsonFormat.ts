export type JsonResult =
  | { ok: true; text: string }
  | { ok: false; line: number; column: number; message: string };

type JsonValue =
  | null
  | boolean
  | string
  | { type: "number"; raw: string }
  | JsonValue[]
  | { type: "object"; entries: [string, JsonValue][] };

class Parser {
  private index = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  parse(): JsonValue {
    const value = this.parseValue();
    this.skip();
    if (this.index < this.input.length) this.fail("Unexpected extra content");
    return value;
  }

  private parseValue(): JsonValue {
    this.skip();
    const char = this.input[this.index];
    if (char === "{") return this.parseObject();
    if (char === "[") return this.parseArray();
    if (char === '"') return this.parseString();
    if (char === "t") return this.consumeLiteral("true", true);
    if (char === "f") return this.consumeLiteral("false", false);
    if (char === "n") return this.consumeLiteral("null", null);
    if (char === "-" || (char >= "0" && char <= "9")) return this.parseNumber();
    this.fail("Expected a JSON value");
  }

  private parseObject(): JsonValue {
    this.index += 1;
    const entries: [string, JsonValue][] = [];
    this.skip();
    if (this.input[this.index] === "}") {
      this.index += 1;
      return { type: "object", entries };
    }
    while (this.index < this.input.length) {
      this.skip();
      if (this.input[this.index] !== '"') this.fail("Expected an object key");
      const key = this.parseString();
      this.skip();
      if (this.input[this.index] !== ":") this.fail("Expected ':'");
      this.index += 1;
      entries.push([key, this.parseValue()]);
      this.skip();
      if (this.input[this.index] === "}") {
        this.index += 1;
        return { type: "object", entries };
      }
      if (this.input[this.index] !== ",") this.fail("Expected ',' or '}'");
      this.index += 1;
    }
    this.fail("Unclosed object");
  }

  private parseArray(): JsonValue {
    this.index += 1;
    const items: JsonValue[] = [];
    this.skip();
    if (this.input[this.index] === "]") {
      this.index += 1;
      return items;
    }
    while (this.index < this.input.length) {
      items.push(this.parseValue());
      this.skip();
      if (this.input[this.index] === "]") {
        this.index += 1;
        return items;
      }
      if (this.input[this.index] !== ",") this.fail("Expected ',' or ']'");
      this.index += 1;
    }
    this.fail("Unclosed array");
  }

  private parseString(): string {
    this.index += 1;
    let value = "";
    while (this.index < this.input.length) {
      const char = this.input[this.index];
      if (char === '"') {
        this.index += 1;
        return value;
      }
      if (char === "\\") {
        const next = this.input[this.index + 1];
        const map: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (next === "u") {
          const hex = this.input.slice(this.index + 2, this.index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail("Invalid unicode escape");
          value += String.fromCharCode(Number.parseInt(hex, 16));
          this.index += 6;
          continue;
        }
        if (!(next in map)) this.fail("Invalid escape");
        value += map[next];
        this.index += 2;
        continue;
      }
      if (char < " ") this.fail("Unescaped control character");
      value += char;
      this.index += 1;
    }
    this.fail("Unclosed string");
  }

  private parseNumber(): JsonValue {
    const start = this.index;
    if (this.input[this.index] === "-") this.index += 1;
    if (this.input[this.index] === "0") this.index += 1;
    else if (this.input[this.index] >= "1" && this.input[this.index] <= "9") {
      while (this.input[this.index] >= "0" && this.input[this.index] <= "9") this.index += 1;
    } else this.fail("Invalid number");
    if (this.input[this.index] === ".") {
      this.index += 1;
      if (this.input[this.index] < "0" || this.input[this.index] > "9") this.fail("Invalid number");
      while (this.input[this.index] >= "0" && this.input[this.index] <= "9") this.index += 1;
    }
    if (this.input[this.index] === "e" || this.input[this.index] === "E") {
      this.index += 1;
      if (this.input[this.index] === "+" || this.input[this.index] === "-") this.index += 1;
      if (this.input[this.index] < "0" || this.input[this.index] > "9") this.fail("Invalid number");
      while (this.input[this.index] >= "0" && this.input[this.index] <= "9") this.index += 1;
    }
    return { type: "number", raw: this.input.slice(start, this.index) };
  }

  private consumeLiteral(text: string, value: boolean | null): boolean | null {
    if (this.input.slice(this.index, this.index + text.length) !== text) this.fail(`Expected ${text}`);
    this.index += text.length;
    return value;
  }

  private skip() {
    while (this.index < this.input.length && " \n\r\t".includes(this.input[this.index])) this.index += 1;
  }

  private fail(message: string): never {
    const line = this.input.slice(0, this.index).split("\n").length;
    const lastBreak = this.input.lastIndexOf("\n", this.index - 1);
    const column = this.index - lastBreak;
    const error = new Error(message) as Error & { line: number; column: number };
    error.line = line;
    error.column = column;
    throw error;
  }
}

function print(value: JsonValue, minify: boolean, indent: number): string {
  const pad = minify ? "" : "  ".repeat(indent);
  const nl = minify ? "" : "\n";
  const space = minify ? "" : " ";
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const body = value.map((item) => `${pad}  ${print(item, minify, indent + 1)}`).join(`,${nl}`);
    return minify ? `[${value.map((item) => print(item, true, 0)).join(",")}]` : `[\n${body}\n${pad}]`;
  }
  if ("raw" in value) return value.raw;
  const entries = value.entries;
  if (!entries.length) return "{}";
  if (minify) {
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${print(item, true, 0)}`).join(",")}}`;
  }
  const body = entries
    .map(([key, item]) => `${pad}  ${JSON.stringify(key)}:${space}${print(item, false, indent + 1)}`)
    .join(`,${nl}`);
  return `{${nl}${body}${nl}${pad}}`;
}

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && "entries" in value) {
    return {
      type: "object",
      entries: [...value.entries]
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([key, item]) => [key, sortValue(item)]),
    };
  }
  return value;
}

export function formatJson(input: string, options: { minify?: boolean; sort?: boolean } = {}): JsonResult {
  try {
    let value = new Parser(input).parse();
    if (options.sort) value = sortValue(value);
    return { ok: true, text: print(value, Boolean(options.minify), 0) };
  } catch (error) {
    const known = error as Error & { line?: number; column?: number };
    return {
      ok: false,
      line: known.line ?? 1,
      column: known.column ?? 1,
      message: known.message || "Invalid JSON",
    };
  }
}

export function jsonTree(value: unknown, depth = 0): string[] {
  if (depth > 8) return ["…"];
  if (Array.isArray(value)) return value.flatMap((item, index) => [`[${index}]`, ...jsonTree(item, depth + 1).map((line) => `  ${line}`)]);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => [
      key,
      ...jsonTree(item, depth + 1).map((line) => `  ${line}`),
    ]);
  }
  return [String(value)];
}
