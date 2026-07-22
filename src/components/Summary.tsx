import { useEffect, useState } from "react";
import type { Person } from "../types";
import { MAX_SCORE, dayNumber, msUntilTomorrow, shareText } from "../lib/game";

interface Props {
  people: Person[];
  scores: number[];
}

function countdown(): string {
  const ms = msUntilTomorrow();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor((ms % 3_600_000) / 60_000))}:${pad(
    Math.floor((ms % 60_000) / 1000)
  )}`;
}

/** End-of-day recap: total score, per-figure breakdown, and a countdown. */
export default function Summary({ people, scores }: Props) {
  const [time, setTime] = useState(countdown);
  useEffect(() => {
    const id = setInterval(() => setTime(countdown()), 1000);
    return () => clearInterval(id);
  }, []);

  const [shared, setShared] = useState(false);
  const total = scores.reduce((sum, s) => sum + s, 0);

  async function share() {
    const text = shareText(scores, dayNumber(), window.location.href);
    // Prefer the native share sheet (mobile); fall back to the clipboard.
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User dismissed the sheet, or it's unavailable — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing else we can do.
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          Today's score
        </p>
        <p className="font-display text-5xl font-bold tabular-nums">
          {total}
          <span className="text-2xl text-slate-400 dark:text-slate-500"> / {MAX_SCORE}</span>
        </p>
      </div>

      <div className="w-full max-w-sm divide-y divide-slate-200 dark:divide-slate-800">
        {people.map((person, i) => (
          <div key={person.id} className="flex items-center justify-between py-2.5 text-left">
            <span className="flex items-center gap-2">
              <span className="text-sm text-slate-400 tabular-nums">{i + 1}</span>
              <span className="font-medium">{person.name}</span>
            </span>
            <span
              className={`font-semibold tabular-nums ${
                scores[i] > 0 ? "text-teal-600 dark:text-teal-400" : "text-slate-400"
              }`}
            >
              +{scores[i]}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={share}
        className="rounded-full bg-teal-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-teal-500 active:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
      >
        {shared ? "Copied!" : "Share results"}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Come back tomorrow for 3 new figures ·{" "}
        <span className="tabular-nums font-semibold">{time}</span>
      </p>
    </div>
  );
}
