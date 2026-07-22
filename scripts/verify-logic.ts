// Sanity checks for the daily GeoWho engine, run against the real modules.
import { people, searchPeople, findById, getClues } from "../src/lib/people";
import {
  ROUNDS,
  STAGE_SCORES,
  MAX_SCORE,
  OPTION_COUNT,
  SHARE_URL,
  getDailyPeople,
  getRandomPerson,
  buildOptions,
  buildShareText,
  newRound,
  stageOf,
  applyGuess,
  applyPick,
} from "../src/lib/game";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}${detail ? "  → " + detail : ""}`);
}

console.log("Dataset:");
check("curated famous pool", people.length >= 150 && people.length <= 260, `${people.length} people`);
check("every figure genuinely famous", Math.min(...people.map((p) => p.fame)) >= 100);
check("every figure has a name and exact dates", people.every(
  (p) => p.name && p.birth?.length > 0 && p.death?.length > 0
));

console.log("\nScoring config:");
check("100 / 50 / 10 ladder", STAGE_SCORES.join(",") === "100,50,10");
check("max score is rounds × 100", MAX_SCORE === ROUNDS * 100, `${MAX_SCORE}`);

console.log("\nScore ladder (round reducer):");
const T = "target", X = "wrong1", Y = "wrong2";
// stage 1 correct → 100
check("correct on 1st try → 100", applyGuess(newRound(), T, T).result === 100);
// wrong → stage 2 → correct → 50
const afterWrong = applyGuess(newRound(), T, X);
check("wrong advances to stage 2", stageOf(afterWrong) === 2 && afterWrong.result === null);
check("correct on 2nd try → 50", applyGuess(afterWrong, T, T).result === 50);
// wrong, wrong → stage 3 → pick
const afterTwo = applyGuess(afterWrong, T, Y);
check("two wrong advances to stage 3", stageOf(afterTwo) === 3);
check("right pick on 3rd → 10", applyPick(afterTwo, T, T).result === 10);
check("wrong pick on 3rd → 0", applyPick(afterTwo, T, X).result === 0);
// guards
check("duplicate wrong guess ignored", applyGuess(afterWrong, T, X).wrong.length === 1);
check("no scoring after decided", applyGuess(applyGuess(newRound(), T, T), T, X).result === 100);

console.log("\nDaily selection:");
const d0 = getDailyPeople(0);
const d1 = getDailyPeople(1);
check("picks ROUNDS figures", d0.length === ROUNDS, `${d0.length}`);
check("no repeats within a day", new Set(d0.map((p) => p.id)).size === ROUNDS);
check("deterministic per day", getDailyPeople(5).map((p) => p.id).join() === getDailyPeople(5).map((p) => p.id).join());
check("different days differ", d0.map((p) => p.id).join() !== d1.map((p) => p.id).join());
console.log("  day 0:", d0.map((p) => p.name).join(", "));

console.log("\nMultiple-choice options:");
const target = people.find((p) => p.name === "Napoleon") || people[0];
const opts = buildOptions(target, 0);
check("returns OPTION_COUNT options", opts.length === OPTION_COUNT, `${opts.length}`);
check("includes the correct answer", opts.some((p) => p.id === target.id));
check("options are distinct", new Set(opts.map((p) => p.id)).size === OPTION_COUNT);
check("deterministic per (person, day)", buildOptions(target, 0).map((p) => p.id).join() === opts.map((p) => p.id).join());
check("excludes already-wrong guesses", (() => {
  const other = people.find((p) => p.id !== target.id)!;
  return !buildOptions(target, 0, [other.id]).some((p) => p.id === other.id);
})());
console.log("  " + target.name + " options:", opts.map((p) => p.name).join(", "));

console.log("\nPractice (random):");
const r1 = getRandomPerson();
check("returns a valid person", Boolean(r1?.id && r1?.name));
check("exclude avoids immediate repeat", (() => {
  for (let i = 0; i < 50; i++) if (getRandomPerson(r1.id).id === r1.id) return false;
  return true;
})());

console.log("\nShare text:");
const share = buildShareText([100, 50, 0], 122);
check("has header with total / max", share.includes(`123 — 150/${MAX_SCORE}`));
check("one line per figure", share.split("\n").filter((l) => /^\d\. /.test(l)).length === 3);
check("is spoiler-free (no figure names)", !getDailyPeople(122).some((p) => share.includes(p.name)));
check("ends with the game link", share.trim().endsWith(SHARE_URL));
console.log(share.split("\n").map((l) => "  " + l).join("\n"));

console.log("\nClues:");
check("every figure has a category", people.every((p) => p.domain));
const cl = getClues(target);
check("clues go broad→specific", cl.length >= 2 && cl[0].label === "Category");
console.log(`  ${target.name}: ${cl.map((c) => `${c.label}=${c.value}`).join(" | ")}`);

console.log("\nSearch:");
check("prefix search works", searchPeople("napo").some((p) => p.name.includes("Napoleon")));
check("empty query returns nothing", searchPeople("").length === 0);
check("results are famous-first", (() => {
  const r = searchPeople("a");
  return r.length < 2 || r[0].fame >= r[r.length - 1].fame;
})());
check("findById round-trips", findById(target.id)?.id === target.id);

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
