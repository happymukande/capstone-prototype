import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { LESSON_PASS_THRESHOLD } from '../constants/progress';
import {
  AppProgressState,
  LessonProgress,
  ProgressMap,
  loadProgressState,
  saveProgressState,
} from '../services/progressStorage';
import {
  applyQuizGamification,
  createInitialGamificationState,
  ensureCurrentDailyState,
  getDailyQuestStatus,
  getLevelProgress,
} from '../services/gamification';
import {
  DailyQuestStatus,
  GamificationState,
  LevelProgress,
  QuizRewardSummary,
} from '../types/gamification';
type CloudSyncStatus = 'idle' | 'syncing' | 'error';

interface ProgressContextType {
  progressMap: ProgressMap;
  gamification: GamificationState;
  dailyQuestStatus: DailyQuestStatus[];
  levelProgress: LevelProgress;
  isHydrated: boolean;
  cloudUserId: string | null;
  isCloudSyncEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  updateLessonProgress: (lessonId: string, progress: number) => void;
  markLessonComplete: (lessonId: string) => void;
  markLessonStarted: (lessonId: string) => void;
  recordQuizAttempt: (lessonId: string, score: number) => QuizRewardSummary;
  isLessonComplete: (lessonId: string) => boolean;
  isLessonUnlocked: (lessonId: string) => boolean;
  isLessonLocked: (lessonId: string) => boolean;
  getLessonProgress: (lessonId: string) => LessonProgress;
  syncFromBackend: (userId?: string) => Promise<void>;
  syncToBackend: (userId?: string) => Promise<void>;
}

