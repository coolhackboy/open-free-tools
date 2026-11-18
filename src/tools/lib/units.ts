/** Unit tables for the unit converter. Linear units store the size of one unit in the base unit. */

export type UnitCategory = "length" | "weight" | "temperature" | "area" | "volume" | "speed";

export type Unit = { id: string; en: string; zh: string; symbol: string; factor?: number };

export const UNIT_CATEGORIES: { id: UnitCategory; en: string; zh: string }[] = [
  { id: "length", en: "Length", zh: "长度" },
  { id: "weight", en: "Weight", zh: "重量" },
  { id: "temperature", en: "Temperature", zh: "温度" },
  { id: "area", en: "Area", zh: "面积" },
  { id: "volume", en: "Volume", zh: "体积" },
  { id: "speed", en: "Speed", zh: "速度" },
];

export const UNITS: Record<UnitCategory, Unit[]> = {
  // base: metre
  length: [
    { id: "mm", en: "Millimeter", zh: "毫米", symbol: "mm", factor: 0.001 },
    { id: "cm", en: "Centimeter", zh: "厘米", symbol: "cm", factor: 0.01 },
    { id: "m", en: "Meter", zh: "米", symbol: "m", factor: 1 },
    { id: "km", en: "Kilometer", zh: "千米", symbol: "km", factor: 1000 },
    { id: "in", en: "Inch", zh: "英寸", symbol: "in", factor: 0.0254 },
    { id: "ft", en: "Foot", zh: "英尺", symbol: "ft", factor: 0.3048 },
    { id: "yd", en: "Yard", zh: "码", symbol: "yd", factor: 0.9144 },
    { id: "mi", en: "Mile", zh: "英里", symbol: "mi", factor: 1609.344 },
    { id: "nmi", en: "Nautical mile", zh: "海里", symbol: "nmi", factor: 1852 },
  ],
  // base: kilogram
  weight: [
    { id: "mg", en: "Milligram", zh: "毫克", symbol: "mg", factor: 1e-6 },
    { id: "g", en: "Gram", zh: "克", symbol: "g", factor: 0.001 },
    { id: "kg", en: "Kilogram", zh: "千克", symbol: "kg", factor: 1 },
    { id: "t", en: "Metric ton", zh: "吨", symbol: "t", factor: 1000 },
    { id: "oz", en: "Ounce", zh: "盎司", symbol: "oz", factor: 0.028349523125 },
    { id: "lb", en: "Pound", zh: "磅", symbol: "lb", factor: 0.45359237 },
    { id: "st", en: "Stone", zh: "英石", symbol: "st", factor: 6.35029318 },
    { id: "jin", en: "Jin (市斤)", zh: "斤", symbol: "斤", factor: 0.5 },
  ],
  temperature: [
    { id: "c", en: "Celsius", zh: "摄氏度", symbol: "°C" },
    { id: "f", en: "Fahrenheit", zh: "华氏度", symbol: "°F" },
    { id: "k", en: "Kelvin", zh: "开尔文", symbol: "K" },
  ],
  // base: square metre
  area: [
    { id: "cm2", en: "Square centimeter", zh: "平方厘米", symbol: "cm²", factor: 1e-4 },
    { id: "m2", en: "Square meter", zh: "平方米", symbol: "m²", factor: 1 },
    { id: "ha", en: "Hectare", zh: "公顷", symbol: "ha", factor: 10000 },
    { id: "km2", en: "Square kilometer", zh: "平方千米", symbol: "km²", factor: 1e6 },
    { id: "in2", en: "Square inch", zh: "平方英寸", symbol: "in²", factor: 0.00064516 },
    { id: "ft2", en: "Square foot", zh: "平方英尺", symbol: "ft²", factor: 0.09290304 },
    { id: "ac", en: "Acre", zh: "英亩", symbol: "ac", factor: 4046.8564224 },
    { id: "mi2", en: "Square mile", zh: "平方英里", symbol: "mi²", factor: 2589988.110336 },
    { id: "mu", en: "Mu (亩)", zh: "亩", symbol: "亩", factor: 2000 / 3 },
  ],
  // base: litre
  volume: [
    { id: "ml", en: "Milliliter", zh: "毫升", symbol: "mL", factor: 0.001 },
    { id: "l", en: "Liter", zh: "升", symbol: "L", factor: 1 },
    { id: "m3", en: "Cubic meter", zh: "立方米", symbol: "m³", factor: 1000 },
    { id: "tsp", en: "Teaspoon (US)", zh: "茶匙（美）", symbol: "tsp", factor: 0.00492892159375 },
    { id: "tbsp", en: "Tablespoon (US)", zh: "汤匙（美）", symbol: "tbsp", factor: 0.01478676478125 },
    { id: "floz", en: "Fluid ounce (US)", zh: "液量盎司（美）", symbol: "fl oz", factor: 0.0295735295625 },
    { id: "cup", en: "Cup (US)", zh: "杯（美）", symbol: "cup", factor: 0.2365882365 },
    { id: "pt", en: "Pint (US)", zh: "品脱（美）", symbol: "pt", factor: 0.473176473 },
    { id: "gal", en: "Gallon (US)", zh: "加仑（美）", symbol: "gal", factor: 3.785411784 },
    { id: "ukgal", en: "Gallon (UK)", zh: "加仑（英）", symbol: "gal (UK)", factor: 4.54609 },
  ],
  // base: metre per second
  speed: [
    { id: "mps", en: "Meters per second", zh: "米/秒", symbol: "m/s", factor: 1 },
    { id: "kmh", en: "Kilometers per hour", zh: "千米/时", symbol: "km/h", factor: 1000 / 3600 },
    { id: "mph", en: "Miles per hour", zh: "英里/时", symbol: "mph", factor: 1609.344 / 3600 },
    { id: "kn", en: "Knot", zh: "节", symbol: "kn", factor: 1852 / 3600 },
    { id: "fps", en: "Feet per second", zh: "英尺/秒", symbol: "ft/s", factor: 0.3048 },
  ],
};

function toKelvin(value: number, unit: string) {
  if (unit === "c") return value + 273.15;
  if (unit === "f") return ((value - 32) * 5) / 9 + 273.15;
  return value;
}

function fromKelvin(value: number, unit: string) {
  if (unit === "c") return value - 273.15;
  if (unit === "f") return ((value - 273.15) * 9) / 5 + 32;
  return value;
}

export function findUnit(category: UnitCategory, id: string) {
  return UNITS[category].find((unit) => unit.id === id);
}

export function categoryOf(unitId: string): UnitCategory | undefined {
  return (Object.keys(UNITS) as UnitCategory[]).find((category) => UNITS[category].some((unit) => unit.id === unitId));
}

export function convertUnit(value: number, category: UnitCategory, from: string, to: string) {
  if (category === "temperature") return fromKelvin(toKelvin(value, from), to);
  const a = findUnit(category, from);
  const b = findUnit(category, to);
  if (!a?.factor || !b?.factor) throw new Error(`Unknown unit ${from} or ${to}`);
  return (value * a.factor) / b.factor;
}

/** Up to `digits` significant digits, trailing zeros removed, no exponent for everyday sizes. */
export function formatUnitValue(value: number, digits = 8) {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e15 || abs < 1e-9) return value.toExponential(Math.max(0, digits - 1)).replace(/\.?0+e/, "e");
  const rounded = Number(value.toPrecision(digits));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 12, useGrouping: false });
}
