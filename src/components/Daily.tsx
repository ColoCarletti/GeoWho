import { useEffect, useMemo, useState } from "react";
import type { Person } from "../types";
import { getClues, findById } from "../lib/people";
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
} from "../lib/game";
import { loadDaily, saveDaily } from "../lib/storage";
import Round from "./Round";
import Summary from "./Summary";

/** The daily game: three fixed figures, scored, then a shareable summary. */
export default function Daily() {
  const day = dayNumber();
  const roster = useMemo(() => getDailyPeople(day), [day]);

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

  function nextRound() {
    setScores((s) => [...s, round.result ?? 0]);
    setRound(newRound());
  }

  if (done) return <Summary people={roster} scores={scores} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        Figure {roundIndex + 1} of {ROUNDS}
        {runningScore > 0 && (
          <> · <span className="tabular-nums">{runningScore}</span> pts</>
        )}
      </p>
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
        onPick={(pick) => setRound((r) => applyPick(r, person.id, pick.id))}
        onNext={nextRound}
      />
    </div>
  );
}
