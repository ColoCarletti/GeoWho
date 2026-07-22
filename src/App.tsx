import { useMemo, useState } from "react";
import type { GameStatus, Person } from "./types";
import { getRandomPerson, world } from "./lib/people";
import WorldMap from "./components/WorldMap";
import GuessInput from "./components/GuessInput";
import Clues from "./components/Clues";

export default function App() {
  const [target, setTarget] = useState<Person>(() => getRandomPerson());
  const [status, setStatus] = useState<GameStatus>("playing");
  const [wrong, setWrong] = useState<Person[]>([]);
  const [shake, setShake] = useState(false);

  const guessedIds = useMemo(() => new Set(wrong.map((p) => p.id)), [wrong]);
  const playing = status === "playing";

  function handleGuess(person: Person) {
    if (!playing || guessedIds.has(person.id)) return;
    if (person.id === target.id) {
      setStatus("won");
    } else {
      setWrong((w) => [...w, person]);
      setShake(true);
    }
  }

  function newFigure() {
    setTarget(getRandomPerson(target.id));
    setStatus("playing");
    setWrong([]);
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <h1 className="text-center font-display text-2xl font-bold tracking-tight">
          GeoWho
        </h1>

        <WorldMap world={world} person={target} />

        {/* the two facts always on screen: exact birth & death dates */}
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

        {playing ? (
          <div className="flex flex-col gap-3">
            <GuessInput
              onGuess={handleGuess}
              guessedIds={guessedIds}
              shake={shake}
              onShakeEnd={() => setShake(false)}
            />

            {wrong.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-slate-400 dark:text-slate-600">
                {wrong.map((p) => (
                  <span key={p.id} className="line-through">
                    {p.name}
                  </span>
                ))}
              </div>
            )}

            <Clues key={target.id} person={target} />

            <div className="flex items-center justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setStatus("revealed")}
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
        ) : (
          <Result won={status === "won"} name={target.name} onNext={newFigure} />
        )}
      </div>
    </div>
  );
}

function Result({
  won,
  name,
  onNext,
}: {
  won: boolean;
  name: string;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p>
        <span
          className={`font-semibold ${
            won ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {won ? "🎉 Correct" : "It was"}
        </span>{" "}
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
