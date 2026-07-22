// Guarantee a set of iconic figures are present regardless of how their
// occupations happen to be modelled / ranked on Wikidata. Fetched directly by
// QID (a tiny VALUES set, so it's fast and reliable) and merged into the pool.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "geo_game-dev/0.1 (joaquin.carletti@lambdaclass.com)";

// occupation QID -> domain (subset of the main run's map, for classifying)
const OCC_DOMAIN = {
  Q169470: "Science", Q170790: "Science", Q901: "Science", Q11063: "Science",
  Q593644: "Science", Q864503: "Science", Q39631: "Science", Q188094: "Science",
  Q42973: "Science", Q18805: "Science", Q205375: "Science",
  Q36180: "Arts & Letters", Q49757: "Arts & Letters", Q214917: "Arts & Letters",
  Q28389: "Arts & Letters", Q1028181: "Arts & Letters", Q483501: "Arts & Letters",
  Q36834: "Arts & Letters",
  Q33999: "Stage & Screen", Q10800557: "Stage & Screen", Q2526255: "Stage & Screen",
  Q3455803: "Stage & Screen", Q177220: "Stage & Screen", Q639669: "Stage & Screen",
  Q245068: "Stage & Screen", Q4610556: "Stage & Screen", Q2865819: "Stage & Screen",
  Q82955: "Power & Society", Q116: "Power & Society", Q189290: "Power & Society",
  Q40348: "Power & Society", Q806798: "Power & Society", Q1930187: "Power & Society",
  Q1234713: "Power & Society", Q4964182: "Power & Society", Q372436: "Power & Society",
  Q11900058: "Exploration & Sport", Q2066131: "Exploration & Sport", Q10833314: "Exploration & Sport",
};

// Iconic figures to guarantee. (Living people have no death date and are simply
// skipped downstream.)
// Note: a few otherwise-iconic figures can't be included — e.g. Frida Kahlo
// (Q5588) has no coordinates on her birth/death places in Wikidata.
const QIDS = [
  "Q7226", "Q307", "Q9036", "Q8743", "Q5593", "Q296", "Q255",
  "Q1339", "Q5592", "Q9439", "Q5686", "Q7245", "Q23434", "Q882", "Q303", "Q1203",
  "Q15869", "Q8409", "Q859", "Q913", "Q9215", "Q991", "Q7304", "Q619", "Q37150",
  "Q1067", "Q1043", "Q5682", "Q34970", "Q46633", "Q9068", "Q1541", "Q80137",
  "Q9200", "Q41688", "Q504", "Q7013", "Q131691",
];

// Resolve labels explicitly (rdfs:label) rather than via the label SERVICE,
// which can leave labels unbound under GROUP BY; collapse to one row per person.
const query = `SELECT ?person
  (SAMPLE(?name) AS ?nm) (SAMPLE(?sl) AS ?slv) (SAMPLE(?dob) AS ?dobv) (SAMPLE(?dod) AS ?dodv)
  (SAMPLE(?bc) AS ?bcv) (SAMPLE(?dc) AS ?dcv) (SAMPLE(?gender) AS ?gv) (SAMPLE(?country) AS ?cv)
  (GROUP_CONCAT(DISTINCT ?occQid; separator=",") AS ?occs)
  (GROUP_CONCAT(DISTINCT ?occLabel; separator="|") AS ?occLabels) WHERE {
  VALUES ?person { ${QIDS.map((q) => "wd:" + q).join(" ")} }
  ?person rdfs:label ?name . FILTER(LANG(?name) = "en")
  ?person wdt:P569 ?dob ; wdt:P570 ?dod ; wdt:P19 ?bp ; wdt:P20 ?dp ; wikibase:sitelinks ?sl .
  ?bp wdt:P625 ?bc . ?dp wdt:P625 ?dc .
  OPTIONAL { ?person wdt:P21 ?g . ?g rdfs:label ?gender . FILTER(LANG(?gender) = "en") }
  OPTIONAL { ?bp wdt:P17 ?c . ?c rdfs:label ?country . FILTER(LANG(?country) = "en") }
  OPTIONAL {
    ?person wdt:P106 ?occ . BIND(STRAFTER(STR(?occ), "entity/") AS ?occQid)
    ?occ rdfs:label ?occLabel . FILTER(LANG(?occLabel) = "en")
  }
} GROUP BY ?person`;

const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
  headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const rows = (await res.json()).results.bindings.map((r) => ({
  person: r.person,
  personLabel: r.nm,
  sl: r.slv,
  dob: r.dobv,
  dod: r.dodv,
  bc: r.bcv,
  dc: r.dcv,
  genderLabel: r.gv,
  countryLabel: r.cv,
  occs: r.occs,
  occLabels: r.occLabels,
}));

const raw = JSON.parse(readFileSync(join(root, "src/data/people-raw.json"), "utf8"));
const byId = new Map(raw.map((p) => [p.id, p]));
const before = byId.size;
let added = 0;

for (const r of rows) {
  const id = r.person.value.split("/").pop();
  if (!r.personLabel?.value) continue; // no English name — skip
  const isNew = !byId.has(id);
  if (isNew) added++;
  const occQids = (r.occs?.value || "").split(",").filter(Boolean);
  const occLabels = (r.occLabels?.value || "").split("|").filter(Boolean);
  const domainCount = {};
  for (const q of occQids) {
    const d = OCC_DOMAIN[q];
    if (d) domainCount[d] = (domainCount[d] || 0) + 1;
  }
  byId.set(id, {
    id,
    name: r.personLabel.value,
    fame: parseInt(r.sl.value, 10),
    dob: r.dob.value,
    dod: r.dod.value,
    bc: r.bc.value,
    dc: r.dc.value,
    gender: r.genderLabel?.value || "",
    country: r.countryLabel?.value || "",
    occupations: occLabels.slice(0, 4),
    domains: Object.keys(domainCount).length ? domainCount : { "Arts & Letters": 1 },
  });
}

writeFileSync(join(root, "src/data/people-raw.json"), JSON.stringify([...byId.values()]));
console.log(`Fetched ${rows.length} iconic figures, +${added} new. Pool ${before} → ${byId.size}`);
console.log("Names:", rows.map((r) => r.personLabel.value).join(", "));
