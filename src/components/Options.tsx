import type { Person } from "../types";

interface Props {
  options: Person[];
  onPick: (person: Person) => void;
}

/** Final-stage multiple choice: four similar figures, worth 10 points. */
export default function Options({ options, onPick }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Last try — pick one for 10 points:
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onPick(person)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-medium text-slate-800 shadow-sm transition hover:border-teal-500 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-teal-500 dark:hover:bg-teal-900/30"
          >
            {person.name}
          </button>
        ))}
      </div>
    </div>
  );
}
