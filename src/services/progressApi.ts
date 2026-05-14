import supabase, { hasSupabaseConfig } from '../../lib/supabaseClient';
import { createInitialGamificationState } from './gamification';
import { AppProgressState, LessonProgress, ProgressMap } from './progressStorage';

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
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select('progress_map,gamification_state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    progressMap: normalizeProgressMap(data.progress_map),
    gamification: isRecord(data.gamification_state)
      ? { ...createInitialGamificationState(), ...data.gamification_state }
      : createInitialGamificationState(),
  };
}

export async function syncRemoteProgressState(userId: string, progressState: AppProgressState): Promise<void> {
  if (!hasSupabaseConfig || !supabase) return;

  const { error } = await supabase.from('user_progress').upsert({
    user_id: userId,
    progress_map: progressState.progressMap,
    gamification_state: progressState.gamification,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
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
