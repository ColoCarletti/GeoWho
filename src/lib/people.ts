import peopleData from "../data/people.json";
import worldData from "../data/world.json";
import type { Clue, Person, WorldMap } from "../types";

export const people = peopleData as Person[];
export const world = worldData as WorldMap;

const CATEGORY_ICON: Record<string, string> = {
  Science: "🔬",
  "Arts & Letters": "🎨",
  "Power & Society": "👑",
  "Stage & Screen": "🎬",
  "Exploration & Sport": "🧭",
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Clues for a stuck player, broad → specific. */
export function getClues(p: Person): Clue[] {
  const clues: Clue[] = [];
  if (p.domain)
    clues.push({ label: "Category", value: `${CATEGORY_ICON[p.domain] ?? ""} ${p.domain}`.trim() });
  if (p.occupation) clues.push({ label: "Occupation", value: cap(p.occupation) });
  if (p.country) clues.push({ label: "Born in", value: p.country });
  return clues;
}

/** A random figure, optionally different from the current one. */
export function getRandomPerson(excludeId?: string): Person {
  let p = people[Math.floor(Math.random() * people.length)];
  while (excludeId && p.id === excludeId && people.length > 1) {
    p = people[Math.floor(Math.random() * people.length)];
  }
  return p;
}

export function findById(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

/** Case-insensitive name search for the autocomplete, most-famous first. */
export function searchPeople(query: string, limit = 7): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: Person[] = [];
  const contains: Person[] = [];
  for (const p of people) {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) starts.push(p);
    else if (name.includes(q)) contains.push(p);
  }
  const byFame = (a: Person, b: Person) => b.fame - a.fame;
  return [...starts.sort(byFame), ...contains.sort(byFame)].slice(0, limit);
}
