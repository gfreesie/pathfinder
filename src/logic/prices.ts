// Live price layer for the custom portfolio builder.
//
// Sources (all callable directly from the browser):
//   • Crypto  — CoinGecko /coins/markets (top 250, no key, CORS-enabled)
//   • Metals  — gold-api.com per-symbol spot (no key, CORS-enabled)
//   • Stocks  — Financial Modeling Prep batch /quote (free API key required)
//
// Everything is cached in localStorage with a short TTL so we don't hammer the
// APIs (and so FMP's free-tier request budget lasts).

import type { AssetCategory } from './customPortfolio';

export interface Quote {
  symbol: string;       // ticker / coin symbol / metal symbol (uppercase)
  name: string;
  price: number;        // USD per share / coin / troy-ounce (metals)
  category: AssetCategory;
  image?: string;       // crypto logo url (CoinGecko)
  marketCap?: number;
}

export interface PriceResult<T> {
  data: T;
  stale: boolean;       // served from an expired cache because the network failed
  error?: string;
}

const CACHE_PREFIX = 'pathfinder-price-';
const KEY_STORE = 'pathfinder-fmp-key';

// ---- API key (Financial Modeling Prep) -------------------------------------

export function getStockApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) ?? '';
  } catch {
    return '';
  }
}

export function setStockApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch {
    /* storage unavailable */
  }
}

// ---- tiny localStorage cache -----------------------------------------------

interface CacheEntry<T> {
  ts: number;
  data: T;
}

function readCache<T>(key: string, ttlMs: number): { data: T; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return { data: entry.data, fresh: Date.now() - entry.ts < ttlMs };
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full / unavailable */
  }
}

// ---- Crypto (CoinGecko) -----------------------------------------------------

const CRYPTO_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchCryptoUniverse(limit = 250): Promise<PriceResult<Quote[]>> {
  const cacheKey = `crypto-${limit}`;
  const cached = readCache<Quote[]>(cacheKey, CRYPTO_TTL);
  if (cached?.fresh) return { data: cached.data, stale: false };

  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
    `&order=market_cap_desc&per_page=${Math.min(250, limit)}&page=1&sparkline=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const rows = (await res.json()) as Array<{
      symbol: string;
      name: string;
      current_price: number;
      image: string;
      market_cap: number;
    }>;
    const data: Quote[] = rows
      .filter((r) => typeof r.current_price === 'number')
      .map((r) => ({
        symbol: r.symbol.toUpperCase(),
        name: r.name,
        price: r.current_price,
        category: 'crypto' as const,
        image: r.image,
        marketCap: r.market_cap,
      }));
    writeCache(cacheKey, data);
    return { data, stale: false };
  } catch (e) {
    if (cached) return { data: cached.data, stale: true, error: String(e) };
    return { data: [], stale: true, error: String(e) };
  }
}

// ---- Metals (gold-api.com) --------------------------------------------------

const METAL_TTL = 10 * 60 * 1000; // 10 minutes

export const METALS: Array<{ symbol: string; name: string }> = [
  { symbol: 'XAU', name: 'Gold' },
  { symbol: 'XAG', name: 'Silver' },
  { symbol: 'XPT', name: 'Platinum' },
  { symbol: 'XPD', name: 'Palladium' },
  { symbol: 'HG', name: 'Copper' },
];

export async function fetchMetalPrices(): Promise<PriceResult<Quote[]>> {
  const cacheKey = 'metals';
  const cached = readCache<Quote[]>(cacheKey, METAL_TTL);
  if (cached?.fresh) return { data: cached.data, stale: false };

  try {
    const results = await Promise.all(
      METALS.map(async (m) => {
        const res = await fetch(`https://api.gold-api.com/price/${m.symbol}`);
        if (!res.ok) throw new Error(`gold-api ${m.symbol} ${res.status}`);
        const j = (await res.json()) as { price: number; name: string };
        return {
          symbol: m.symbol,
          name: m.name,
          price: j.price,
          category: 'metal' as const,
        } satisfies Quote;
      }),
    );
    writeCache(cacheKey, results);
    return { data: results, stale: false };
  } catch (e) {
    if (cached) return { data: cached.data, stale: true, error: String(e) };
    return { data: [], stale: true, error: String(e) };
  }
}

// ---- Stocks (Financial Modeling Prep) --------------------------------------

const STOCK_TTL = 10 * 60 * 1000; // 10 minutes
const FMP_BASE = 'https://financialmodelingprep.com/api/v3/quote/';
const CHUNK = 40; // symbols per request (keeps URLs short)

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Fetches quotes for the given tickers. Returns a map keyed by uppercase symbol.
export async function fetchStockQuotes(
  symbols: string[],
  apiKey: string,
): Promise<PriceResult<Record<string, Quote>>> {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).sort();
  const cacheKey = `stocks-${unique.join(',').slice(0, 200)}-${unique.length}`;
  const cached = readCache<Record<string, Quote>>(cacheKey, STOCK_TTL);
  if (cached?.fresh) return { data: cached.data, stale: false };

  if (!apiKey) {
    return {
      data: cached?.data ?? {},
      stale: true,
      error: 'no-api-key',
    };
  }

  try {
    const map: Record<string, Quote> = {};
    for (const group of chunk(unique, CHUNK)) {
      const url = `${FMP_BASE}${group.join(',')}?apikey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`FMP ${res.status}`);
      const rows = (await res.json()) as Array<{ symbol: string; name: string; price: number }>;
      if (!Array.isArray(rows)) throw new Error('FMP unexpected response');
      for (const r of rows) {
        if (typeof r.price !== 'number') continue;
        map[r.symbol.toUpperCase()] = {
          symbol: r.symbol.toUpperCase(),
          name: r.name ?? r.symbol,
          price: r.price,
          category: 'stock',
        };
      }
    }
    writeCache(cacheKey, map);
    return { data: map, stale: false };
  } catch (e) {
    if (cached) return { data: cached.data, stale: true, error: String(e) };
    return { data: {}, stale: true, error: String(e) };
  }
}
