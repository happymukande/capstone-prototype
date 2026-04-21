import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROGRESS_STORAGE_KEY } from '../constants/progress';
import { GamificationState } from '../types/gamification';
import { createInitialGamificationState, normalizeGamificationState } from './gamification';

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

export interface AppProgressState {
  progressMap: ProgressMap;
  gamification: GamificationState;
}

const EMPTY_LESSON_PROGRESS: LessonProgress = {
  progress: 0,
  completed: false,
  started: false,
  openedCount: 0,
  quizAttempts: 0,
  bestScore: 0,
};

let inMemoryProgressState: AppProgressState = {
  progressMap: {},
  gamification: createInitialGamificationState(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampNumber(value: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, value));
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return value;
}

function normalizeLessonProgress(raw: unknown): LessonProgress {
  if (!isRecord(raw)) return { ...EMPTY_LESSON_PROGRESS };

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

function normalizeProgressState(raw: unknown): AppProgressState {
  if (!isRecord(raw)) {
    return {
      progressMap: {},
      gamification: createInitialGamificationState(),
    };
  }

  if (!('progressMap' in raw)) {
    return {
      progressMap: normalizeProgressMap(raw),
      gamification: createInitialGamificationState(),
    };
  }

  return {
    progressMap: normalizeProgressMap(raw.progressMap),
    gamification: normalizeGamificationState(raw.gamification),
  };
}

export async function loadProgressState(): Promise<AppProgressState> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return inMemoryProgressState;

    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeProgressState(parsed);
    inMemoryProgressState = normalized;
    return normalized;
  } catch {
    return inMemoryProgressState;
  }
}

export async function saveProgressState(progressState: AppProgressState): Promise<void> {
  inMemoryProgressState = progressState;
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressState));
  } catch {
    // No-op for storage quota or unavailable storage.
  }
}

export async function loadProgressMap(): Promise<ProgressMap> {
  const state = await loadProgressState();
  return state.progressMap;
}

export async function saveProgressMap(progressMap: ProgressMap): Promise<void> {
  const current = await loadProgressState();
  await saveProgressState({
    ...current,
    progressMap,
  });
}
