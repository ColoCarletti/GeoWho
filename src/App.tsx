import { useEffect, useMemo, useState } from "react";
import type { Person } from "./types";
import { getClues, findById } from "./lib/people";
import {
  ROUNDS,
  applyGuess,
  applyPick,
  buildOptions,
  dateKey,
  dayNumber,
  getDailyPeople,
  newRound,
  stageOf,
  type RoundState,
} from "./lib/game";
import { loadDaily, saveDaily } from "./lib/storage";
import Round from "./components/Round";
import Summary from "./components/Summary";

export default function App() {
  const day = dayNumber();
  const roster = useMemo(() => getDailyPeople(day), [day]);

  // Persisted state: completed rounds' scores, plus the in-progress round.
  const [scores, setScores] = useState<number[]>([]);
  const [round, setRound] = useState<RoundState>(newRound);
  const [loaded, setLoaded] = useState(false);
  const [shake, setShake] = useState(false);

  // Restore today's progress once, on mount.
  useEffect(() => {
    const saved = loadDaily();
    if (saved) {
      setScores(saved.scores);
      setRound({ wrong: saved.wrong, result: saved.result });
    }
    setLoaded(true);
  }, []);

  // Persist after every change (but not before the initial restore).
  useEffect(() => {
    if (!loaded) return;
    saveDaily({ dateKey: dateKey(), scores, wrong: round.wrong, result: round.result });
  }, [loaded, scores, round]);

  const roundIndex = scores.length;
  const done = roundIndex >= ROUNDS;
  const person = roster[Math.min(roundIndex, ROUNDS - 1)];
  const stage = stageOf(round);

  const clues = useMemo(() => getClues(person), [person]);
  const wrongPeople = useMemo(
    () => round.wrong.map(findById).filter((p): p is Person => Boolean(p)),
    [round.wrong]
  );
  const options = useMemo(
    () => (stage >= 3 ? buildOptions(person, day, round.wrong) : []),
    [person, stage, day] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const runningScore = scores.reduce((sum, s) => sum + s, 0);

  function handleGuess(guess: Person) {
    if (guess.id !== person.id) setShake(true);
    setRound((r) => applyGuess(r, person.id, guess.id));
  }

  function handlePick(pick: Person) {
    setRound((r) => applyPick(r, person.id, pick.id));
  }

  function nextRound() {
    setScores((s) => [...s, round.result ?? 0]);
    setRound(newRound());
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <header className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">GeoWho</h1>
          {!done && (
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Figure {roundIndex + 1} of {ROUNDS}
              {runningScore > 0 && (
                <> · <span className="tabular-nums">{runningScore}</span> pts</>
              )}
            </p>
          )}
        </header>

        {done ? (
          <Summary people={roster} scores={scores} />
        ) : (
          <Round
            person={person}
            stage={stage}
            clues={clues}
            wrong={wrongPeople}
            options={options}
            result={round.result}
            isLast={roundIndex === ROUNDS - 1}
            shake={shake}
            onShakeEnd={() => setShake(false)}
            onGuess={handleGuess}
            onPick={handlePick}
            onNext={nextRound}
          />
        )}
      </div>
    </div>
  );
}
