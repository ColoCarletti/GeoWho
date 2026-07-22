import { useState } from "react";
import Daily from "./components/Daily";
import Practice from "./components/Practice";

type Mode = "daily" | "practice";

export default function App() {
  const [mode, setMode] = useState<Mode>("daily");

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">GeoWho</h1>
          <ModeToggle mode={mode} onChange={setMode} />
        </header>

        {/* remount on mode change so each mode starts clean (daily restores from storage) */}
        {mode === "daily" ? <Daily /> : <Practice />}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const modes: { id: Mode; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "practice", label: "Practice" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-800">
      {modes.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          onClick={() => onChange(id)}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            mode === id
              ? "bg-teal-600 text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
