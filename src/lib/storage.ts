import type { DailyProgress } from "../types";
import { dateKey } from "./game";

const KEY = "geowho:daily";

/** Today's saved progress, or null if there's none (or it's from a past day). */
export function loadDaily(): DailyProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as DailyProgress;
    return saved.dateKey === dateKey() ? saved : null;
  } catch {
    return null;
  }
}

export function saveDaily(progress: DailyProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable — the game still works in-memory for this session */
  }
}
