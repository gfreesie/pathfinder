# Pathfinder — Investment Discovery

Gamified investment consultation quiz. 13 questions → investor profile → dollar-level
allocation → interactive 30-year growth projection with live sliders → exportable summary.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build / lint

```bash
npm run build    # type-check + production build
npm run lint
```

## Notes

- The "Export summary" button (projection screen) copies everything to the clipboard — paste it into Phase 2 of CONSULTATION-PROMPTS.md to generate the client PDF.
- Crypto allocation is hard-capped by the client's stated comfort ceiling.
- Insurance premium is funded from the monthly contribution; starting capital stays fully invested.
- Educational tool for discussion purposes. Not licensed financial advice.
