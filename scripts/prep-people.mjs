// Finish the dataset: parse dates/coords, project birth & death points onto a
// world map, and emit the two files the game consumes.
//
//   src/data/world.json   -> { w, h, land }  (base map SVG path)
//   src/data/people.json  -> [{ id, name, fame, birthYear, deathYear,
//                               bx, by, dx, dy, domain, occupations, country, gender }]
//
// Points are pre-projected to pixel coords in the same viewBox as `land`, so the
// runtime needs no projection library — it just plots x/y on the map path.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// A plain rectangular (equirectangular / plate-carrée) map: familiar, fills the
// frame edge to edge with no oval or curved borders. Sphere ratio is exactly
// 2:1, so a 2:1 viewBox is filled with no empty margins and no stretching.
const W = 900;
const H = 450;

// --- base world map ---------------------------------------------------------
const landTopo = JSON.parse(
  readFileSync(join(root, "node_modules/world-atlas/land-110m.json"), "utf8")
);
const land = feature(landTopo, landTopo.objects.land);
const projection = geoEquirectangular().fitSize([W, H], { type: "Sphere" });
const pathGen = geoPath(projection);
const round = (n) => Math.round(n * 10) / 10;
const landPath = pathGen(land).replace(/-?\d+\.?\d*/g, (m) => String(round(parseFloat(m))));

writeFileSync(
  join(root, "src/data/world.json"),
  JSON.stringify({ w: W, h: H, land: landPath })
);

// --- people -----------------------------------------------------------------
const raw = JSON.parse(readFileSync(join(root, "src/data/people-raw.json"), "utf8"));

/** Year as a signed integer (negative = BCE). Wikidata: "-0044-03-15T..". */
function yearOf(iso) {
  const neg = iso.startsWith("-");
  const core = neg ? iso.slice(1) : iso.replace(/^\+/, "");
  const y = parseInt(core.slice(0, core.indexOf("-")), 10);
  return neg ? -y : y;
}
/** "Point(lng lat)" -> [lng, lat]. */
function lngLat(point) {
  const m = point.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a Wikidata date to the precision actually recorded (day/month/year). */
function formatDate(iso, precision) {
  const neg = iso.startsWith("-");
  const core = (neg ? iso.slice(1) : iso.replace(/^\+/, "")).split("T")[0];
  const [y, m, d] = core.split("-").map((n) => parseInt(n, 10));
  const year = neg ? -y : y;
  const bc = year < 0 ? " BC" : "";
  const absY = Math.abs(year);
  if (precision >= 11 && m && d) return `${d} ${MONTHS[m - 1]} ${absY}${bc}`;
  if (precision === 10 && m) return `${MONTHS[m - 1]} ${absY}${bc}`;
  return `${absY}${bc}`;
}

// Tie-breaker when a person spans multiple categories equally.
const DOMAIN_PRIORITY = [
  "Science",
  "Power & Society",
  "Arts & Letters",
  "Exploration & Sport",
  "Stage & Screen",
];

// Map a Wikidata occupation label to one of five big categories. Weights let a
// defining role (footballer, monarch) outweigh incidental side-gigs (many
// athletes/writers are also tagged "actor"/"musician").
const CATS = [
  ["Exploration & Sport", 3, ["football","soccer","basketball","cricket","tennis","boxer","boxing","athlete","sportsperson","sportsman","cyclist","racing driver","swimmer","olympic","baseball","golfer","wrestler","formula one","rugby","sprinter","gymnast","explorer","navigator","astronaut","cosmonaut","mountaineer","aviator"]],
  ["Power & Society", 2, ["politician","monarch","king","queen","emperor","empress","president","prime minister","statesperson","diplomat","military","general","admiral","officer","commander","revolutionary","activist","lawyer","jurist","pope","cardinal","religious leader","saint","sovereign","head of state","dictator","nobility","aristocrat","chancellor","governor"]],
  ["Stage & Screen", 1.5, ["actor","actress","singer","musician","film director","filmmaker","comedian","dancer","model","entertainer","guitarist","pianist","rapper","record producer","screenwriter","film producer","television"]],
  ["Science", 1.2, ["physicist","chemist","biologist","mathematician","scientist","astronomer","physician","naturalist","inventor","engineer","economist","psychologist","geologist","botanist","geographer","anatomist","zoologist","surgeon","psychoanalyst","computer scientist","logician"]],
  ["Arts & Letters", 1.0, ["painter","sculptor","writer","poet","novelist","playwright","dramaturge","dramatist","philosopher","composer","architect","artist","author","historian","theologian","journalist","essayist","cartoonist","photographer","designer","illustrator","draughtsman"]],
];
function catOf(label) {
  const l = label.toLowerCase();
  for (const [name, , kws] of CATS) if (kws.some((k) => l.includes(k))) return name;
  return null;
}
/** Pick the best category + a representative occupation from a P106 list. */
function categorize(p106) {
  const score = {};
  const firstOcc = {};
  for (const occ of p106) {
    const c = catOf(occ);
    if (!c) continue;
    const w = CATS.find((x) => x[0] === c)[1];
    score[c] = (score[c] || 0) + w;
    if (!firstOcc[c]) firstOcc[c] = occ;
  }
  const order = CATS.map((x) => x[0]);
  const best = Object.entries(score).sort(
    (a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0])
  )[0];
  return best ? { domain: best[0], occupation: firstOcc[best[0]] } : { domain: "", occupation: "" };
}

