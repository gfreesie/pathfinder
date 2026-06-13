import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  Gem,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { AllocationLine, AssetKey } from '../types';
import { ASSET_META } from '../logic/allocation';
import { fmtCompact, fmtMoney, project } from '../logic/projections';
import { STOCK_SYMBOLS, STOCK_UNIVERSE } from '../data/assetUniverse';
import {
  fetchCryptoUniverse,
  fetchMetalPrices,
  fetchStockQuotes,
  getStockApiKey,
  setStockApiKey,
  type Quote,
} from '../logic/prices';
import {
  type AssetCategory,
  type CustomHolding,
  holdingsTotal,
  loadHoldings,
  newHoldingId,
  rollUp,
  saveHoldings,
  seedFromAllocation,
  unitsFor,
} from '../logic/customPortfolio';
import './CustomPortfolioBuilder.css';

interface Props {
  capital: number;
  suggested: AllocationLine[];
  onApply: (lines: AllocationLine[], holdings: CustomHolding[]) => void;
  onClose: () => void;
}

type Tab = 'stock' | 'crypto' | 'metal' | 'custom';

const TAB_META: Record<Tab, { label: string; icon: typeof Coins }> = {
  stock: { label: 'Stocks & ETFs', icon: TrendingUp },
  crypto: { label: 'Crypto', icon: Coins },
  metal: { label: 'Metals', icon: Gem },
  custom: { label: 'Custom', icon: Sparkles },
};

const CLASS_OPTIONS: AssetKey[] = [
  'usStocks',
  'intlStocks',
  'metals',
  'crypto',
  'landReit',
  'bonds',
  'cash',
];

