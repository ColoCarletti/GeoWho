/** A famous historical figure — the thing the player guesses. */
export interface Person {
  /** Wikidata QID, e.g. "Q937". */
  id: string;
  /** Common English name, e.g. "Albert Einstein". */
  name: string;
  /** Fame proxy: number of Wikipedia language editions (used to rank search). */
  fame: number;
  /** Signed birth year (negative = BCE); used to rank era-similar options. */
  birthYear: number;
  /** Signed death year (negative = BCE). */
  deathYear: number;
  /** Exact birth date, formatted to its real precision, e.g. "14 March 1879". */
  birth: string;
  /** Exact death date, e.g. "18 April 1955". */
  death: string;
  /** Birthplace coordinates (degrees). */
  blng: number;
  blat: number;
  /** Place-of-death coordinates (degrees). */
  dlng: number;
  dlat: number;
  /** Big category, e.g. "Science" (clue 1). */
  domain: string;
  /** Representative occupation, e.g. "physicist" (clue 2). */
  occupation: string;
  /** Country of birth, e.g. "Germany" (clue 3). */
  country: string;
}

/** A progressively-revealed clue. */
export interface Clue {
  label: string;
  value: string;
}

/**
 * The state of the daily game, persisted to localStorage.
 *
 * The round in progress is `scores.length` (0-based); the day is finished once
 * `scores.length === ROUNDS`. `wrong`/`result` describe that in-progress round:
 * the ids guessed wrong so far, and the final round score once it's decided
 * (null while still guessing — the player hasn't pressed "Next" yet).
 */
export interface DailyProgress {
  dateKey: string;
  scores: number[];
  wrong: string[];
  result: number | null;
}

