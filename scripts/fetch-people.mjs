// Fetch a broad pool of famous historical figures from Wikidata.
//
// Strategy: a global "most famous humans" query times out, so we scope by
// occupation (a far smaller set) and take the top figures by fame (sitelinks =
// number of Wikipedia language editions) within each, then dedupe. This also
// gives a nice spread across domains for a "broad mix".
//
// Output: src/data/people-raw.json  (unprojected; prep-people.mjs finishes it)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "geo_game-dev/0.1 (joaquin.carletti@lambdaclass.com)";

// Only figures famous enough to be fair game (≥ this many Wikipedia languages).
const MIN_FAME = 28;
const PER_OCC = 70;

// occupation QID -> [label, domain]
const OCCUPATIONS = {
  Q169470: ["physicist", "Science"],
  Q170790: ["mathematician", "Science"],
  Q901: ["scientist", "Science"],
  Q11063: ["astronomer", "Science"],
  Q593644: ["chemist", "Science"],
  Q864503: ["biologist", "Science"],
  Q39631: ["physician", "Science"],
  Q188094: ["economist", "Science"],
  Q42973: ["architect", "Science"],
  Q36180: ["writer", "Arts & Letters"],
  Q49757: ["poet", "Arts & Letters"],
  Q214917: ["playwright", "Arts & Letters"],
  Q28389: ["screenwriter", "Arts & Letters"],
  Q1028181: ["painter", "Arts & Letters"],
  Q483501: ["artist", "Arts & Letters"],
  Q36834: ["composer", "Arts & Letters"],
  Q33999: ["actor", "Stage & Screen"],
  Q10800557: ["film actor", "Stage & Screen"],
  Q2526255: ["film director", "Stage & Screen"],
  Q3455803: ["director", "Stage & Screen"],
  Q177220: ["singer", "Stage & Screen"],
  Q639669: ["musician", "Stage & Screen"],
  Q245068: ["comedian", "Stage & Screen"],
  Q4610556: ["model", "Stage & Screen"],
  Q82955: ["politician", "Power & Society"],
  Q116: ["monarch", "Power & Society"],
  Q189290: ["military officer", "Power & Society"],
  Q40348: ["lawyer", "Power & Society"],
  Q806798: ["banker", "Power & Society"],
  Q1930187: ["journalist", "Power & Society"],
  Q1234713: ["theologian", "Power & Society"],
  Q4964182: ["philosopher", "Power & Society"],
  Q11900058: ["explorer", "Exploration & Sport"],
  Q2066131: ["athlete", "Exploration & Sport"],
  Q10833314: ["tennis player", "Exploration & Sport"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runQuery(occQid) {
  const query = `SELECT ?person ?personLabel ?sl ?dob ?dod ?bc ?dc ?genderLabel ?countryLabel WHERE {
    ?person wdt:P106 wd:${occQid} ; wdt:P569 ?dob ; wdt:P570 ?dod ; wdt:P19 ?bp ; wdt:P20 ?dp ; wikibase:sitelinks ?sl .
    ?bp wdt:P625 ?bc . ?dp wdt:P625 ?dc .
    OPTIONAL { ?person wdt:P21 ?gender . }
    OPTIONAL { ?bp wdt:P17 ?country . }
    FILTER(?sl >= ${MIN_FAME})
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
  } ORDER BY DESC(?sl) LIMIT ${PER_OCC}`;

  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.results.bindings;
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(1500 * attempt);
    }
  }
}

const byId = new Map();

for (const [qid, [label, domain]] of Object.entries(OCCUPATIONS)) {
  process.stdout.write(`  ${label.padEnd(16)} `);
  try {
    const rows = await runQuery(qid);
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
    console.log(`${rows.length} rows (+${added} new)  · pool=${byId.size}`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
  await sleep(400); // be polite to the endpoint
}

const people = [...byId.values()];
writeFileSync(join(root, "src/data/people-raw.json"), JSON.stringify(people));
console.log(`\nWrote ${people.length} people to src/data/people-raw.json`);
