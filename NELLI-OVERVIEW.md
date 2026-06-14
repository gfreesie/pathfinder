# Nelli — Project Overview

A reference for picking the project back up. Covers what Nelli is, the vibe, the architecture, and how each feature is wired so future improvements are easy to slot in.

---

## What Nelli is

**Nelli: Financial Vision Casting** is a client-facing investment-discovery experience. It walks someone through a short, human questionnaire, casts them as an investor archetype, builds a suggested allocation in real dollars, lets them construct a fully custom live-priced portfolio, projects 30 years of growth (with an optional leverage lever), and produces a shareable, named summary card.

It is an **educational / discussion tool**, not licensed advice. Every number is an illustrative assumption.

## The vibe

- **Celestial, aspirational, premium.** The identity is a nebula shaped like a rearing horse ("casting" a vision in the stars).
- **Two faces, one brand.** Light mode is clean, calm, and trustworthy (teal/gold on warm off-white). **Celestial dark** is where it comes alive: an animated starfield drifts behind the whole app, the logo glows, and the nebula fills the summary card header.
- **Calm confidence, no jargon.** Copy is plain-language and reassuring ("No jargon, no judgment").
- **Color system:** teal `#2F8F7B` (accent / light), gold `#D9A441` (accent / dark + highlights), deep navy `#070b16` (dark background), warm off-white `#faf8f4` (light background).

## Tech stack

- **React 19 + TypeScript + Vite** (rolldown-vite). Single-page app, no router — phases are state.
- **framer-motion** for transitions and micro-interactions.
- **recharts** for the donut (allocation) and the growth projection chart.
- **lucide-react** for icons.
- Canvas 2D for the exportable summary card (drawn by hand, not DOM).
- No backend. All state is local; live prices are fetched client-side from public APIs.

## App flow (phases)

`App.tsx` holds a `phase` state machine: `intro → quiz → results → projection`. Progress (answers, position, blend, custom portfolio) is persisted to `localStorage` under `nelli-progress-v1`, so a refresh resumes. Theme is `nelli-theme`.

1. **Intro** (`IntroScreen.tsx`) — the nebula hero + "Nelli / Financial Vision Casting" + Begin.
2. **Quiz** (`QuestionScreen.tsx`, data in `data/questions.tsx`) — 13 questions; sliders, single-select cards, multi-select. Some questions are conditional (see `visibleQuestions`).
3. **Results** (`ResultsScreen.tsx`) — archetype reveal, donut + per-class allocation drill-down, blend chips, the **Build custom** entry, and insurance/SBLOC cards.
4. **Projection** (`ProjectionScreen.tsx`) — 30-year growth chart with live dials, the insurance ⇄ SBLOC lever, and **Create summary**.

## Core logic (`src/logic/`)

- **`scoring.ts`** — `riskScore(answers)` → one of five archetypes (`guardian`, `builder`, `navigator`, `trailblazer`, `maverick`), each with profile copy and alternative blends.
- **`allocation.ts`** — `computeAllocation()` turns answers + archetype into seven asset-class lines (`usStocks`, `intlStocks`, `metals`, `crypto`, `landReit`, `bonds`, `cash`), honoring the crypto comfort ceiling, tangibility tilt, and safety-net cash floor. Also holds `ASSET_META` (labels/colors) and `BREAKDOWNS` (the generic "what's inside each class" content).
- **`projections.ts`** — return assumptions per class, `project()` (compounds capital + contributions, with optional insurance cash value and a `returnOverride` hook), and the SBLOC helpers (`leveragedReturns`, `blendSblocReturns`, constants).
- **`customPortfolio.ts`** — the `CustomHolding` model, roll-up of holdings into the seven classes, persistence (`nelli-custom-portfolio`), and `whereToBuy()` acquisition guidance per asset class (+ `ACQUISITION_DISCLAIMER`).
- **`prices.ts`** — the live-price layer (see below).
- **`exportSummary.ts`** — builds the plain-text summary (used by "Copy as text").

## Live prices (`logic/prices.ts`)

All fetched client-side, cached in `localStorage` with short TTLs:

- **Crypto** — CoinGecko `/coins/markets`, top 250, no key.
- **Metals** — gold-api.com per symbol (XAU, XAG, XPT, XPD, HG copper), no key.
- **Stocks/ETFs** — Financial Modeling Prep batch `/quote` + `/search`. **Requires a free FMP API key**, entered in the builder's Stocks tab and stored under `nelli-fmp-key`. `searchStocks()` enables adding *any* listed ticker, not just the curated `data/assetUniverse.ts` list.

## Custom portfolio builder (`components/CustomPortfolioBuilder.tsx`)

Tabs for Stocks/Crypto/Metals/Custom. Search (curated + live FMP), add holdings, set each as **% or $** (synced to capital), running total with leftover-to-cash, an inline projected-value readout, and a manual "custom asset" path for private/off-market holdings. On apply, holdings roll up into the seven classes (so the donut + projection keep working) and are threaded through `App` to the results drill-down, ring tooltip, and summary.

## The protection / leverage lever (insurance ⇄ SBLOC)

If the user opts into the insurance question, a **blend slider** splits the lever between stable cash-value life insurance and an aggressive **securities-based line of credit (SBLOC)**. On the projection screen: dials for the split %, SBLOC advance rate %, and interest %, plus a toggle between **Active leverage** (reinvests borrowed funds, amplifying growth net of interest — `g = [(1+r) − m(1+i)]/(1−m)`) and **Liquidity only** (shows borrowing power without changing the curve). Carries margin-call risk caveats throughout.

## The summary card (`components/SummaryModal.tsx`)

A hand-drawn Canvas 2D card with two themes: **Light card** and **Celestial dark** (nebula fills the header, gold "Nelli"). Features:

- Optional **client name** → "Prepared for [Name]".
- The donut, allocation, monthly/insurance/SBLOC box, 30-year projection.
- A **holdings breakdown** grouped by class with per-class "where to buy" guidance (canvas height grows to fit).
- Export as **PNG**, native **Share**, or **Copy as text**.

## Branding assets

- `public/celestial-horse.jpg` — the nebula. Used as: header orb (`.brand-mark`), intro hero panel (`.nelli-hero`), favicon, and the dark summary-card header (drawn to canvas via `drawCover`).
- `logo-options.html` (project root) — the 3-direction logo chooser, kept for reference.

## Conventions / gotchas

- Brand strings live in: `App.tsx` (header), `IntroScreen.tsx`, `index.html` (title), `SummaryModal.tsx` (canvas), `exportSummary.ts`, `package.json`.
- `localStorage` keys are all `nelli-*`.
- The summary card is a fixed-width (900px) canvas with **dynamic height** (`computeHeight`) — if you add sections to the card, update both `draw()` and `computeHeight()` together.
- Building inside a cloud-synced folder (OneDrive) caused stale/truncated reads during development; keep the working copy on a plain local path.
