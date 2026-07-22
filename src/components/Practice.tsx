import { useMemo, useState } from "react";
import type { Person } from "../types";
import { getClues, findById } from "../lib/people";
import {
  applyGuess,
  applyPick,
  buildOptions,
  getRandomPerson,
  newRound,
  stageOf,
  type RoundState,
} from "../lib/game";
import Round from "./Round";

/** A fresh random figure plus a stable seed for its multiple-choice options. */
function drawFigure(excludeId?: string) {
  return {
    person: getRandomPerson(excludeId),
    seed: Math.floor(Math.random() * 2 ** 31),
    round: newRound(),
  };
}

/** Practice mode: unlimited random figures, with a running session tally. */
export default function Practice() {
  const [figure, setFigure] = useState(() => drawFigure());
  const [round, setRound] = useState<RoundState>(newRound);
  const [score, setScore] = useState(0);
  const [played, setPlayed] = useState(0);
  const [shake, setShake] = useState(false);

  const { person, seed } = figure;
  const stage = stageOf(round);

  const clues = useMemo(() => getClues(person), [person]);
  const wrongPeople = useMemo(
    () => round.wrong.map(findById).filter((p): p is Person => Boolean(p)),
    [round.wrong]
  );
  const options = useMemo(
    () => (stage >= 3 ? buildOptions(person, seed, round.wrong) : []),
    [person, seed, stage] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function handleGuess(guess: Person) {
    if (guess.id !== person.id) setShake(true);
    setRound((r) => applyGuess(r, person.id, guess.id));
  }

  function nextFigure() {
    setScore((s) => s + (round.result ?? 0));
    setPlayed((n) => n + 1);
    setFigure(drawFigure(person.id));
    setRound(newRound());
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        Practice
        {played > 0 && (
          <>
            {" · "}
            <span className="tabular-nums">{played}</span> played ·{" "}
            <span className="tabular-nums">{score}</span> pts
          </>
        )}
      </p>
      <Round
        person={person}
        stage={stage}
        clues={clues}
        wrong={wrongPeople}
        options={options}
        result={round.result}
        isLast={false}
        shake={shake}
        onShakeEnd={() => setShake(false)}
        onGuess={handleGuess}
        onPick={(pick) => setRound((r) => applyPick(r, person.id, pick.id))}
        onNext={nextFigure}
      />
    </div>
  );
}
