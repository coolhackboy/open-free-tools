const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  log: Math.log10,
  ln: Math.log,
  abs: Math.abs,
};

type Token = { type: "num"; value: number } | { type: "id"; value: string } | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (char === " " || char === ",") {
      index += 1;
      continue;
    }
    if ("+-*/^()".includes(char)) {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[0-9.]/.test(input[end])) end += 1;
      tokens.push({ type: "num", value: Number(input.slice(index, end)) });
      index = end;
      continue;
    }
    if (/[a-z]/i.test(char)) {
      let end = index + 1;
      while (end < input.length && /[a-z]/i.test(input[end])) end += 1;
      tokens.push({ type: "id", value: input.slice(index, end).toLowerCase() });
      index = end;
      continue;
    }
    throw new Error(`Unexpected "${char}"`);
  }
  return tokens;
}

export function evaluateExpression(input: string): number {
  const tokens = tokenize(input);
  let index = 0;
  const peek = () => tokens[index];
  const parsePrimary = (): number => {
    const token = peek();
    if (!token) throw new Error("Missing value");
    if (token.type === "num") {
      index += 1;
      return token.value;
    }
    if (token.type === "id") {
      index += 1;
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;
      const fn = FUNCTIONS[token.value];
      if (!fn || peek()?.type !== "op" || peek()?.value !== "(") throw new Error(`Unknown "${token.value}"`);
      index += 1;
      const value = parseAdd();
      if (peek()?.type !== "op" || peek()?.value !== ")") throw new Error("Missing )");
      index += 1;
      return fn(value);
    }
    if (token.type === "op" && token.value === "(") {
      index += 1;
      const value = parseAdd();
      if (peek()?.type !== "op" || peek()?.value !== ")") throw new Error("Missing )");
      index += 1;
      return value;
    }
    if (token.type === "op" && token.value === "-") {
      index += 1;
      return -parsePrimary();
    }
    throw new Error("Missing value");
  };
  const parsePower = (): number => {
    let value = parsePrimary();
    while (peek()?.type === "op" && peek()?.value === "^") {
      index += 1;
      value **= parsePrimary();
    }
    return value;
  };
  const parseMul = (): number => {
    let value = parsePower();
    while (peek()?.type === "op" && (peek()?.value === "*" || peek()?.value === "/")) {
      const op = peek()?.value;
      index += 1;
      const right = parsePower();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  };
  const parseAdd = (): number => {
    let value = parseMul();
    while (peek()?.type === "op" && (peek()?.value === "+" || peek()?.value === "-")) {
      const op = peek()?.value;
      index += 1;
      const right = parseMul();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };
  const value = parseAdd();
  if (index !== tokens.length) throw new Error("Extra input");
  if (!Number.isFinite(value)) throw new Error("Not a finite number");
  return value;
}
