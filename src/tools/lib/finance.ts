/** Pure formulas for the everyday calculators added in the 2026-10 batch. */

export function tip(bill: number, percent: number, people: number, roundUp = false) {
  const count = Math.max(1, Math.floor(people) || 1);
  let tipAmount = (bill * percent) / 100;
  let total = bill + tipAmount;
  if (roundUp) {
    const perPerson = Math.ceil(total / count);
    total = perPerson * count;
    tipAmount = total - bill;
  }
  return { tip: tipAmount, total, perPerson: total / count, tipPerPerson: tipAmount / count };
}

export function discount(price: number, percent: number, extraPercent = 0, taxPercent = 0) {
  const afterFirst = price * (1 - percent / 100);
  const afterSecond = afterFirst * (1 - extraPercent / 100);
  const tax = afterSecond * (taxPercent / 100);
  const final = afterSecond + tax;
  const saved = price - afterSecond;
  return { final, saved, tax, effectivePercent: price ? (saved / price) * 100 : 0 };
}

export type CompoundFrequency = 1 | 2 | 4 | 12 | 52 | 365;

/**
 * Future value with compounding `frequency` times a year and a monthly contribution added at the end of each month.
 * Returns a yearly schedule.
 */
export function compoundInterest(principal: number, annualRate: number, years: number, frequency: CompoundFrequency, monthly = 0) {
  const months = Math.max(0, Math.round(years * 12));
  const periodRate = annualRate / 100 / frequency;
  // Effective monthly rate equivalent to the chosen compounding.
  const monthlyRate = (1 + periodRate) ** (frequency / 12) - 1;
  let balance = principal;
  let contributed = principal;
  const schedule: { year: number; balance: number; contributed: number; interest: number }[] = [];
  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    contributed += monthly;
    if (month % 12 === 0 || month === months) schedule.push({ year: Math.ceil(month / 12), balance, contributed, interest: balance - contributed });
  }
  return { balance, contributed, interest: balance - contributed, schedule };
}

export type Sex = "male" | "female";

/** Mifflin-St Jeor resting energy, kcal/day. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export const ACTIVITY_LEVELS = [
  { id: "sedentary", factor: 1.2, en: "Sedentary (little or no exercise)", zh: "久坐（几乎不运动）" },
  { id: "light", factor: 1.375, en: "Light (1–3 days a week)", zh: "轻度（每周 1–3 天）" },
  { id: "moderate", factor: 1.55, en: "Moderate (3–5 days a week)", zh: "中度（每周 3–5 天）" },
  { id: "active", factor: 1.725, en: "Active (6–7 days a week)", zh: "高强度（每周 6–7 天）" },
  { id: "very", factor: 1.9, en: "Very active (physical job or twice a day)", zh: "非常高（体力工作或一天两练）" },
] as const;

export function calories(sex: Sex, weightKg: number, heightCm: number, age: number, factor: number) {
  const rest = bmr(sex, weightKg, heightCm, age);
  const maintain = rest * factor;
  return { bmr: rest, maintain, mildLoss: maintain - 250, loss: maintain - 500, gain: maintain + 500 };
}

export type PayPeriod = "hour" | "day" | "week" | "biweek" | "month" | "year";

/** Converts pay between periods using hours per week and weeks per year. */
export function salary(amount: number, period: PayPeriod, hoursPerWeek = 40, weeksPerYear = 52, daysPerWeek = 5) {
  const yearly: Record<PayPeriod, number> = {
    hour: hoursPerWeek * weeksPerYear,
    day: daysPerWeek * weeksPerYear,
    week: weeksPerYear,
    biweek: weeksPerYear / 2,
    month: 12,
    year: 1,
  };
  const annual = amount * yearly[period];
  return {
    hour: annual / yearly.hour,
    day: annual / yearly.day,
    week: annual / yearly.week,
    biweek: annual / yearly.biweek,
    month: annual / 12,
    year: annual,
  };
}
