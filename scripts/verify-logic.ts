// Sanity checks for the (minimal) GeoWho engine, run against the real modules.
import { people, world, getRandomPerson, searchPeople, findById, getClues } from "../src/lib/people";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}${detail ? "  → " + detail : ""}`);
}

console.log("Dataset:");
check("has the curated famous pool", people.length >= 150 && people.length <= 260, `${people.length} people`);
check("every figure is genuinely famous", Math.min(...people.map((p) => p.fame)) >= 100, `min fame ${Math.min(...people.map((p) => p.fame))}`);
check("world map has a land path", world.land.length > 1000 && world.w > 0);
check("every person has projected birth+death coords", people.every(
  (p) => Number.isFinite(p.bx) && Number.isFinite(p.by) && Number.isFinite(p.dx) && Number.isFinite(p.dy)
));
check("coords fall within the map viewBox", people.every(
  (p) =>
    p.bx >= 0 && p.bx <= world.w && p.by >= 0 && p.by <= world.h &&
    p.dx >= 0 && p.dx <= world.w && p.dy >= 0 && p.dy <= world.h
));
check("every person has a name and exact dates", people.every(
  (p) => p.name && typeof p.birth === "string" && p.birth.length > 0 && p.death.length > 0
));

console.log("\nExact-date formatting (from real data):");
const show = (n: string) => {
  const p = people.find((x) => x.name === n);
  if (p) console.log(`  ${n}: born ${p.birth} · died ${p.death}`);
  return p;
};
const einstein = show("Albert Einstein");
show("Napoleon");
const confucius = show("Confucius");
check("day-precise date shows a month name", /March/.test(einstein?.birth || ""));
check("year-only date shows no fake month", confucius ? !/January/.test(confucius.birth) : true);
check("BCE dates carry 'BC'", (confucius?.birth || "").includes("BC"));

console.log("\nRandom selection:");
const a = getRandomPerson();
check("returns a valid person", Boolean(a?.id && a?.name));
check("exclude avoids repeat", (() => {
  for (let i = 0; i < 50; i++) if (getRandomPerson(a.id).id === a.id) return false;
  return true;
})());

console.log("\nClues:");
check("every figure has a category", people.every((p) => p.domain), `missing: ${people.filter((p) => !p.domain).length}`);
check("categories are from the known set", people.every((p) =>
  ["Science", "Arts & Letters", "Power & Society", "Stage & Screen", "Exploration & Sport"].includes(p.domain)
));
const clueSample = people.find((p) => p.name === "Napoleon") || people[0];
const cl = getClues(clueSample);
check("getClues returns broad→specific clues", cl.length >= 2 && cl[0].label === "Category");
console.log(`  ${clueSample.name}: ${cl.map((c) => `${c.label}=${c.value}`).join(" | ")}`);

console.log("\nSearch:");
check("prefix search works", searchPeople("napo").some((p) => p.name.includes("Napoleon")));
check("empty query returns nothing", searchPeople("").length === 0);
check("results are famous-first", (() => {
  const r = searchPeople("a");
  return r.length < 2 || r[0].fame >= r[r.length - 1].fame;
})());
check("findById round-trips", findById(a.id)?.id === a.id);

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
