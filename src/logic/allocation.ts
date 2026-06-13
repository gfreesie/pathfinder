import type { AllocationLine, Answers, AssetKey, ProfileId } from '../types';

export const ASSET_META: Record<AssetKey, { label: string; color: string }> = {
  usStocks: { label: 'US stocks & index funds', color: '#2F8F7B' },
  intlStocks: { label: 'International stocks', color: '#6FB3A5' },
  metals: { label: 'Physical precious metals', color: '#D9A441' },
  crypto: { label: 'Cryptocurrency', color: '#8B6FD8' },
  landReit: { label: 'Land & REITs', color: '#C97B4A' },
  bonds: { label: 'Bonds & CDs', color: '#5B8DB8' },
  cash: { label: 'Cash reserve', color: '#9AA8B3' },
};

const BASE: Record<ProfileId, Record<AssetKey, number>> = {
  guardian: { usStocks: 15, intlStocks: 5, metals: 10, crypto: 0, landReit: 5, bonds: 45, cash: 20 },
  builder: { usStocks: 25, intlStocks: 10, metals: 10, crypto: 3, landReit: 10, bonds: 32, cash: 10 },
  navigator: { usStocks: 32, intlStocks: 13, metals: 12, crypto: 7, landReit: 15, bonds: 16, cash: 5 },
  trailblazer: { usStocks: 40, intlStocks: 15, metals: 10, crypto: 10, landReit: 15, bonds: 7, cash: 3 },
  maverick: { usStocks: 45, intlStocks: 15, metals: 8, crypto: 18, landReit: 10, bonds: 2, cash: 2 },
};

const CRYPTO_CEILING: Record<string, number> = {
  none: 0,
  small: 5,
  meaningful: 15,
  believer: 25,
};

const KEYS: AssetKey[] = ['usStocks', 'intlStocks', 'metals', 'crypto', 'landReit', 'bonds', 'cash'];

// Which plan assets each "what excites you" selection includes
const ATTRACTION_KEYS: Record<string, AssetKey[]> = {
  metals: ['metals'],
  stocks: ['usStocks', 'intlStocks'],
  crypto: ['crypto'],
  land: ['landReit'],
  bonds: ['bonds'],
  cash: ['cash'],
};

export function includedKeys(a: Answers): Set<AssetKey> {
  const s = new Set<AssetKey>();
  for (const sel of a.assets) for (const k of ATTRACTION_KEYS[sel] ?? []) s.add(k);
  if (s.size === 0) for (const k of KEYS) s.add(k); // UI requires >=1; safe fallback
  return s;
}

export function computeAllocation(
  a: Answers,
  profile: ProfileId,
  blendWeights?: Partial<Record<AssetKey, number>>,
): AllocationLine[] {
  const included = includedKeys(a);
  const source = blendWeights ?? BASE[profile];
  const w: Record<AssetKey, number> = {
    usStocks: 0, intlStocks: 0, metals: 0, crypto: 0, landReit: 0, bonds: 0, cash: 0,
  };
  for (const k of KEYS) w[k] = included.has(k) ? source[k] ?? 0 : 0;

  // Tangibility tilt (only between included assets)
  if (a.tangibility === 'strong' && included.has('usStocks')) {
    const shift = Math.min(8, w.usStocks);
    let used = 0;
    if (included.has('metals')) { w.metals += shift / 2; used += shift / 2; }
    if (included.has('landReit')) { w.landReit += shift / 2; used += shift / 2; }
    w.usStocks -= used;
  } else if (a.tangibility === 'indifferent' && included.has('metals') && included.has('usStocks')) {
    const shift = Math.min(4, w.metals);
    w.metals -= shift;
    w.usStocks += shift;
  }

  // Gate: crypto comfort ceiling
  const ceiling = CRYPTO_CEILING[a.cryptoComfort ?? 'none'];
  w.crypto = Math.min(w.crypto, ceiling);

  // Gate: safety-net cash (applies even if cash wasn't selected)
  let cashMin = 0;
  if (a.cushion === 'none') cashMin = 15;
  else if (a.cushion === 'partial') cashMin = 8;
  const safetyNet = cashMin > 0 && w.cash < cashMin;
  if (w.cash < cashMin) w.cash = cashMin;

  // Normalize to 100 while respecting cashMin and crypto ceiling
  let overflowToCash = false;
  for (let iter = 0; iter < 4; iter++) {
    const total = KEYS.reduce((s, k) => s + w[k], 0);
    if (Math.abs(total - 100) < 0.01) break;
    if (total > 100) {
      const excess = total - 100;
      const scalable = total - cashMin;
      const f = scalable > 0 ? (scalable - excess) / scalable : 0;
      for (const k of KEYS) {
        if (k === 'cash') w.cash = cashMin + Math.max(0, w.cash - cashMin) * f;
        else w[k] *= f;
      }
    } else {
      const deficit = 100 - total;
      const upKeys = KEYS.filter(
        (k) => w[k] > 0 && k !== 'cash' && !(k === 'crypto' && w.crypto >= ceiling),
      );
      const upMass = upKeys.reduce((s, k) => s + w[k], 0);
      if (upMass <= 0) {
        w.cash += deficit;
        overflowToCash = true;
        break;
      }
      const f = (upMass + deficit) / upMass;
      for (const k of upKeys) w[k] *= f;
      w.crypto = Math.min(w.crypto, ceiling);
    }
  }

  // Round with largest remainder so percents sum to exactly 100
  const floored = KEYS.map((k) => ({ k, f: Math.floor(w[k]), r: w[k] - Math.floor(w[k]) }));
  let remainder = 100 - floored.reduce((s, x) => s + x.f, 0);
  floored.sort((x, y) => y.r - x.r);
  for (const x of floored) {
    if (remainder <= 0) break;
    if (x.f > 0 || x.r > 0) { x.f += 1; remainder -= 1; }
  }

  const result: AllocationLine[] = [];
  for (const k of KEYS) {
    const pct = floored.find((x) => x.k === k)!.f;
    if (pct <= 0) continue;
    let note: string | undefined;
    if (k === 'cash' && safetyNet) note = 'Safety net first';
    if (k === 'cash' && overflowToCash) note = 'Comfort caps put the rest here';
    result.push({
      key: k,
      label: ASSET_META[k].label,
      pct,
      dollars: Math.round((pct / 100) * a.capital),
      color: ASSET_META[k].color,
      note,
    });
  }
  return result;
}