export default function CustomPortfolioBuilder({ capital, suggested, onApply, onClose }: Props) {
  const [holdings, setHoldings] = useState<CustomHolding[]>(() => {
    const saved = loadHoldings();
    return saved.length ? saved : seedFromAllocation(suggested, capital);
  });
  const [mode, setMode] = useState<'pct' | 'dollar'>('pct');
  const [tab, setTab] = useState<Tab>('stock');
  const [query, setQuery] = useState('');

  // live data
  const [crypto, setCrypto] = useState<Quote[]>([]);
  const [metals, setMetals] = useState<Quote[]>([]);
  const [stocks, setStocks] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // api key
  const [apiKey, setApiKeyState] = useState(getStockApiKey());
  const [keyDraft, setKeyDraft] = useState(getStockApiKey());

  const loadAll = async (key = apiKey) => {
    setLoading(true);
    setNotice(null);
    const [c, m, s] = await Promise.all([
      fetchCryptoUniverse(250),
      fetchMetalPrices(),
      fetchStockQuotes(STOCK_SYMBOLS, key),
    ]);
    setCrypto(c.data);
    setMetals(m.data);
    setStocks(s.data);
    const msgs: string[] = [];
    if (c.stale && c.data.length === 0) msgs.push('crypto prices unavailable');
    if (m.stale && m.data.length === 0) msgs.push('metal prices unavailable');
    if (s.error === 'no-api-key') msgs.push('add a free key for live stock prices');
    else if (s.stale && Object.keys(s.data).length === 0) msgs.push('stock prices unavailable');
    setNotice(msgs.length ? msgs.join(' · ') : null);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  const invested = holdingsTotal(holdings);
  const leftover = Math.max(0, capital - invested);
  const over = Math.max(0, invested - capital);
  const pctUsed = capital > 0 ? (invested / capital) * 100 : 0;

  const roll = useMemo(() => rollUp(holdings, capital), [holdings, capital]);

  const weights = useMemo(() => {
    const w: Record<AssetKey, number> = {
      usStocks: 0, intlStocks: 0, metals: 0, crypto: 0, landReit: 0, bonds: 0, cash: 0,
    };
    for (const l of roll.lines) w[l.key] = l.pct / 100;
    return w;
  }, [roll]);

  const projected = useMemo(() => project(capital, 0, 0, weights, 30), [capital, weights]);

  // ---- holding mutations ----------------------------------------------------

  const addHolding = (
    partial: Omit<CustomHolding, 'id' | 'dollars'> & { dollars?: number },
  ) => {
    setHoldings((hs) => {
      if (partial.symbol && hs.some((h) => h.symbol === partial.symbol && h.category === partial.category)) {
        return hs; // already added
      }
      const seed =
        partial.dollars ??
        Math.min(leftover || capital, Math.max(0, Math.round((capital * 0.05) / 50) * 50));
      return [...hs, { ...partial, id: newHoldingId(), dollars: seed }];
    });
  };

  const removeHolding = (id: string) =>
    setHoldings((hs) => hs.filter((h) => h.id !== id));

  const setDollars = (id: string, dollars: number) =>
    setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, dollars: Math.max(0, Math.round(dollars)) } : h)));

  // ---- asset picker results -------------------------------------------------

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (tab === 'stock') {
      const list = STOCK_UNIVERSE.filter(
        (s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      ).slice(0, 80);
      return list.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: stocks[s.symbol]?.price ?? null,
        category: 'stock' as AssetCategory,
        assetClass: s.assetClass as AssetKey,
        image: undefined as string | undefined,
      }));
    }
    if (tab === 'crypto') {
      return crypto
        .filter((c) => !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        .slice(0, 80)
        .map((c) => ({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          category: 'crypto' as AssetCategory,
          assetClass: 'crypto' as AssetKey,
          image: c.image,
        }));
    }
    if (tab === 'metal') {
      return metals
        .filter((m) => !q || m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
        .map((m) => ({
          symbol: m.symbol,
          name: m.name,
          price: m.price,
          category: 'metal' as AssetCategory,
          assetClass: 'metals' as AssetKey,
          image: undefined,
        }));
    }
    return [];
  }, [tab, query, crypto, metals, stocks]);

  const addedSymbols = useMemo(
    () => new Set(holdings.map((h) => `${h.category}:${h.symbol}`)),
    [holdings],
  );

  // ---- custom asset form ----------------------------------------------------

  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customClass, setCustomClass] = useState<AssetKey>('usStocks');
  const customNameRef = useRef<HTMLInputElement>(null);

  const addCustom = () => {
    const name = customName.trim();
    if (!name) {
      customNameRef.current?.focus();
      return;
    }
    const price = customPrice ? Number(customPrice) : null;
    addHolding({
      symbol: name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CUSTOM',
      name,
      category: 'custom',
      assetClass: customClass,
      price: price && price > 0 ? price : null,
    });
    setCustomName('');
    setCustomPrice('');
  };

  // ---- render helpers -------------------------------------------------------

  const valueInput = (h: CustomHolding) => {
    if (mode === 'pct') {
      const pct = capital > 0 ? (h.dollars / capital) * 100 : 0;
      return (
        <div className="cpb-value">
          <input
            type="number"
            min={0}
            step={0.5}
            value={Number(pct.toFixed(1))}
            onChange={(e) => setDollars(h.id, (Number(e.target.value) / 100) * capital)}
          />
          <span className="cpb-unit">%</span>
        </div>
      );
    }
    return (
      <div className="cpb-value">
        <span className="cpb-unit">$</span>
        <input
          type="number"
          min={0}
          step={50}
          value={Math.round(h.dollars)}
          onChange={(e) => setDollars(h.id, Number(e.target.value))}
        />
      </div>
    );
  };

  const saveKey = () => {
    setStockApiKey(keyDraft);
    setApiKeyState(keyDraft);
    void loadAll(keyDraft);
  };

  return (
    <motion.div
      className="cpb-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cpb-panel"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cpb-header">
          <div>
            <h2>Build your custom portfolio</h2>
            <p>Pick real assets at live prices and dial in exactly how much of each you want.</p>
          </div>
          <button className="cpb-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {notice && (
          <div className="cpb-notice">
            <RefreshCw size={14} /> {notice}
            <button className="cpb-refresh" onClick={() => void loadAll()} disabled={loading}>
              {loading ? 'Loading…' : 'Retry'}
            </button>
          </div>
        )}

        <div className="cpb-body">
          {/* LEFT: asset picker */}
          <section className="cpb-picker">
            <div className="cpb-tabs">
              {(Object.keys(TAB_META) as Tab[]).map((t) => {
                const Icon = TAB_META[t].icon;
                return (
                  <button
                    key={t}
                    className={`cpb-tab ${tab === t ? 'active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    <Icon size={15} /> {TAB_META[t].label}
                  </button>
                );
              })}
            </div>

            {tab !== 'custom' ? (
              <>
                <div className="cpb-search">
                  <Search size={15} />
                  <input
                    placeholder={`Search ${TAB_META[tab].label.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="cpb-results">
                  {results.length === 0 && (
                    <p className="cpb-empty">
                      {loading ? 'Loading live prices…' : 'No matches — try another search.'}
                    </p>
                  )}
                  {results.map((r) => {
                    const added = addedSymbols.has(`${r.category}:${r.symbol}`);
                    return (
                      <button
                        key={r.symbol}
                        className={`cpb-asset ${added ? 'added' : ''}`}
                        onClick={() =>
                          addHolding({
                            symbol: r.symbol,
                            name: r.name,
                            category: r.category,
                            assetClass: r.assetClass,
                            price: r.price,
                          })
                        }
                        disabled={added}
                      >
                        {r.image ? (
                          <img className="cpb-logo" src={r.image} alt="" />
                        ) : (
                          <span className="cpb-ticker">{r.symbol.slice(0, 4)}</span>
                        )}
                        <span className="cpb-asset-name">
                          <strong>{r.symbol}</strong>
                          <em>{r.name}</em>
                        </span>
                        <span className="cpb-asset-price">
                          {r.price != null ? fmtMoney(r.price) : '—'}
                        </span>
                        {added ? <span className="cpb-added">Added</span> : <Plus size={16} />}
                      </button>
                    );
                  })}
                </div>
                {tab === 'stock' && !apiKey && (
                  <div className="cpb-keybox">
                    <p>
                      <KeyRound size={14} /> Stock prices need a free API key from{' '}
                      <a href="https://site.financialmodelingprep.com/developer/docs" target="_blank" rel="noreferrer">
                        Financial Modeling Prep
                      </a>{' '}
                      (takes ~2 minutes). Crypto &amp; metals work without one.
                    </p>
                    <div className="cpb-keyrow">
                      <input
                        type="password"
                        placeholder="Paste FMP API key"
                        value={keyDraft}
                        onChange={(e) => setKeyDraft(e.target.value)}
                      />
                      <button className="btn primary" onClick={saveKey} disabled={!keyDraft.trim()}>
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="cpb-custom">
                <p className="cpb-custom-hint">
                  Add anything that isn’t on the live lists — private holdings, real estate, a
                  pre-IPO stake. You set the value yourself.
                </p>
                <label>
                  Name
                  <input
                    ref={customNameRef}
                    placeholder="e.g. Rental property, Private fund"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </label>
                <label>
                  Unit price (optional)
                  <input
                    type="number"
                    min={0}
                    placeholder="leave blank if N/A"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </label>
                <label>
                  Counts as
                  <select value={customClass} onChange={(e) => setCustomClass(e.target.value as AssetKey)}>
                    {CLASS_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {ASSET_META[k].label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn primary" onClick={addCustom}>
                  <Plus size={16} /> Add custom asset
                </button>
              </div>
            )}
          </section>

          {/* RIGHT: holdings + totals */}
          <section className="cpb-holdings">
            <div className="cpb-holdings-head">
              <h3>Your holdings</h3>
              <div className="cpb-modeToggle">
                <button className={mode === 'pct' ? 'active' : ''} onClick={() => setMode('pct')}>%</button>
                <button className={mode === 'dollar' ? 'active' : ''} onClick={() => setMode('dollar')}>$</button>
              </div>
            </div>

            <div className="cpb-list">
              {holdings.length === 0 && (
                <p className="cpb-empty">Add assets from the left to start building.</p>
              )}
              {holdings.map((h) => {
                const units = unitsFor(h);
                return (
                  <div className="cpb-row" key={h.id}>
                    <span className="cpb-swatch" style={{ background: ASSET_META[h.assetClass].color }} />
                    <span className="cpb-row-name">
                      <strong>{h.symbol}</strong>
                      <em>{h.name}</em>
                    </span>
                    <span className="cpb-row-meta">
                      {h.price != null ? (
                        <>
                          {fmtMoney(h.price)}
                          {units != null && <small>{units >= 100 ? units.toFixed(1) : units.toFixed(3)} units</small>}
                        </>
                      ) : (
                        <small>no live price</small>
                      )}
                    </span>
                    {valueInput(h)}
                    <button className="cpb-remove" onClick={() => removeHolding(h.id)} aria-label="Remove">
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cpb-totals">
              <div className="cpb-bar">
                <div
                  className={`cpb-bar-fill ${over > 0 ? 'over' : ''}`}
                  style={{ width: `${Math.min(100, pctUsed)}%` }}
                />
              </div>
              <div className="cpb-total-row">
                <span>
                  <Wallet size={14} /> Allocated{' '}
                  <strong>{fmtMoney(invested)}</strong> of {fmtMoney(capital)}
                </span>
                {over > 0 ? (
                  <span className="cpb-over">Over by {fmtMoney(over)}</span>
                ) : (
                  <span className="cpb-left">{fmtMoney(leftover)} → cash</span>
                )}
              </div>

              <div className="cpb-projection">
                <TrendingUp size={15} />
                <span>
                  Projected (expected) value:{' '}
                  <strong>{fmtCompact(projected[10].exp)}</strong> in 10y ·{' '}
                  <strong>{fmtCompact(projected[30].exp)}</strong> in 30y
                  <small>capital only, no monthly contributions — illustrative</small>
                </span>
              </div>
            </div>

            <div className="cpb-actions">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn primary"
                onClick={() => onApply(roll.lines, holdings)}
                disabled={holdings.length === 0}
              >
                Apply to my plan
              </button>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
