# 🗺️ GeoWho

A **minimalist "guess the historical figure" game**. A giant world map marks
where a famous person was **born** (★) and where they **died** (✝), with their
**exact** birth and death dates. Type a name to guess who it is. That's it —
no hints, no points, no menus.

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

- A **random figure** is shown each round; "New figure" gives another, "Reveal
  answer" ends the round.
- Guess with an **autocomplete** name box (ranked most-famous-first).
- **1,291 figures** across every domain and era, with real birth/death
  coordinates and dates.

## The data (Wikidata)

A global "most famous humans" query times out, so the pipeline scopes by
occupation (small sets) and takes the top figures by fame within each:

| Script | Role |
|---|---|
| `scripts/fetch-people.mjs` | Top figures across ~35 occupations, with birth/death coords + dates. |
| `scripts/fetch-people-extra.mjs` | Big/late occupations needing a higher fame threshold (politician, statesperson, naturalist). |
| `scripts/fetch-people-must.mjs` | Guarantees curated iconic figures by QID. |
| `scripts/fetch-dates.mjs` | Adds each date's **precision** so exact dates are honest (no fake "1 January" for year-only records). |
| `scripts/prep-people.mjs` | Formats dates to their precision, **projects** each point onto the map with d3-geo, emits `src/data/people.json` + `src/data/world.json`. |

Points are pre-projected to pixel coordinates in the map's viewBox, so the
runtime ships no projection library — it just plots x/y on the map path.

> Dates render at their true precision: day (`14 March 1879`), month, or year
> (`550 BC`). A few otherwise-iconic figures can't be included when Wikidata has
> no coordinates for their birth/death places (e.g. Frida Kahlo).

## Code layout

- `src/lib/people.ts` — data access, random pick, name search.
- `src/components/WorldMap.tsx` — the giant map with the two pins.
- `src/components/GuessInput.tsx` — the autocomplete name box.
- `src/App.tsx` — ties it together. React + Vite + TypeScript + Tailwind.

## Deploy

Fully static — `npm run build` and host `dist/` anywhere.