export function allocationWeights(lines: AllocationLine[]): Record<AssetKey, number> {
  const w = { usStocks: 0, intlStocks: 0, metals: 0, crypto: 0, landReit: 0, bonds: 0, cash: 0 };
  for (const l of lines) w[l.key] = l.pct / 100;
  return w;
}

// ---- Per-asset drill-down compositions (illustrative examples, not endorsements) ----

export interface BreakdownLine {
  name: string;
  pct: number;
  note?: string;
}

export const BREAKDOWNS: Record<AssetKey, { intro: string; lines: BreakdownLine[] }> = {
  usStocks: {
    intro: 'Broad, low-cost index funds do the heavy lifting.',
    lines: [
      { name: 'S&P 500 / total market index (VOO, VTI)', pct: 60, note: 'The core engine — ~0.03% expense ratio' },
      { name: 'Growth / Nasdaq-100 (QQQM)', pct: 25, note: 'Tech-tilted growth sleeve' },
      { name: 'Dividend fund (SCHD)', pct: 15, note: 'Steady payers smooth the ride' },
    ],
  },
  intlStocks: {
    intro: 'Diversification beyond the US market.',
    lines: [
      { name: 'Total international index (VXUS)', pct: 70, note: 'One-fund global coverage' },
      { name: 'Developed markets (VEA)', pct: 20 },
      { name: 'Emerging markets (VWO)', pct: 10, note: 'Higher risk, higher growth potential' },
    ],
  },
  metals: {
    intro: 'Tangible value you can hold — buy from reputable dealers and plan secure storage.',
    lines: [
      { name: 'Gold — coins & bars (Eagles, Maple Leafs)', pct: 65, note: 'Dealers: APMEX, JM Bullion, local with good reviews' },
      { name: 'Silver — coins & rounds', pct: 30, note: 'Lower entry price, more volatile' },
      { name: 'Platinum (optional)', pct: 5, note: 'Small industrial-demand kicker' },
    ],
  },
  crypto: {
    intro: 'Majors only — buy on a major exchange, move to cold storage.',
    lines: [
      { name: 'Bitcoin (BTC)', pct: 60, note: 'The anchor — hardware wallet recommended' },
      { name: 'Ethereum (ETH)', pct: 30, note: 'Smart-contract leader' },
      { name: 'Large-cap alts (e.g., SOL)', pct: 10, note: 'Optional — highest risk slice' },
    ],
  },
  landReit: {
    intro: 'Real estate income now, optionally building toward direct land ownership.',
    lines: [
      { name: 'REIT index fund (VNQ)', pct: 60, note: 'Liquid real estate, pays dividends' },
      { name: 'Land fund — savings toward acreage', pct: 40, note: 'Accumulates toward a direct land purchase' },
    ],
  },
  bonds: {
    intro: 'The steady-income ballast of the plan.',
    lines: [
      { name: 'Treasury / CD ladder', pct: 50, note: 'Lock today’s rates; zero default risk' },
      { name: 'Total bond market fund (BND)', pct: 50, note: 'Broad, liquid, boring — by design' },
    ],
  },
  cash: {
    intro: 'Liquid and protected — your dry powder.',
    lines: [
      { name: 'High-yield savings account', pct: 100, note: 'FDIC-insured, withdraw anytime' },
    ],
  },
};
