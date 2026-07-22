import type { Person } from "../types";
import { people } from "./people";

/** Figures to guess per day. */
export const ROUNDS = 3;

/**
 * Points for guessing correctly at each stage of a round:
 *   stage 1 — from the map + dates alone
 *   stage 2 — after one free hint
 *   stage 3 — from four multiple-choice options (after a second hint)
 * A wrong pick at stage 3 scores 0.
 */
export const STAGE_SCORES = [100, 50, 10];

/** Highest achievable daily total. */
export const MAX_SCORE = ROUNDS * STAGE_SCORES[0];

/** Number of choices shown at the multiple-choice stage. */
export const OPTION_COUNT = 4;

// --- round rules (pure) -----------------------------------------------------

/** One round's progress: ids guessed wrong, and the score once decided. */
export interface RoundState {
  wrong: string[];
  result: number | null;
}

export const newRound = (): RoundState => ({ wrong: [], result: null });

/** Current stage (1, 2, or 3) — one per wrong guess so far, capped by the ladder. */
export const stageOf = (round: RoundState): number => round.wrong.length + 1;

/** Apply a free-text guess (stages 1–2): correct decides the score, wrong advances. */
export function applyGuess(round: RoundState, targetId: string, guessId: string): RoundState {
  if (round.result !== null || round.wrong.includes(guessId)) return round;
  if (guessId === targetId) return { ...round, result: STAGE_SCORES[stageOf(round) - 1] };
  return { ...round, wrong: [...round.wrong, guessId] };
}

/** Apply a multiple-choice pick (stage 3): 10 points if right, else 0. */
export function applyPick(round: RoundState, targetId: string, pickId: string): RoundState {
  if (round.result !== null) return round;
  return { ...round, result: pickId === targetId ? STAGE_SCORES[2] : 0 };
}

// --- sharing ----------------------------------------------------------------

/** Emoji for each score, so a run reads at a glance without spoilers. */
const SCORE_EMOJI: Record<number, string> = {
  [STAGE_SCORES[0]]: "🟢", // first try
  [STAGE_SCORES[1]]: "🟡", // after one hint
  [STAGE_SCORES[2]]: "🟠", // multiple choice
  0: "⬛", // missed
};

/** Tries it took to land a score (for the per-figure breakdown). */
const scoreTries = (score: number): number =>
  score === 0 ? ROUNDS : STAGE_SCORES.indexOf(score) + 1;

/**
 * A shareable, spoiler-free recap of a finished day: puzzle number, total,
 * an emoji line, and a per-figure tries breakdown. `url`, if given, is appended
 * so friends can jump straight to today's puzzle.
 */
export function shareText(scores: number[], day: number = dayNumber(), url = ""): string {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const emoji = scores.map((s) => SCORE_EMOJI[s] ?? "⬛").join("");
  const lines = scores.map((s, i) => {
    const tries = scoreTries(s);
    const attempt = s === 0 ? "missed" : `${tries} ${tries === 1 ? "try" : "tries"}`;
    return `${SCORE_EMOJI[s] ?? "⬛"} Figure ${i + 1} · +${s} (${attempt})`;
  });
  return [
    `GeoWho #${day} — ${total}/${MAX_SCORE} 🌍`,
    emoji,
    "",
    ...lines,
    ...(url ? ["", url] : []),
  ].join("\n");
}

// --- date helpers -----------------------------------------------------------

/** Day 0 of the puzzle sequence (local time). */
const EPOCH = Date.UTC(2024, 0, 1);

/** Local calendar date as YYYY-MM-DD — the key for "today's" puzzle. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days since EPOCH — the deterministic seed for a day's figures. */
export function dayNumber(d: Date = new Date()): number {
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((local - EPOCH) / 86_400_000);
}

/** Milliseconds until the next local midnight (for the countdown). */
export function msUntilTomorrow(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

// --- deterministic randomness ----------------------------------------------

/** Small seeded PRNG so every player gets the same puzzle on a given day. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, for per-person seeds. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher–Yates shuffle into a new array, driven by a seeded PRNG. */
function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A fixed shuffle of all people; a day reads three consecutive entries from it.
const ORDER = shuffled(
  people.map((_, i) => i),
  mulberry32(20240101)
);

// --- daily selection & options ----------------------------------------------

/** The three figures for a given day — deterministic, no repeats within a day. */
export function getDailyPeople(day: number = dayNumber()): Person[] {
  const n = people.length;
  const start = ((day * ROUNDS) % n + n) % n;
  const picks: Person[] = [];
  for (let i = 0; picks.length < ROUNDS; i++) {
    const person = people[ORDER[(start + i) % n]];
    if (!picks.some((p) => p.id === person.id)) picks.push(person);
  }
  return picks;
}

/**
 * Multiple-choice options for the final stage: the answer plus lookalikes —
 * same category, closest in era — shuffled deterministically. Ids the player
 * already guessed wrong are excluded so options aren't trivially eliminated.
 */
export function buildOptions(
  person: Person,
  day: number,
  excludeIds: string[] = []
): Person[] {
  const exclude = new Set([person.id, ...excludeIds]);
  const nearInEra = (a: Person, b: Person) =>
    Math.abs(a.birthYear - person.birthYear) - Math.abs(b.birthYear - person.birthYear);

  let pool = people.filter((p) => !exclude.has(p.id) && p.domain === person.domain);
  if (pool.length < OPTION_COUNT - 1) {
    pool = people.filter((p) => !exclude.has(p.id));
  }

  const rng = mulberry32(hashString(person.id) ^ day);
  const near = pool.slice().sort(nearInEra).slice(0, 8);
  const distractors = shuffled(near, rng).slice(0, OPTION_COUNT - 1);
  return shuffled([person, ...distractors], rng);
}
