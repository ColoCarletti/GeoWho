// Supplemental fetch: adds occupations the main run missed (politician timed
// out at a low fame threshold; naturalist/statesperson weren't in the list).
// Merges into the existing src/data/people-raw.json rather than refetching.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "geo_game-dev/0.1 (joaquin.carletti@lambdaclass.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [qid, label, domain, fameThresholds]. Big sets need a higher threshold to
// finish; try the most-inclusive first and back off on timeout.
const EXTRA = [
  ["Q82955", "politician", "Power & Society", [45, 60, 80, 95]],
  ["Q372436", "statesperson", "Power & Society", [28, 45]],
  ["Q18805", "naturalist", "Science", [28]],
];

async function query(qid, minFame, limit) {
  const q = `SELECT ?person ?personLabel ?sl ?dob ?dod ?bc ?dc ?genderLabel ?countryLabel WHERE {
    ?person wdt:P106 wd:${qid} ; wdt:P569 ?dob ; wdt:P570 ?dod ; wdt:P19 ?bp ; wdt:P20 ?dp ; wikibase:sitelinks ?sl .
    ?bp wdt:P625 ?bc . ?dp wdt:P625 ?dc .
    OPTIONAL { ?person wdt:P21 ?gender . }
    OPTIONAL { ?bp wdt:P17 ?country . }
    FILTER(?sl >= ${minFame})
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
  } ORDER BY DESC(?sl) LIMIT ${limit}`;
  const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).results.bindings;
}

const raw = JSON.parse(readFileSync(join(root, "src/data/people-raw.json"), "utf8"));
const byId = new Map(raw.map((p) => [p.id, p]));
const before = byId.size;

for (const [qid, label, domain, thresholds] of EXTRA) {
  process.stdout.write(`  ${label.padEnd(14)} `);
  let rows = null;
  for (const t of thresholds) {
    try {
      rows = await query(qid, t, 90);
      process.stdout.write(`(fame>=${t}) `);
      break;
    } catch (err) {
      process.stdout.write(`[${t}:${err.message}] `);
      await sleep(1500);
    }
  }
  if (!rows) {
    console.log("FAILED all thresholds");
    continue;
  }
  let added = 0;
  for (const r of rows) {
    const id = r.person.value.split("/").pop();
    let p = byId.get(id);
    if (!p) {
      p = {
        id,
        name: r.personLabel.value,
        fame: parseInt(r.sl.value, 10),
        dob: r.dob.value,
        dod: r.dod.value,
        bc: r.bc.value,
        dc: r.dc.value,
        gender: r.genderLabel?.value || "",
        country: r.countryLabel?.value || "",
        occupations: [],
        domains: {},
      };
      byId.set(id, p);
      added++;
    }
    if (!p.occupations.includes(label)) p.occupations.push(label);
    p.domains[domain] = (p.domains[domain] || 0) + 1;
  }
  console.log(`${rows.length} rows (+${added} new) · pool=${byId.size}`);
  await sleep(400);
}

writeFileSync(join(root, "src/data/people-raw.json"), JSON.stringify([...byId.values()]));
console.log(`\nPool ${before} → ${byId.size}`);
