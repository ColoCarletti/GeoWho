import { useState } from "react";
import type { Person } from "../types";
import { getClues } from "../lib/people";

interface Props {
  person: Person;
}

/**
 * On-demand hints, revealed one at a time (broad category → occupation →
 * country). Give this a `key={person.id}` so the reveal count resets per figure.
 */
export default function Clues({ person }: Props) {
  const [shown, setShown] = useState(0);
  const clues = getClues(person);

  return (
    <div className="flex flex-col items-center gap-2">
      {clues.slice(0, shown).map((clue) => (
        <div
          key={clue.label}
          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm dark:border-amber-700/60 dark:bg-amber-950/30"
        >
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {clue.label}:
          </span>{" "}
          <span className="text-slate-800 dark:text-slate-100">{clue.value}</span>
        </div>
      ))}

      {shown < clues.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + 1)}
          className="text-sm font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          💡 {shown === 0 ? "Need a clue?" : "Another clue"}
        </button>
      )}
    </div>
  );
}
