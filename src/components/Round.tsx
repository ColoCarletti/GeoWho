import type { Clue, Person } from "../types";
import WorldMap from "./WorldMap";
import GuessInput from "./GuessInput";
import Options from "./Options";
import Clues from "./Clues";

interface Props {
  person: Person;
  /** 1 = map only, 2 = one hint, 3 = second hint + multiple choice. */
  stage: number;
  clues: Clue[];
  wrong: Person[];
  options: Person[];
  /** Round score once decided, else null (still guessing). */
  result: number | null;
  isLast: boolean;
  shake: boolean;
  onShakeEnd: () => void;
  onGuess: (person: Person) => void;
  onPick: (person: Person) => void;
  onNext: () => void;
}

export default function Round({
  person,
  stage,
  clues,
  wrong,
  options,
  result,
  isLast,
  shake,
  onShakeEnd,
  onGuess,
  onPick,
  onNext,
}: Props) {
  const guessedIds = new Set(wrong.map((p) => p.id));
  const decided = result !== null;

  return (
    <div className="flex flex-col gap-4">
      <WorldMap person={person} />

      {/* the two facts always on screen: exact birth & death dates */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-base sm:text-lg">
        <span className="flex items-center gap-2">
          <span className="text-teal-600 dark:text-teal-400">★</span>
          <span className="text-slate-500 dark:text-slate-400">Born</span>
          <span className="font-semibold tabular-nums">{person.birth}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-rose-600 dark:text-rose-400">✝</span>
          <span className="text-slate-500 dark:text-slate-400">Died</span>
          <span className="font-semibold tabular-nums">{person.death}</span>
        </span>
      </div>

      {decided ? (
        <RoundResult won={result > 0} score={result} name={person.name} isLast={isLast} onNext={onNext} />
      ) : (
        <>
          {stage < 3 ? (
            <GuessInput
              onGuess={onGuess}
              guessedIds={guessedIds}
              shake={shake}
              onShakeEnd={onShakeEnd}
            />
          ) : (
            <Options options={options} onPick={onPick} />
          )}

          <Clues clues={clues} revealed={wrong.length} />

          {wrong.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-slate-400 dark:text-slate-600">
              {wrong.map((p) => (
                <span key={p.id} className="line-through">
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoundResult({
  won,
  score,
  name,
  isLast,
  onNext,
}: {
  won: boolean;
  score: number;
  name: string;
  isLast: boolean;
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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        +{score} {score === 1 ? "point" : "points"}
      </p>
      <button
        type="button"
        onClick={onNext}
        className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
      >
        {isLast ? "See your score →" : "Next figure →"}
      </button>
    </div>
  );
}
