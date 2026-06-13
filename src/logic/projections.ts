import type { Answers, AssetKey } from '../types';

// [conservative, expected, optimistic] annual % return assumptions — illustrative only
export const RETURNS: Record<AssetKey, [number, number, number]> = {
  usStocks: [5, 8, 11],
  intlStocks: [4, 7, 10],
  metals: [2, 4, 6],
  crypto: [-5, 15, 40],
  landReit: [4, 7, 10],
  bonds: [3, 4, 5],
  cash: [1, 2, 3],
};

// Insurance cash value: net growth after cost of insurance, illustrative
const INSURANCE_GROWTH: [number, number, number] = [3, 4, 5];
const PREMIUM_CREDIT = 0.85; // share of premium credited to cash value

export interface YearPoint {
  year: number;
  cons: number;
  exp: number;
  opt: number;
  cvCons: number;
  cvExp: number;
  cvOpt: number;
  contributed: number;
}

export function blendedReturns(weights: Record<AssetKey, number>): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (const k of Object.keys(weights) as AssetKey[]) {
    for (let i = 0; i < 3; i++) out[i] += weights[k] * RETURNS[k][i];
  }
  return out;
}

export interface SavingsPlan {
  active: boolean;
  goal: number;
  months: number;
  perMonth: number;
}

export function savingsPlan(a: Answers): SavingsPlan {
  const active = (a.cushion === 'partial' || a.cushion === 'none') && a.savingsGoal > 0;
  const months = Math.max(1, a.savingsMonths);
  return {
    active,
    goal: a.savingsGoal,
    months,
    perMonth: active ? Math.ceil(a.savingsGoal / months) : 0,
  };
}

export function project(
  capital: number,
  monthlyInvest: number,
  premium: number,
  weights: Record<AssetKey, number>,
  years = 30,
  savingsMonthly = 0,
  savingsMonths = 0,
): YearPoint[] {
  const [rc, re, ro] = blendedReturns(weights).map((r) => r / 100);
  const [ic, ie, io] = INSURANCE_GROWTH.map((r) => r / 100);

  const points: YearPoint[] = [];
  let cons = capital;
  let exp = capital;
  let opt = capital;
  let cvCons = 0;
  let cvExp = 0;
  let cvOpt = 0;

  points.push({ year: 0, cons, exp, opt, cvCons, cvExp, cvOpt, contributed: capital });

  for (let y = 1; y <= years; y++) {
    // months of this year still funding the safety net; afterwards that money invests
    const monthsSaving = Math.max(0, Math.min(12, savingsMonths - (y - 1) * 12));
    const yearly = monthlyInvest * 12 + savingsMonthly * (12 - monthsSaving);
    cons = (cons + yearly) * (1 + rc);
    exp = (exp + yearly) * (1 + re);
    opt = (opt + yearly) * (1 + ro);

    const credited = premium * 12 * PREMIUM_CREDIT;
    cvCons = (cvCons + credited) * (1 + ic);
    cvExp = (cvExp + credited) * (1 + ie);
    cvOpt = (cvOpt + credited) * (1 + io);

    points.push({
      year: y,
      cons: Math.round(cons),
      exp: Math.round(exp),
      opt: Math.round(opt),
      cvCons: Math.round(cvCons),
      cvExp: Math.round(cvExp),
      cvOpt: Math.round(cvOpt),
      contributed: Math.round(capital + (monthlyInvest + premium + savingsMonthly) * 12 * y),
    });
  }
  return points;
}

export const fmtMoney = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const fmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
};
