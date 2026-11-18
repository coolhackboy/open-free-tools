const TABLE: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) throw new Error("Roman numerals cover whole numbers from 1 to 3999.");
  let rest = value;
  let out = "";
  for (const [size, glyph] of TABLE) {
    while (rest >= size) {
      out += glyph;
      rest -= size;
    }
  }
  return out;
}

export function fromRoman(text: string) {
  const value = text.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(value)) throw new Error("Use only the letters I, V, X, L, C, D and M.");
  const digits: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = digits[value[index]];
    const next = digits[value[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  // Only canonical numerals are accepted (e.g. IIII or VX are rejected).
  if (total < 1 || total > 3999 || toRoman(total) !== value) throw new Error(`"${value}" is not a standard Roman numeral.`);
  return total;
}
