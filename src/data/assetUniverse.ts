// The stock universe offered in the custom portfolio builder.
//
// Each entry maps a real ticker to one of the projection asset-classes so that
// custom holdings roll up into the existing growth math:
//   • 'usStocks'   — US-listed companies & US index/sector ETFs
//   • 'intlStocks' — non-US companies (ADRs) & international ETFs
//
// Live prices for these come from Financial Modeling Prep (see logic/prices.ts).
// Crypto and metals are sourced separately and don't live here.

import type { AssetKey } from '../types';

export interface StockDef {
  symbol: string;
  name: string;
  assetClass: Extract<AssetKey, 'usStocks' | 'intlStocks'>;
}

// --- US mega/large-cap, AI, and widely-held names ---------------------------
const US: Array<[string, string]> = [
  ['AAPL', 'Apple'],
  ['MSFT', 'Microsoft'],
  ['NVDA', 'NVIDIA'],
  ['GOOGL', 'Alphabet (Google) A'],
  ['GOOG', 'Alphabet (Google) C'],
  ['AMZN', 'Amazon'],
  ['META', 'Meta Platforms'],
  ['TSLA', 'Tesla'],
  ['SPCX', 'SpaceX'],
  ['AVGO', 'Broadcom'],
  ['BRK-B', 'Berkshire Hathaway B'],
  ['LLY', 'Eli Lilly'],
  ['JPM', 'JPMorgan Chase'],
  ['V', 'Visa'],
  ['MA', 'Mastercard'],
  ['UNH', 'UnitedHealth'],
  ['XOM', 'Exxon Mobil'],
  ['COST', 'Costco'],
  ['HD', 'Home Depot'],
  ['PG', 'Procter & Gamble'],
  ['JNJ', 'Johnson & Johnson'],
  ['WMT', 'Walmart'],
  ['NFLX', 'Netflix'],
  ['CRM', 'Salesforce'],
  ['BAC', 'Bank of America'],
  ['ORCL', 'Oracle'],
  ['AMD', 'Advanced Micro Devices'],
  ['KO', 'Coca-Cola'],
  ['PEP', 'PepsiCo'],
  ['ADBE', 'Adobe'],
  ['CSCO', 'Cisco'],
  ['ACN', 'Accenture'],
  ['MRK', 'Merck'],
  ['ABBV', 'AbbVie'],
  ['TMO', 'Thermo Fisher'],
  ['MCD', "McDonald's"],
  ['LIN', 'Linde'],
  ['INTC', 'Intel'],
  ['QCOM', 'Qualcomm'],
  ['TXN', 'Texas Instruments'],
  ['INTU', 'Intuit'],
  ['IBM', 'IBM'],
  ['NOW', 'ServiceNow'],
  ['AMAT', 'Applied Materials'],
  ['MU', 'Micron Technology'],
  ['DIS', 'Walt Disney'],
  ['GE', 'GE Aerospace'],
  ['CAT', 'Caterpillar'],
  ['BA', 'Boeing'],
  ['HON', 'Honeywell'],
  ['GS', 'Goldman Sachs'],
  ['MS', 'Morgan Stanley'],
  ['WFC', 'Wells Fargo'],
  ['C', 'Citigroup'],
  ['AXP', 'American Express'],
  ['PFE', 'Pfizer'],
  ['ABT', 'Abbott Laboratories'],
  ['DHR', 'Danaher'],
  ['NKE', 'Nike'],
  ['SBUX', 'Starbucks'],
  ['LOW', "Lowe's"],
  ['UPS', 'United Parcel Service'],
  ['RTX', 'RTX (Raytheon)'],
  ['LMT', 'Lockheed Martin'],
  ['GD', 'General Dynamics'],
  ['NOC', 'Northrop Grumman'],
  ['DE', 'Deere & Co'],
  ['UBER', 'Uber Technologies'],
  ['LYFT', 'Lyft'],
  ['ABNB', 'Airbnb'],
  ['PYPL', 'PayPal'],
  ['SQ', 'Block (Square)'],
  ['SHOP', 'Shopify'],
  ['SNOW', 'Snowflake'],
  ['PLTR', 'Palantir Technologies'],
  ['CRWD', 'CrowdStrike'],
  ['PANW', 'Palo Alto Networks'],
  ['ZS', 'Zscaler'],
  ['NET', 'Cloudflare'],
  ['DDOG', 'Datadog'],
  ['MDB', 'MongoDB'],
  ['SMCI', 'Super Micro Computer'],
  ['ARM', 'Arm Holdings'],
  ['DELL', 'Dell Technologies'],
  ['HPQ', 'HP Inc'],
  ['MRVL', 'Marvell Technology'],
  ['MCHP', 'Microchip Technology'],
  ['ADI', 'Analog Devices'],
  ['LRCX', 'Lam Research'],
  ['KLAC', 'KLA Corp'],
  ['COIN', 'Coinbase Global'],
  ['HOOD', 'Robinhood Markets'],
  ['MSTR', 'MicroStrategy'],
  ['RBLX', 'Roblox'],
  ['SPOT', 'Spotify'],
  ['PINS', 'Pinterest'],
  ['SNAP', 'Snap'],
  ['DASH', 'DoorDash'],
  ['F', 'Ford Motor'],
  ['GM', 'General Motors'],
  ['RIVN', 'Rivian Automotive'],
  ['LCID', 'Lucid Group'],
  ['NIO', 'NIO'],
  ['CVX', 'Chevron'],
  ['COP', 'ConocoPhillips'],
  ['SLB', 'Schlumberger'],
  ['OXY', 'Occidental Petroleum'],
  ['NEE', 'NextEra Energy'],
  ['DUK', 'Duke Energy'],
  ['SO', 'Southern Co'],
  ['T', 'AT&T'],
  ['VZ', 'Verizon'],
  ['TMUS', 'T-Mobile US'],
  ['CMCSA', 'Comcast'],
  ['CVS', 'CVS Health'],
  ['CI', 'Cigna'],
  ['HUM', 'Humana'],
  ['ISRG', 'Intuitive Surgical'],
  ['MDT', 'Medtronic'],
  ['BMY', 'Bristol-Myers Squibb'],
  ['AMGN', 'Amgen'],
  ['GILD', 'Gilead Sciences'],
  ['MRNA', 'Moderna'],
  ['REGN', 'Regeneron'],
  ['VRTX', 'Vertex Pharmaceuticals'],
  ['BKNG', 'Booking Holdings'],
  ['MAR', 'Marriott International'],
  ['CMG', 'Chipotle Mexican Grill'],
  ['TGT', 'Target'],
  ['MNST', 'Monster Beverage'],
  ['MDLZ', 'Mondelez'],
  ['CL', 'Colgate-Palmolive'],
  ['KMB', 'Kimberly-Clark'],
  ['GIS', 'General Mills'],
  ['ADP', 'Automatic Data Processing'],
  ['BLK', 'BlackRock'],
  ['SCHW', 'Charles Schwab'],
  ['SPGI', 'S&P Global'],
  ['CME', 'CME Group'],
  ['ICE', 'Intercontinental Exchange'],
  ['PNC', 'PNC Financial'],
  ['USB', 'U.S. Bancorp'],
  ['TFC', 'Truist Financial'],
  ['MMM', '3M'],
  ['EMR', 'Emerson Electric'],
  ['ETN', 'Eaton'],
  ['ITW', 'Illinois Tool Works'],
  ['PH', 'Parker-Hannifin'],
  ['FDX', 'FedEx'],
  ['CSX', 'CSX'],
  ['UNP', 'Union Pacific'],
  ['NSC', 'Norfolk Southern'],
  ['WM', 'Waste Management'],
  ['ECL', 'Ecolab'],
  ['APD', 'Air Products'],
  ['SHW', 'Sherwin-Williams'],
  ['FCX', 'Freeport-McMoRan'],
  ['NEM', 'Newmont'],
  ['NUE', 'Nucor'],
];

