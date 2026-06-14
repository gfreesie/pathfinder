// "How G would roll the dice" — G's signature Maverick lineup, used by the
// custom portfolio builder's dice button. Dollar amounts are at G_BASIS capital;
// the builder scales them to whatever capital the current visitor has, so at the
// default $30k it lands exactly as G set it.

import type { AssetCategory } from '../logic/customPortfolio';
import type { AssetKey } from '../types';

export interface GHolding {
  symbol: string;
  name: string;
  category: AssetCategory;
  assetClass: AssetKey;
  dollars: number; // at G_BASIS capital
}

export const G_BASIS = 30000;

export const G_HOLDINGS: GHolding[] = [
  // US stocks & index funds — $6,000 (20%)
  { symbol: 'TSLA', name: 'Tesla', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  { symbol: 'COHR', name: 'Coherent', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  { symbol: 'GLW', name: 'Corning', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  { symbol: 'GME', name: 'GameStop', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  { symbol: 'NVDA', name: 'NVIDIA', category: 'stock', assetClass: 'usStocks', dollars: 1000 },
  // Physical precious metals — $9,000 (30%)
  { symbol: 'XAU', name: 'Gold', category: 'metal', assetClass: 'metals', dollars: 4250 },
  { symbol: 'XAG', name: 'Silver', category: 'metal', assetClass: 'metals', dollars: 4000 },
  { symbol: 'HG', name: 'Copper', category: 'metal', assetClass: 'metals', dollars: 750 },
  // Cryptocurrency — $7,500 (25%)
  { symbol: 'BTC', name: 'Bitcoin', category: 'crypto', assetClass: 'crypto', dollars: 1500 },
  { symbol: 'SOL', name: 'Solana', category: 'crypto', assetClass: 'crypto', dollars: 1500 },
  { symbol: 'XRP', name: 'XRP', category: 'crypto', assetClass: 'crypto', dollars: 1500 },
  { symbol: 'ETH', name: 'Ethereum', category: 'crypto', assetClass: 'crypto', dollars: 1500 },
  { symbol: 'XMR', name: 'Monero', category: 'crypto', assetClass: 'crypto', dollars: 1500 },
  // Land & REITs — $5,000 (17%) — a manual/custom holding
  { symbol: 'LANDREIT', name: 'Land & REITs', category: 'custom', assetClass: 'landReit', dollars: 5000 },
];
