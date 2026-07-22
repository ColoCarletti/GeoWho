// Add date precision to each person so we can show *exact* birth/death dates
// (day/month/year) without inventing a fake "January 1" for year-only records.
// Reads/writes src/data/people-raw.json. No re-fetch of the whole pool.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "geo_game-dev/0.1 (joaquin.carletti@lambdaclass.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const raw = JSON.parse(readFileSync(join(root, "src/data/people-raw.json"), "utf8"));
const ids = raw.map((p) => p.id);

async function fetchChunk(chunk, attempt = 1) {
  // Precision must come from the SAME value node as the truthy (wdt:) date,
  // otherwise a year-only value ("1 January") can inherit a day-precise
  // sibling statement's precision and render a fake exact date.
  const query = `SELECT ?person ?dobP ?dodP WHERE {
    VALUES ?person { ${chunk.map((q) => "wd:" + q).join(" ")} }
    OPTIONAL {
      ?person wdt:P569 ?dob .
      ?person p:P569/psv:P569 ?bv . ?bv wikibase:timeValue ?dob ; wikibase:timePrecision ?dobP .
    }
    OPTIONAL {
      ?person wdt:P570 ?dod .
      ?person p:P570/psv:P570 ?dv . ?dv wikibase:timeValue ?dod ; wikibase:timePrecision ?dodP .
    }
  }`;
  try {
    const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).results.bindings;
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(1500 * attempt);
    return fetchChunk(chunk, attempt + 1);
  }
}

const prec = new Map(); // id -> { dobP, dodP }
const SIZE = 150;
for (let i = 0; i < ids.length; i += SIZE) {
  const chunk = ids.slice(i, i + SIZE);
  const rows = await fetchChunk(chunk);
  for (const r of rows) {
    const id = r.person.value.split("/").pop();
    prec.set(id, {
      dobP: r.dobP ? parseInt(r.dobP.value, 10) : 9,
      dodP: r.dodP ? parseInt(r.dodP.value, 10) : 9,
    });
  }
  console.log(`  chunk ${i / SIZE + 1}/${Math.ceil(ids.length / SIZE)} — ${rows.length} rows`);
  await sleep(300);
}

let filled = 0;
for (const p of raw) {
  const pr = prec.get(p.id);
  p.dobP = pr?.dobP ?? 9;
  p.dodP = pr?.dodP ?? 9;
  if (pr) filled++;
}

writeFileSync(join(root, "src/data/people-raw.json"), JSON.stringify(raw));
console.log(`\nAdded precision to ${filled}/${raw.length} people.`);