// --- International (ADRs) and ex-US ETFs -------------------------------------
const INTL: Array<[string, string]> = [
  ['TSM', 'Taiwan Semiconductor (ADR)'],
  ['ASML', 'ASML Holding (ADR)'],
  ['BABA', 'Alibaba Group (ADR)'],
  ['TCEHY', 'Tencent Holdings (ADR)'],
  ['NVO', 'Novo Nordisk (ADR)'],
  ['SAP', 'SAP (ADR)'],
  ['TM', 'Toyota Motor (ADR)'],
  ['SONY', 'Sony Group (ADR)'],
  ['SHEL', 'Shell (ADR)'],
  ['BP', 'BP (ADR)'],
  ['HSBC', 'HSBC Holdings (ADR)'],
  ['UL', 'Unilever (ADR)'],
  ['AZN', 'AstraZeneca (ADR)'],
  ['GSK', 'GSK (ADR)'],
  ['NVS', 'Novartis (ADR)'],
  ['RY', 'Royal Bank of Canada'],
  ['TD', 'Toronto-Dominion Bank'],
  ['SHOP', 'Shopify (Canada)'],
  ['MELI', 'MercadoLibre'],
  ['SE', 'Sea Limited (ADR)'],
  ['INFY', 'Infosys (ADR)'],
  ['JD', 'JD.com (ADR)'],
  ['PDD', 'PDD Holdings (ADR)'],
  ['NTES', 'NetEase (ADR)'],
  ['SPOT', 'Spotify (Sweden)'],
  ['STLA', 'Stellantis'],
  ['RIO', 'Rio Tinto (ADR)'],
  ['BHP', 'BHP Group (ADR)'],
];

