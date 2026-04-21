import { createInitialGamificationState } from './gamification';
import { AppProgressState, LessonProgress, ProgressMap } from './progressStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

function hasRestBackendConfig() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return value;
}

function clampNumber(value: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLessonProgress(raw: unknown): LessonProgress {
  if (!isRecord(raw)) {
    return {
      progress: 0,
      completed: false,
      started: false,
      openedCount: 0,
      quizAttempts: 0,
      bestScore: 0,
    };
  }

  const progress = clampNumber(Math.round(toSafeNumber(raw.progress, 0)), 0, 100);
  const bestScore = clampNumber(Math.round(toSafeNumber(raw.bestScore, progress)), 0, 100);
  const quizAttempts = clampNumber(Math.round(toSafeNumber(raw.quizAttempts, 0)), 0);
  const openedCount = clampNumber(Math.round(toSafeNumber(raw.openedCount, 0)), 0);
  const started = Boolean(raw.started) || progress > 0 || openedCount > 0;
  const completed = Boolean(raw.completed) || progress >= 100;

  return {
    progress,
    completed,
    started,
    openedCount,
    quizAttempts,
    bestScore,
    lastOpenedAt: typeof raw.lastOpenedAt === 'string' ? raw.lastOpenedAt : undefined,
    completedAt: completed && typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  };
}

function normalizeProgressMap(raw: unknown): ProgressMap {
  if (!isRecord(raw)) return {};
  const normalized: ProgressMap = {};

  for (const [lessonId, lessonValue] of Object.entries(raw)) {
    normalized[lessonId] = normalizeLessonProgress(lessonValue);
  }

  return normalized;
}

export async function fetchRemoteProgressState(userId: string): Promise<AppProgressState | null> {
  if (!hasRestBackendConfig()) return null;

  const response = await fetch(`${API_BASE_URL}/progress/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch progress (${response.status})`);
  }

  const payload = (await response.json()) as { progressMap?: unknown };
  return {
    progressMap: normalizeProgressMap(payload.progressMap),
    gamification: createInitialGamificationState(),
  };
}

export async function syncRemoteProgressState(userId: string, progressState: AppProgressState): Promise<void> {
  if (!hasRestBackendConfig()) return;

  const response = await fetch(`${API_BASE_URL}/progress/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, progressMap: progressState.progressMap }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync progress (${response.status})`);
  }
}

export async function fetchRemoteProgress(userId: string): Promise<ProgressMap | null> {
  const state = await fetchRemoteProgressState(userId);
  return state?.progressMap ?? null;
}

export async function syncRemoteProgress(userId: string, progressMap: ProgressMap): Promise<void> {
  const existing = await fetchRemoteProgressState(userId);
  await syncRemoteProgressState(userId, {
    progressMap,
    gamification: existing?.gamification ?? createInitialGamificationState(),
  });
}
