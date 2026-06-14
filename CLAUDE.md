# CLAUDE.md — Nelli

Guidance for Claude Code working in this repo.

## What this is
**Nelli: Financial Vision Casting** — a single-page React/TypeScript/Vite investment-discovery tool. Quiz → investor archetype → suggested allocation → live-priced custom portfolio builder → 30-year projection (with an insurance ⇄ SBLOC leverage lever) → shareable, client-named summary card. Brand is a celestial horse nebula; light mode is clean (celestial-blue accent), **Celestial dark** makes the image come alive.

Read **`NELLI-OVERVIEW.md`** for full architecture/features and **`ROADMAP.md`** for the running done/todo punchlist. Keep ROADMAP.md updated as work ships.

## Commands
```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # tsc -b && vite build  — ALWAYS run before declaring done
npm run lint
npm run preview
```

## Architecture (quick map)
- `src/App.tsx` — phase state machine (`intro → quiz → results → projection`), theme, progress persistence, custom-portfolio state.
- `src/data/questions.tsx` — quiz questions + `visibleQuestions` conditional logic.
- `src/data/assetUniverse.ts` — curated stock/ETF list (live search covers everything else).
- `src/logic/` — `scoring.ts` (archetypes), `allocation.ts` (7 asset classes, ASSET_META, BREAKDOWNS), `projections.ts` (growth + SBLOC math), `customPortfolio.ts` (holdings model, roll-up, `whereToBuy`), `prices.ts` (live prices), `exportSummary.ts` (text export).
- `src/components/` — `IntroScreen`, `QuestionScreen`, `ResultsScreen`, `ProjectionScreen`, `CustomPortfolioBuilder`, `SummaryModal` (hand-drawn Canvas card), `StarfieldBackground`, `ProgressPath`.

## Live prices (`logic/prices.ts`)
- Crypto: CoinGecko (no key). Metals: gold-api.com (no key).
- Stocks/ETFs + ticker search: **Financial Modeling Prep — needs a free API key**, entered in the builder's Stocks tab, stored as `localStorage['nelli-fmp-key']`. `searchStocks()` resolves any listed ticker.

## Conventions / gotchas
- All `localStorage` keys are `nelli-*`. Never hardcode the FMP key in source (repo is public).
- **Idle auto-reset is kiosk-only.** The 20-min "still there?" warning + wipe arms only with `?kiosk` in the URL (`KIOSK` in `App.tsx`); public sessions persist and are never interrupted. `startOver()` clears `nelli-progress-v1` AND `nelli-custom-portfolio`.
- Brand strings live in: `App.tsx`, `IntroScreen.tsx`, `index.html`, `SummaryModal.tsx`, `exportSummary.ts`, `package.json`.
- Summary card is a fixed-width (900px) canvas with **dynamic height** — update `draw()` AND `computeHeight()` together when changing card content.
- Accent: light = celestial blue `#2f6fb0`; dark = gold `#d9a441`. Archetype/donut colors are categorical (leave them).
- Keep this repo on a plain local path (not OneDrive) — cloud sync caused stale/truncated reads.

## Open threads (pick up here)

**▶ Paused 2026-06-13 evening — start here next session.** Everything builds/lints green and is committed, pushed (`main`), and redeployed to the droplet. The site is **live over HTTP** at the droplet copy (`http://nelli.ssopros.com`); the **free-HTTPS GitHub Pages cutover is parked on one Google Cloud DNS change** (see the Hosting thread). Likely next moves: (a) do the DNS swap to finish HTTPS for free, or keep on the droplet and license Plesk; (b) optional per-instance star nudges if the header/intro want tuning. Note: the Plesk trial license is dead, so the other two sites (`ssopros.com`, `dealtracker`) will eventually need a license for cert renewal.

- [x] Build confirmed green — `tsc -b && vite build` passes clean (only the known >500 kB bundle-size warning). Last verified 2026-06-14.
- [x] **Logo: Playfair Display wordmark + radial star dotting the i** (header, intro hero, summary card; blue star on light / gold on Celestial-dark). Reusable `components/Wordmark.tsx` + a shared `#nelliStar` radial gradient rendered once via `<NelliStarDefs/>` in `App.tsx` (re-tints with `--star-mid`/`--star-edge`/`--star-glow`). Canvas card draws it via `drawWordmark`/`drawSparkle` in `SummaryModal.tsx`, gated on `document.fonts.load`. Playfair loaded via Google Fonts in `index.html`. Placement: `.nelli-star { bottom:.76em; width:.36em }` and `line-height:1` on `.nelli-wm` (the line-height is what aligns the star to the i).
- [ ] Paste the free FMP key into the app's Stocks tab to enable live stock prices/search.
- [x] **Ticker coverage — live autocomplete shipped.** FMP `/search` hits are ranked (exact-ticker → prefix, with a major-US-exchange boost) and de-duped across exchanges (foreign/ADR twins folded to the US listing) in `searchStocks()`. The picker is now a proper combobox: keyboard nav (↑/↓/Enter/Esc) with a highlighted option, an exchange badge on live hits, and **price-fill on highlight** — one quote per highlighted/added symbol instead of bulk-fetching every hit, far lighter on FMP's free tier. See `CustomPortfolioBuilder.tsx` (`stockSearch` effect, `results` memo, `ensurePrice`/`onSearchKeyDown`) and `searchStocks()` in `prices.ts`. _Live stock search still needs the FMP key pasted in the Stocks tab to exercise end-to-end._
- [x] **GitHub repo renamed** `pathfinder` → `nelli` — remote is now `git@github.com:gfreesie/nelli.git` (old URL auto-redirects). Local folder also renamed to `…\dev\nelli`.
- [~] **Hosting → GitHub Pages** (free auto-HTTPS). The Plesk droplet route was abandoned because its bundled trial license expired ("allows 0 sites") and Plesk gates cert installation, so HTTPS was impossible there. Now: `.github/workflows/deploy.yml` builds + deploys to Pages on every push to `main`; `public/CNAME` = `nelli.ssopros.com`; no Vite `base` change (custom domain at root). **Awaiting the one manual step:** in **Google Cloud DNS** (zone `ssopros.com`, NS `ns-cloud-*.googledomains.com`), replace the `nelli` A record (→ `64.225.114.22`) with `CNAME → gfreesie.github.io.`. Once DNS resolves to GitHub, the cert auto-issues; then set `cname` + `https_enforced=true` via `gh api`. The old droplet/Plesk subdomain (`site2`, HTTP) stays orphaned until DNS cuts over — clean up later.
- [ ] Accessibility pass (see ROADMAP).
