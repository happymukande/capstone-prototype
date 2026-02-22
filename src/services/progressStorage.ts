import { PROGRESS_STORAGE_KEY } from '../constants/progress';

export interface LessonProgress {
  progress: number;
  completed: boolean;
  started: boolean;
  openedCount: number;
  quizAttempts: number;
  bestScore: number;
  lastOpenedAt?: string;
  completedAt?: string;
}

export type ProgressMap = Record<string, LessonProgress>;

let inMemoryProgressMap: ProgressMap = {};

function canUseLocalStorage() {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

export async function loadProgressMap(): Promise<ProgressMap> {
  if (!canUseLocalStorage()) return inMemoryProgressMap;

  try {
    const raw = (globalThis as { localStorage: any }).localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function saveProgressMap(progressMap: ProgressMap): Promise<void> {
  inMemoryProgressMap = progressMap;
  if (!canUseLocalStorage()) return;

  try {
    (globalThis as { localStorage: any }).localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(progressMap)
    );
  } catch {
    // No-op for storage quota or unavailable storage.
  }
}
