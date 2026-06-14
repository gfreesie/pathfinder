import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
  searchStocks,
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
  const [stockSearch, setStockSearch] = useState<Quote[]>([]); // live FMP search hits
  const [searching, setSearching] = useState(false); // live ticker query in flight
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // autocomplete: keyboard-highlighted option + on-demand price fills
  const [activeIndex, setActiveIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const priceReqRef = useRef<Set<string>>(new Set()); // symbols already price-fetched this session

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time data fetch on mount
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live ticker search across all listed stocks (debounced), so any symbol —
  // not just the curated universe — is reachable. Prices are filled in on
  // highlight (see ensurePrice) rather than bulk-fetched, to spare FMP's budget.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- debounced external search; immediate "searching" feedback and clearing stale hits are intentional */
    if (tab !== 'stock' || !apiKey || query.trim().length < 1) {
      setStockSearch([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const hits = await searchStocks(query, apiKey);
      if (cancelled) return;
      setStockSearch(hits);
      setSearching(false);
    }, 200);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, tab, apiKey]);

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
      const curated = STOCK_UNIVERSE.filter(
        (s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
      ).map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: stocks[s.symbol]?.price ?? null,
        category: 'stock' as AssetCategory,
        assetClass: s.assetClass as AssetKey,
        image: undefined as string | undefined,
        exchange: undefined as string | undefined,
      }));
      const seen = new Set(curated.map((r) => r.symbol));
      // Append live search hits for any listed ticker not in the curated set
      const extra = stockSearch
        .filter((h) => !seen.has(h.symbol))
        .map((h) => ({
          symbol: h.symbol,
          name: h.name,
          price: stocks[h.symbol]?.price ?? null,
          category: 'stock' as AssetCategory,
          assetClass: 'usStocks' as AssetKey,
          image: undefined as string | undefined,
          exchange: h.exchange,
        }));
      const merged = [...curated, ...extra];
      if (!q) return merged.slice(0, 80);
      // Rank so exact-ticker / prefix matches lead regardless of source; original
      // order (curated before live) breaks ties.
      const rank = (sym: string, name: string) => {
        const s = sym.toLowerCase();
        if (s === q) return 4;
        if (s.startsWith(q)) return 3;
        if (name.toLowerCase().startsWith(q)) return 2;
        if (s.includes(q)) return 1;
        return 0;
      };
      return merged
        .map((r, i) => ({ r, key: rank(r.symbol, r.name) * 1000 - i }))
        .sort((a, b) => b.key - a.key)
        .map((x) => x.r)
        .slice(0, 80);
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
          exchange: undefined as string | undefined,
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
          exchange: undefined as string | undefined,
        }));
    }
    return [];
  }, [tab, query, crypto, metals, stocks, stockSearch]);

  const addedSymbols = useMemo(
    () => new Set(holdings.map((h) => `${h.category}:${h.symbol}`)),
    [holdings],
  );

  // ---- autocomplete: highlight + on-demand price fill -----------------------

  // Fetch one symbol's live price (when an option is highlighted/hovered/added)
  // and patch it into the price map and any holding still awaiting a price.
  const ensurePrice = (symbol: string) => {
    if (!apiKey || !symbol) return;
    const have = stocks[symbol]?.price;
    if ((have != null && have > 0) || priceReqRef.current.has(symbol)) return;
    priceReqRef.current.add(symbol);
    void fetchStockQuotes([symbol], apiKey).then((res) => {
      const quote = res.data[symbol];
      if (!quote) return;
      setStocks((prev) => ({ ...prev, ...res.data }));
      setHoldings((hs) =>
        hs.map((h) =>
          h.category === 'stock' && h.symbol === symbol && h.price == null
            ? { ...h, price: quote.price }
            : h,
        ),
      );
    });
  };

  const addAsset = (r: {
    symbol: string;
    name: string;
    category: AssetCategory;
    assetClass: AssetKey;
    price: number | null;
  }) => {
    addHolding({
      symbol: r.symbol,
      name: r.name,
      category: r.category,
      assetClass: r.assetClass,
      price: r.price,
    });
    if (r.category === 'stock' && r.price == null) ensurePrice(r.symbol);
  };

  // Keep the highlighted option in view and price-fill it on the fly.
  useEffect(() => {
    if (!results.length) return;
    const idx = Math.min(activeIndex, results.length - 1);
    const item = results[idx];
    if (item && item.category === 'stock' && item.price == null) ensurePrice(item.symbol);
    resultsRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, results]);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[Math.min(activeIndex, results.length - 1)];
      if (r && !addedSymbols.has(`${r.category}:${r.symbol}`)) addAsset(r);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveIndex(0);
    }
  };

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
                    onClick={() => {
                      setTab(t);
                      setQuery('');
                      setActiveIndex(0);
                    }}
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
                    role="combobox"
                    aria-expanded={results.length > 0}
                    aria-controls="cpb-results-list"
                    aria-activedescendant={
                      results[activeIndex] ? `cpb-opt-${activeIndex}` : undefined
                    }
                    aria-autocomplete="list"
                    placeholder={`Search ${TAB_META[tab].label.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={onSearchKeyDown}
                  />
                </div>
                <div className="cpb-results" id="cpb-results-list" role="listbox" ref={resultsRef}>
                  {results.length === 0 && (
                    <p className="cpb-empty">
                      {searching
                        ? 'Searching all listed tickers…'
                        : loading
                          ? 'Loading live prices…'
                          : 'No matches — try another search.'}
                    </p>
                  )}
                  {results.map((r, i) => {
                    const added = addedSymbols.has(`${r.category}:${r.symbol}`);
                    const active = i === activeIndex;
                    return (
                      <button
                        key={`${r.category}:${r.symbol}`}
                        id={`cpb-opt-${i}`}
                        role="option"
                        aria-selected={active}
                        data-idx={i}
                        className={`cpb-asset${added ? ' added' : ''}${active ? ' active' : ''}`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => addAsset(r)}
                        disabled={added}
                      >
                        {r.image ? (
                          <img className="cpb-logo" src={r.image} alt="" />
                        ) : (
                          <span className="cpb-ticker">{r.symbol.slice(0, 4)}</span>
                        )}
                        <span className="cpb-asset-name">
                          <strong>
                            {r.symbol}
                            {r.exchange && <span className="cpb-exchange">{r.exchange}</span>}
                          </strong>
                          <em>{r.name}</em>
                        </span>
                        <span className="cpb-asset-price">
                          {r.price != null ? fmtMoney(r.price) : '—'}
                        </span>
                        {added ? <span className="cpb-added">Added</span> : <Plus size={16} />}
                      </button>
                    );
                  })}
                  {searching && results.length > 0 && (
                    <p className="cpb-searching">Searching all listed tickers…</p>
                  )}
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
