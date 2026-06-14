# Nelli — Roadmap & Punchlist

A running log of what's been built and what's still on the wish list. Newest work at the top of "Done." Check things off in "Planned" as they ship.

---

## ✅ Done

### Branding — Nelli: Financial Vision Casting
- [x] Renamed the whole project from Pathfinder → **Nelli** (app header, intro, page title, summary card, export text, `package.json`, all `localStorage` keys → `nelli-*`).
- [x] Celestial horse nebula identity (`public/celestial-horse.jpg`).
- [x] Logo system used tastefully everywhere:
  - [x] **Orb lockup** in the header (small glowing horse + wordmark).
  - [x] **Nebula panel** hero on the intro screen.
  - [x] **Celestial emblem / full nebula** on the dark summary card header.
- [x] Light mode = clean & calm; **Celestial dark** = the image comes alive (glow + animation + starfield).
- [x] Renamed summary card theme "Telos dark" → **Celestial dark**.
- [x] 3-direction logo chooser (`logo-options.html`) for reference.

### Custom portfolio
- [x] Full custom portfolio builder: Stocks / Crypto / Metals / Custom tabs, % ⇄ $ toggle, running total, leftover-to-cash, inline projected value.
- [x] Live prices: crypto (CoinGecko), metals (gold-api.com), stocks (Financial Modeling Prep, free key).
- [x] **Live ticker search** across all listed symbols (not just the curated list); added GLW, COHR + optics/semis names.
- [x] Per-asset-class **drill-down** shows the actual selected holdings.
- [x] **Ring (donut) hover** shows the custom holdings for that class — and renders above the centered figure so it's readable in both themes.
- [x] Custom holdings roll up into the seven projection classes (donut + projection stay consistent).

### Protection / leverage lever
- [x] Insurance question reframed as a blend lever.
- [x] **Insurance ⇄ SBLOC blend slider** (stable cash-value insurance vs aggressive securities-based line of credit).
- [x] SBLOC advance-rate % slider, interest % dial, and **Active leverage / Liquidity only** toggle on the projection.
- [x] Borrowing-power band on the chart, SBLOC line in the stat cards, margin-call risk caveats.

### Summary card
- [x] **Client name** → "Prepared for [Name]".
- [x] **Holdings breakdown** on the card, grouped by class, with **named "where to buy"** guidance + disclaimer (dynamic canvas height).
- [x] PNG download, native **Share**, copy-as-text — all reflect the name + breakdown.

### Experience & polish
- [x] Animated dark-mode **starfield** background (twinkle, drift, shooting stars; respects reduced-motion).
- [x] **Progress persistence** — refresh resumes; "Start over" reset.
- [x] **Mobile/responsive** polish (summary card scales, projection grid/dials, etc.).
- [x] Smoother transitions + input micro-interactions (animated progress path, card press feedback).

### Project / infra
- [x] Moved off OneDrive to a plain local path; pushed to GitHub.
- [x] Docs: `README.md`, `NELLI-OVERVIEW.md`, this roadmap.

---

## 🔭 Planned / wish list

_Add to this freely — it's the working list._

- [ ] **Accessibility pass** (the one punchlist item we skipped): honor `prefers-reduced-motion` everywhere, full focus rings, ARIA labels on all inputs, keyboard nav through cards/sliders.
- [ ] **Margin-call stress line** on the SBLOC projection (show the drawdown that would trigger a call at the chosen advance rate).
- [ ] **Save / name multiple custom portfolios** and compare them side by side.
- [ ] **Live tickers for bonds & REITs** in the builder (currently stocks/crypto/metals only).
- [ ] **Rank/clean up live search results** (prioritize major exchanges, de-dupe ADR/foreign suffixes).
- [ ] **Custom vector logo mark** option (a clean line-art horse) as an alternative to the photo orb in light mode.
- [ ] **Deploy live** (GitHub Pages or similar) for a shareable public URL.
- [ ] **PDF export** of the full client summary (beyond the PNG card).
- [ ] **No-key fallback** for stock names via the SEC `company_tickers.json` (prices still need a key).
- [ ] Code-split the bundle (it's >500kB; lazy-load the builder / charts).

---

## 🐞 Known notes
- Live **stock** prices/search require a free Financial Modeling Prep API key entered in the builder's Stocks tab. Crypto and metals work with no key.
- Projections, SBLOC rates, and acquisition venues are illustrative examples, not advice or endorsements.
