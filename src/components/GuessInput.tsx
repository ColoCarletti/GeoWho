import { useMemo, useRef, useState } from "react";
import type { Person } from "../types";
import { searchPeople } from "../lib/people";

interface Props {
  onGuess: (person: Person) => void;
  guessedIds: Set<string>;
  shake?: boolean;
}

export default function GuessInput({ onGuess, guessedIds, shake }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (open ? searchPeople(query) : []), [query, open]);

  function choose(person: Person) {
    if (guessedIds.has(person.id)) return;
    onGuess(person);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${shake ? "animate-[shake_0.4s]" : ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Who is it? Type a name…"
        autoComplete="off"
        spellCheck={false}
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-center text-lg text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.map((p, i) => {
            const already = guessedIds.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={already}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full truncate px-4 py-2.5 text-left text-sm ${
                    already
                      ? "cursor-not-allowed text-slate-400 line-through"
                      : i === active
                        ? "bg-teal-50 text-slate-900 dark:bg-teal-900/40 dark:text-slate-100"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
