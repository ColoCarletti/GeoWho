import { useMemo, useState } from "react";
import type { Person } from "./types";
import { getClues, getRandomPerson, world } from "./lib/people";
import WorldMap from "./components/WorldMap";
import GuessInput from "./components/GuessInput";

export default function App() {
  const [target, setTarget] = useState<Person>(() => getRandomPerson());
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState<Person[]>([]);
  const [shake, setShake] = useState(false);
  const [cluesShown, setCluesShown] = useState(0);

  const guessedIds = useMemo(() => new Set(wrong.map((p) => p.id)), [wrong]);
  const clues = useMemo(() => getClues(target), [target]);
  const done = solved || revealed;

  function handleGuess(p: Person) {
    if (done || guessedIds.has(p.id)) return;
    if (p.id === target.id) {
      setSolved(true);
    } else {
      setWrong((w) => [...w, p]);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  function newFigure() {
    setTarget(getRandomPerson(target.id));
    setSolved(false);
    setRevealed(false);
    setWrong([]);
    setCluesShown(0);
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <h1 className="text-center font-display text-2xl font-bold tracking-tight">
          GeoWho
        </h1>

        <WorldMap world={world} person={target} />

        {/* the two facts: exact birth & death dates */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-base sm:text-lg">
          <span className="flex items-center gap-2">
            <span className="text-teal-600 dark:text-teal-400">★</span>
            <span className="text-slate-500 dark:text-slate-400">Born</span>
            <span className="font-semibold tabular-nums">{target.birth}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-rose-600 dark:text-rose-400">✝</span>
            <span className="text-slate-500 dark:text-slate-400">Died</span>
            <span className="font-semibold tabular-nums">{target.death}</span>
          </span>
        </div>

        {solved && (
          <Result
            label="🎉 Correct"
            name={target.name}
            onNext={newFigure}
            tone="text-teal-600 dark:text-teal-400"
          />
        )}
        {revealed && (
          <Result
            label="It was"
            name={target.name}
            onNext={newFigure}
            tone="text-slate-500 dark:text-slate-400"
          />
        )}

        {!done && (
          <div className="flex flex-col gap-3">
            <GuessInput onGuess={handleGuess} guessedIds={guessedIds} shake={shake} />

            {wrong.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-slate-400 dark:text-slate-600">
                {wrong.map((p) => (
                  <span key={p.id} className="line-through">
                    {p.name}
                  </span>
                ))}
              </div>
            )}

            {/* clues, revealed on demand: broad category → occupation → country */}
            <div className="flex flex-col items-center gap-2">
              {clues.slice(0, cluesShown).map((c, i) => (
                <div
                  key={i}
                  className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm dark:border-amber-700/60 dark:bg-amber-950/30"
                >
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {c.label}:
                  </span>{" "}
                  <span className="text-slate-800 dark:text-slate-100">{c.value}</span>
                </div>
              ))}
              {cluesShown < clues.length && (
                <button
                  type="button"
                  onClick={() => setCluesShown((n) => n + 1)}
                  className="text-sm font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  💡 {cluesShown === 0 ? "Need a clue?" : "Another clue"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                Reveal answer
              </button>
              <button
                type="button"
                onClick={newFigure}
                className="text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                New figure →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Result({
  label,
  name,
  tone,
  onNext,
}: {
  label: string;
  name: string;
  tone: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p>
        <span className={`font-semibold ${tone}`}>{label}</span>{" "}
        <span className="font-display text-2xl">{name}</span>
      </p>
      <button
        type="button"
        onClick={onNext}
        className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
      >
        New figure →
      </button>
    </div>
  );
}
