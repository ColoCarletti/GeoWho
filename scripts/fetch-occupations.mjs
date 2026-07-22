// Add each person's real Wikidata occupations (P106) so the category/occupation
// clues reflect what they're actually known for — not which fetch-bucket they
// happened to land in. Reads/writes src/data/people-raw.json.

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
  const query = `SELECT ?person (GROUP_CONCAT(DISTINCT ?ol; separator="|") AS ?occs) WHERE {
    VALUES ?person { ${chunk.map((q) => "wd:" + q).join(" ")} }
    ?person wdt:P106 ?occ . ?occ rdfs:label ?ol . FILTER(LANG(?ol) = "en")
  } GROUP BY ?person`;
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

const occById = new Map();
const SIZE = 150;
for (let i = 0; i < ids.length; i += SIZE) {
  const rows = await fetchChunk(ids.slice(i, i + SIZE));
  for (const r of rows) {
    occById.set(r.person.value.split("/").pop(), (r.occs?.value || "").split("|").filter(Boolean));
  }
  console.log(`  chunk ${i / SIZE + 1}/${Math.ceil(ids.length / SIZE)} — ${rows.length} rows`);
  await sleep(300);
}

let filled = 0;
for (const p of raw) {
  const occ = occById.get(p.id);
  if (occ && occ.length) {
    p.p106 = occ;
    filled++;
  } else {
    p.p106 = [];
  }
}

writeFileSync(join(root, "src/data/people-raw.json"), JSON.stringify(raw));
console.log(`\nAdded real occupations to ${filled}/${raw.length} people.`);
