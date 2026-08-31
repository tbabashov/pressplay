# Press Play Rankings — web

Next.js 15 (App Router, JavaScript). Runs on **port 3100** — port 3000 is taken by
another project on this machine.

```bash
npm install
npm run dev     # http://localhost:3100
npm run build && npm run start
```

## What exists

- `app/page.jsx` — the landing page.
- `app/globals.css` — design tokens (see `../DESIGN.md`). Browser surfaces (selection,
  caret, focus ring, scrollbar) are themed here, not left to the browser.
- `components/Hero.jsx` — client component. Extracts the dominant colour from the hero
  cover and lights the page with it; chroma and lightness are floored so a monochrome
  sleeve can't produce a grey call-to-action.
- `lib/rating-colors.js` — **copied from `../src/colors.js`.** The 0–11 ladder must stay
  identical between the app, the exporter and this page. Change one, change both.
- `lib/catalog.json`, `lib/stats.json` — generated from `../data/db.json`. Real numbers
  only; nothing on this page is invented.
- `public/covers/` (165 @ 420px), `public/covers-lg/` (5 @ 1000px), `public/slides/`
  (5 real exported frames).

## Not built yet

Auth, database, the rating app itself. This is the marketing surface only.
