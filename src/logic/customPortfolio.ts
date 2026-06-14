// Custom portfolio model. A custom portfolio is a list of individual holdings
// (real tickers / coins / metals, plus optional manual "custom" assets and
// cash). Each holding carries an allocated dollar amount; percentages are
// derived from the user's capital. Holdings roll up into the seven projection
// asset-classes so the existing growth math and summary card keep working.

import type { AllocationLine, AssetKey } from '../types';
import { ASSET_META } from './allocation';

export type AssetCategory = 'stock' | 'crypto' | 'metal' | 'custom' | 'cash';

// Where to acquire each asset, by category (falling back to the projection
// class for manual/custom holdings). Examples, not endorsements.
export const ACQUISITION_DISCLAIMER =
  'Venues are examples, not endorsements — do your own diligence.';

export function whereToBuy(category: AssetCategory, assetClass: AssetKey): string {
  switch (category) {
    case 'stock':
      return 'Brokerage — Fidelity, Schwab, or Vanguard (or a commission-free app like Robinhood).';
    case 'crypto':
      return 'Major exchange — Coinbase, Kraken, or Gemini; move long-term holds to a hardware wallet (Ledger/Trezor).';
    case 'metal':
      return 'Bullion dealers — APMEX, JM Bullion, or SD Bullion (secure storage); or ETFs like GLD/SLV/IAU.';
    case 'cash':
      return 'High-yield savings (FDIC-insured) or a money-market fund.';
    case 'custom':
    default:
      break;
  }
  switch (assetClass) {
    case 'bonds':
      return 'Treasuries at TreasuryDirect.gov; brokered CDs and bond funds (BND) via your brokerage.';
    case 'landReit':
      return 'REIT ETFs (VNQ) via brokerage; direct land via a local realtor or auction.';
    case 'cash':
      return 'High-yield savings (FDIC-insured) or a money-market fund.';
    case 'crypto':
      return 'Major exchange — Coinbase, Kraken, or Gemini; hardware wallet for long-term holds.';
    case 'metals':
      return 'Bullion dealers — APMEX, JM Bullion, SD Bullion; or ETFs like GLD/SLV/IAU.';
    default:
      return 'Acquire through the relevant venue for this asset; value is self-reported.';
  }
}

export interface CustomHolding {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  assetClass: AssetKey; // which projection bucket this rolls into
  price: number | null; // live unit price (null for cash / unpriced custom)
  dollars: number;      // allocated amount in USD
}

const KEY_ORDER: AssetKey[] = [
  'usStocks',
  'intlStocks',
  'metals',
  'crypto',
  'landReit',
  'bonds',
  'cash',
];

let idCounter = 0;
export function newHoldingId(): string {
  idCounter += 1;
  return `h${Date.now().toString(36)}-${idCounter}`;
}

export function holdingsTotal(holdings: CustomHolding[]): number {
  return holdings.reduce((s, h) => s + (h.dollars || 0), 0);
}

// Shares/units implied by a dollar amount at the current price.
export function unitsFor(h: CustomHolding): number | null {
  if (!h.price || h.price <= 0) return null;
  return h.dollars / h.price;
}

export interface RollUp {
  lines: AllocationLine[];          // aggregated by asset-class (for donut + projection)
  invested: number;                 // sum of holding dollars
  leftoverToCash: number;           // capital not yet allocated
  over: number;                     // amount allocated beyond capital (0 if none)
  capital: number;
}

// Aggregate holdings into AllocationLine[] keyed by asset-class. Any capital
// left unallocated becomes a cash line; over-allocation is reported separately.
export function rollUp(holdings: CustomHolding[], capital: number): RollUp {
  const invested = holdingsTotal(holdings);
  const leftoverToCash = Math.max(0, capital - invested);
  const over = Math.max(0, invested - capital);

  const byClass = new Map<AssetKey, number>();
  for (const h of holdings) {
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + (h.dollars || 0));
  }
  if (leftoverToCash > 0) {
    byClass.set('cash', (byClass.get('cash') ?? 0) + leftoverToCash);
  }

  const denom = invested + leftoverToCash || 1;

  // raw percentages, then largest-remainder rounding to sum to 100
  const entries = KEY_ORDER.filter((k) => (byClass.get(k) ?? 0) > 0).map((k) => {
    const dollars = byClass.get(k) ?? 0;
    return { k, dollars, raw: (dollars / denom) * 100 };
  });

  const floored = entries.map((e) => ({ ...e, f: Math.floor(e.raw), r: e.raw - Math.floor(e.raw) }));
  let remainder = 100 - floored.reduce((s, x) => s + x.f, 0);
  floored.sort((a, b) => b.r - a.r);
  for (const x of floored) {
    if (remainder <= 0) break;
    x.f += 1;
    remainder -= 1;
  }

  const lines: AllocationLine[] = KEY_ORDER.filter((k) => floored.some((x) => x.k === k)).map((k) => {
    const row = floored.find((x) => x.k === k)!;
    return {
      key: k,
      label: ASSET_META[k].label,
      pct: row.f,
      dollars: Math.round(row.dollars),
      color: ASSET_META[k].color,
      note: k === 'cash' && leftoverToCash > 0 ? 'Unallocated — held as cash' : undefined,
    };
  });

  return { lines, invested, leftoverToCash, over, capital };
}

// ---- persistence ------------------------------------------------------------

const STORE = 'nelli-custom-portfolio';

export function saveHoldings(holdings: CustomHolding[]): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(holdings));
  } catch {
    /* storage unavailable */
  }
}

export function loadHoldings(): CustomHolding[] {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomHolding[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearHoldings(): void {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* storage unavailable */
  }
}

// Seed a starter set of holdings from a suggested allocation so the builder
// opens with the recommended mix already filled in (as cash-class buckets the
// user can then replace with specific tickers).
export function seedFromAllocation(lines: AllocationLine[], capital: number): CustomHolding[] {
  return lines.map((l) => ({
    id: newHoldingId(),
    symbol: l.key.toUpperCase(),
    name: l.label,
    category: 'custom' as AssetCategory,
    assetClass: l.key,
    price: null,
    dollars: Math.round((l.pct / 100) * capital),
  }));
}
