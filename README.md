# Nelli — Financial Vision Casting

Nelli is an interactive, single-page investment-discovery tool. A short, plain-language questionnaire reads how someone actually thinks about money, casts them as one of five investor archetypes, builds a suggested asset allocation, and projects how that plan could grow over 30 years. From there it opens into a live-priced custom portfolio builder, an optional protection/leverage lever (cash-value life insurance blended with a securities-based line of credit), and a shareable, client-named summary card.

The brand is celestial: a nebula in the shape of a rearing horse. In light mode the identity stays clean and calm; flip to **Celestial dark** and the image comes alive — an animated starfield behind the app and the nebula glowing on the summary card.

## Run it

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # type-check (tsc -b) + production bundle
npm run preview  # serve the production build
```

`npm run dev` prints a `http://localhost:5173/` link — open it in a browser.

## What's inside

- A 13-question discovery quiz with conditional branches (insurance/SBLOC, safety-net savings).
- Five investor archetypes and a suggested allocation across seven asset classes.
- A custom portfolio builder with **live prices**: crypto (CoinGecko), metals (gold-api.com), and stocks/ETFs (Financial Modeling Prep — needs a free API key) plus live ticker search across all listed symbols.
- A 30-year growth projection with adjustable dials, plus an optional insurance ⇄ SBLOC blend that models leveraged growth.
- A summary card (PNG download, native share, copy-as-text) personalized with a client name and a full holdings breakdown with "where to buy" guidance.

See [`NELLI-OVERVIEW.md`](./NELLI-OVERVIEW.md) for the full architecture and feature tour, and [`ROADMAP.md`](./ROADMAP.md) for the running punchlist of what's done and what's next.

## A note on the projections

Everything Nelli shows is illustrative and educational — not licensed financial advice. Return assumptions, SBLOC rates, and acquisition venues are examples, not endorsements.