const out = [];
let dropped = 0;

for (const p of raw) {
  const b = lngLat(p.bc);
  const d = lngLat(p.dc);
  const birthYear = yearOf(p.dob);
  const deathYear = yearOf(p.dod);
  if (!b || !d || !Number.isFinite(birthYear) || !Number.isFinite(deathYear)) {
    dropped++;
    continue;
  }
  // sanity: plausible human lifespan
  if (deathYear < birthYear || deathYear - birthYear > 122 || birthYear < -2500) {
    dropped++;
    continue;
  }
  const bp = projection(b);
  const dp = projection(d);
  if (!bp || !dp) {
    dropped++;
    continue;
  }

  // Clue fields, from real occupations. Fall back to the fetch-bucket domains
  // only if a person has no usable P106 list.
  let { domain, occupation } = categorize(p.p106 || []);
  if (!domain) {
    domain =
      Object.entries(p.domains || {}).sort(
        (a, c) =>
          c[1] - a[1] || DOMAIN_PRIORITY.indexOf(a[0]) - DOMAIN_PRIORITY.indexOf(c[0])
      )[0]?.[0] || "";
    occupation = (p.occupations || [])[0] || "";
  }

  out.push({
    id: p.id,
    name: p.name,
    fame: p.fame,
    birthYear,
    deathYear,
    birth: formatDate(p.dob, p.dobP ?? 9),
    death: formatDate(p.dod, p.dodP ?? 9),
    bx: Math.round(bp[0]),
    by: Math.round(bp[1]),
    dx: Math.round(dp[0]),
    dy: Math.round(dp[1]),
    // clue fields (broad → specific)
    domain,
    occupation,
    country: p.country || "",
  });
}

// Keep only the most famous figures, so every answer is a household name.
const TOP_N = 200;

// drop entries whose "name" is just a QID (missing English label)
const cleanAll = out.filter((p) => !/^Q\d+$/.test(p.name));
cleanAll.sort((a, b) => b.fame - a.fame);
const clean = cleanAll.slice(0, TOP_N);

writeFileSync(join(root, "src/data/people.json"), JSON.stringify(clean));

const bytes = readFileSync(join(root, "src/data/people.json")).length;
console.log(
  `Wrote ${clean.length} people (${(bytes / 1024).toFixed(0)} KB), dropped ${dropped}. ` +
    `World map: ${(landPath.length / 1024).toFixed(0)} KB path.`
);
console.log("Fame range:", clean[clean.length - 1]?.fame, "→", clean[0]?.fame);
console.log("Sample top 5:", clean.slice(0, 5).map((p) => p.name).join(", "));
