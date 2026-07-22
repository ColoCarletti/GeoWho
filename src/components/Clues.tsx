import type { Clue } from "../types";

interface Props {
  clues: Clue[];
  /** How many clues to show (one is revealed after each wrong guess). */
  revealed: number;
}

/** The hints unlocked so far this round, shown as amber chips. */
export default function Clues({ clues, revealed }: Props) {
  const shown = clues.slice(0, revealed);
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {shown.map((clue) => (
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
    </div>
  );
}