// --- ETFs commonly used as building blocks ----------------------------------
const ETF_US: Array<[string, string]> = [
  ['VOO', 'Vanguard S&P 500 ETF'],
  ['VTI', 'Vanguard Total US Market ETF'],
  ['SPY', 'SPDR S&P 500 ETF'],
  ['QQQ', 'Invesco Nasdaq-100 ETF'],
  ['QQQM', 'Invesco Nasdaq-100 ETF (M)'],
  ['SCHD', 'Schwab US Dividend Equity ETF'],
  ['VUG', 'Vanguard Growth ETF'],
  ['VYM', 'Vanguard High Dividend Yield ETF'],
  ['DIA', 'SPDR Dow Jones ETF'],
  ['IWM', 'iShares Russell 2000 ETF'],
  ['SMH', 'VanEck Semiconductor ETF'],
  ['SOXX', 'iShares Semiconductor ETF'],
  ['XLK', 'Technology Select Sector ETF'],
  ['XLE', 'Energy Select Sector ETF'],
  ['XLF', 'Financial Select Sector ETF'],
  ['ARKK', 'ARK Innovation ETF'],
];

const ETF_INTL: Array<[string, string]> = [
  ['VXUS', 'Vanguard Total International ETF'],
  ['VEA', 'Vanguard Developed Markets ETF'],
  ['VWO', 'Vanguard Emerging Markets ETF'],
  ['EFA', 'iShares MSCI EAFE ETF'],
  ['EEM', 'iShares MSCI Emerging Markets ETF'],
  ['INDA', 'iShares MSCI India ETF'],
  ['MCHI', 'iShares MSCI China ETF'],
  ['EWJ', 'iShares MSCI Japan ETF'],
];

function build(): StockDef[] {
  const seen = new Set<string>();
  const out: StockDef[] = [];
  const push = (rows: Array<[string, string]>, cls: StockDef['assetClass']) => {
    for (const [symbol, name] of rows) {
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      out.push({ symbol, name, assetClass: cls });
    }
  };
  push(US, 'usStocks');
  push(ETF_US, 'usStocks');
  push(INTL, 'intlStocks');
  push(ETF_INTL, 'intlStocks');
  return out;
}

export const STOCK_UNIVERSE: StockDef[] = build();

export const STOCK_SYMBOLS: string[] = STOCK_UNIVERSE.map((s) => s.symbol);

export const STOCK_BY_SYMBOL: Record<string, StockDef> = Object.fromEntries(
  STOCK_UNIVERSE.map((s) => [s.symbol, s]),
);
