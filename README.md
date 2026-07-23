# 🗺️ GeoWho

A **daily "guess the historical figure" game**. A spinnable **globe** marks where
a famous person was **born** (★) and where they **died** (✝), with their **exact**
birth and death dates. Drag to rotate, scroll/buttons to zoom, then name who it is.

**Three figures a day**, with a scoring ladder per figure:

| When you get it | Points |
|---|---|
| First try, from the map + dates alone | **100** |
| After one free hint | **50** |
| From four multiple-choice options (after a second hint) | **10** |
| Not at all | **0** |

Each wrong guess automatically reveals the next hint (category → occupation →
country). After the third figure you get your **total score out of 300**, a
**shareable** spoiler-free result, and a countdown to the next day's three.
Progress is saved, so the day resumes where you left off.

There's also a **Practice** mode: unlimited random figures with the same
scoring ladder and a running session tally — no daily limit.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Other commands

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run verify     # data/logic tests + full render smoke test
npm run data       # rebuild the dataset from Wikidata (see below)
```

## How it works

- The day's **three figures** are chosen deterministically from the date, so
  everyone gets the same puzzle; no repeats within a day.
- Guess with an **autocomplete** name box (ranked most-famous-first); the final
  stage offers four multiple-choice options — same category, closest era.
- The dataset is trimmed to the **top 200 most famous** figures (household
  names), with real birth/death coordinates and dates. `TOP_N` in
  `scripts/prep-people.mjs` controls the size.

## Code layout

- `src/lib/game.ts` — the game rules: daily selection, random pick (practice),
  the pure scoring reducer (`applyGuess`/`applyPick`), option builder, share
  text, date helpers, constants.
- `src/lib/people.ts` — dataset access, search, clues.
- `src/lib/storage.ts` — daily progress persistence (`localStorage`).
- `src/App.tsx` — mode switcher (Daily / Practice).
- `src/components/` — `Daily` and `Practice` (the two mode orchestrators),
  `Round` (the per-figure stage machine), `WorldMap`, `GuessInput`, `Options`,
  `Clues`, `Summary`.

## The data (Wikidata)

A global "most famous humans" query times out, so the pipeline scopes by
occupation (small sets) and takes the top figures by fame within each:

| Script | Role |
|---|---|
| `scripts/fetch-people.mjs` | Top figures across ~35 occupations, with birth/death coords + dates. |
| `scripts/fetch-people-extra.mjs` | Big/late occupations needing a higher fame threshold (politician, statesperson, naturalist). |
| `scripts/fetch-people-must.mjs` | Guarantees curated iconic figures by QID. |
| `scripts/fetch-dates.mjs` | Adds each date's **precision** so exact dates are honest (no fake "1 January" for year-only records). |
| `scripts/fetch-occupations.mjs` | Adds real P106 occupations, used to categorize each figure (clue #1). |
| `scripts/prep-people.mjs` | Formats dates and emits `src/data/people.json` with each figure's raw lng/lat (`blng/blat/dlng/dlat`). |

`WorldMap.tsx` renders a realistic orthographic **globe** — filled continents,
country borders, and a graticule — with `d3-geo` + `topojson-client` over the
`world-atlas` land geometry (loaded at runtime). Drag rotates, wheel/buttons
zoom, and the globe auto-faces the midpoint of the two locations.

> Dates render at their true precision: day (`14 March 1879`), month, or year
> (`550 BC`). A few otherwise-iconic figures can't be included when Wikidata has
> no coordinates for their birth/death places (e.g. Frida Kahlo).

## Deploy

Fully static — `npm run build` and host `dist/` anywhere. This repo also
auto-deploys to GitHub Pages on every push to `main`
(`.github/workflows/deploy.yml`).