interface ProgressProviderProps {
  children: ReactNode;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

const createEmptyLessonProgress = (): LessonProgress => ({
  progress: 0,
  completed: false,
  started: false,
  openedCount: 0,
  quizAttempts: 0,
  bestScore: 0,
});

const createInitialProgressState = (): AppProgressState => ({
  progressMap: {},
  gamification: createInitialGamificationState(),
});


export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [progressState, setProgressState] = useState<AppProgressState>(createInitialProgressState);
  const progressStateRef = useRef(progressState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [cloudUserId] = useState<string | null>(null);
  const [isCloudSyncEnabled] = useState(false);
  const [cloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [cloudSyncError] = useState<string | null>(null);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSnapshotRef = useRef('');

  const progressMap = progressState.progressMap;
  const gamification = progressState.gamification;

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const stored = await loadProgressState();
      if (isMounted) {
        setProgressState(stored);
        progressStateRef.current = stored;
        lastSyncedSnapshotRef.current = JSON.stringify(stored);
        setIsHydrated(true);
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void saveProgressState(progressState);
  }, [isHydrated, progressState]);

  useEffect(() => {
    progressStateRef.current = progressState;
  }, [progressState]);

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    setProgressState((prev) => {
      const gamificationToday = ensureCurrentDailyState(prev.gamification);
      if (gamificationToday === prev.gamification) return prev;
      return {
        ...prev,
        gamification: gamificationToday,
      };
    });
  }, [isHydrated]);

  const getLessonProgress = useCallback(
    (lessonId: string): LessonProgress => {
      return progressMap[lessonId] ?? createEmptyLessonProgress();
    },
    [progressMap]
  );

  const updateLessonProgress = useCallback((lessonId: string, progress: number) => {
    setProgressState((prev) => {
      const existing = prev.progressMap[lessonId] ?? createEmptyLessonProgress();
      const normalized = Math.max(0, Math.min(100, Math.round(progress)));
      const completed = normalized >= LESSON_PASS_THRESHOLD;

      return {
        ...prev,
        progressMap: {
          ...prev.progressMap,
          [lessonId]: {
            ...existing,
            started: true,
            progress: normalized,
            bestScore: Math.max(existing.bestScore, normalized),
            completed,
            completedAt: completed ? existing.completedAt ?? new Date().toISOString() : undefined,
          },
        },
      };
    });
  }, []);

  const markLessonComplete = useCallback(
    (lessonId: string) => {
      updateLessonProgress(lessonId, 100);
    },
    [updateLessonProgress]
  );

  const markLessonStarted = useCallback((lessonId: string) => {
    setProgressState((prev) => {
      const existing = prev.progressMap[lessonId] ?? createEmptyLessonProgress();
      return {
        ...prev,
        progressMap: {
          ...prev.progressMap,
          [lessonId]: {
            ...existing,
            started: true,
            openedCount: existing.openedCount + 1,
            lastOpenedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const recordQuizAttempt = useCallback(
    (lessonId: string, score: number): QuizRewardSummary => {
      const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
      const now = new Date();
      const currentState = progressStateRef.current;
      const existing = currentState.progressMap[lessonId] ?? createEmptyLessonProgress();
      const bestScore = Math.max(existing.bestScore, normalizedScore);
      const completed = bestScore >= LESSON_PASS_THRESHOLD;
      const gamificationResult = applyQuizGamification(currentState.gamification, normalizedScore, now);
      const nextState: AppProgressState = {
        progressMap: {
          ...currentState.progressMap,
          [lessonId]: {
            ...existing,
            started: true,
            progress: bestScore,
            bestScore,
            quizAttempts: existing.quizAttempts + 1,
            completed,
            completedAt: completed ? existing.completedAt ?? now.toISOString() : undefined,
          },
        },
        gamification: gamificationResult.gamification,
      };

      progressStateRef.current = nextState;
      setProgressState(nextState);

      return gamificationResult.reward;
    },
    []
  );

  const isLessonComplete = useCallback(
    (lessonId: string) => {
      return progressMap[lessonId]?.completed ?? false;
    },
    [progressMap]
  );

  const isLessonUnlocked = useCallback(
    (lessonId: string) => {
      if (lessonId === 'lesson-1') return true;

      const lessonNumber = Number(lessonId.replace('lesson-', ''));
      if (Number.isNaN(lessonNumber) || lessonNumber <= 1) return true;

      const previousLessonId = `lesson-${lessonNumber - 1}`;
      return progressMap[previousLessonId]?.completed === true;
    },
    [progressMap]
  );

  const isLessonLocked = useCallback(
    (lessonId: string) => !isLessonUnlocked(lessonId),
    [isLessonUnlocked]
  );

  const resolveSyncUserId = useCallback(
    async (explicitUserId?: string): Promise<string | null> => {
      if (explicitUserId) return explicitUserId;
      if (cloudUserId) return cloudUserId;

      return null;
    },
    [cloudUserId]
  );

  const syncFromBackend = useCallback(
    async (userId?: string) => {
      await resolveSyncUserId(userId);
    },
    [resolveSyncUserId]
  );

  const syncToBackend = useCallback(
    async (userId?: string) => {
      await resolveSyncUserId(userId);
    },
    [resolveSyncUserId]
  );

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, []);

  const dailyQuestStatus = useMemo(() => getDailyQuestStatus(gamification), [gamification]);
  const levelProgress = useMemo(
    () => getLevelProgress(gamification.summary.totalXp),
    [gamification.summary.totalXp]
  );

  const value = useMemo(
    () => ({
      progressMap,
      gamification,
      dailyQuestStatus,
      levelProgress,
      isHydrated,
      cloudUserId,
      isCloudSyncEnabled,
      cloudSyncStatus,
      cloudSyncError,
      updateLessonProgress,
      markLessonComplete,
      markLessonStarted,
      recordQuizAttempt,
      isLessonComplete,
      isLessonUnlocked,
      isLessonLocked,
      getLessonProgress,
      syncFromBackend,
      syncToBackend,
    }),
    [
      progressMap,
      gamification,
      dailyQuestStatus,
      levelProgress,
      isHydrated,
      cloudUserId,
      isCloudSyncEnabled,
      cloudSyncStatus,
      cloudSyncError,
      updateLessonProgress,
      markLessonComplete,
      markLessonStarted,
      recordQuizAttempt,
      isLessonComplete,
      isLessonUnlocked,
      isLessonLocked,
      getLessonProgress,
      syncFromBackend,
      syncToBackend,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
};

export const useProgress = (): ProgressContextType => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
};
