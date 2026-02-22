import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  LessonProgress,
  ProgressMap,
  loadProgressMap,
  saveProgressMap,
} from '../services/progressStorage';
import { DEFAULT_TEST_USER_ID, LESSON_PASS_THRESHOLD } from '../constants/progress';
import { fetchRemoteProgress, syncRemoteProgress } from '../services/progressApi';

// Type for the context value
interface ProgressContextType {
  progressMap: ProgressMap;
  isHydrated: boolean;
  updateLessonProgress: (lessonId: string, progress: number) => void;
  markLessonComplete: (lessonId: string) => void;
  markLessonStarted: (lessonId: string) => void;
  recordQuizAttempt: (lessonId: string, score: number) => void;
  isLessonComplete: (lessonId: string) => boolean;
  isLessonUnlocked: (lessonId: string) => boolean;
  isLessonLocked: (lessonId: string) => boolean;
  getLessonProgress: (lessonId: string) => LessonProgress;
  syncFromBackend: (userId?: string) => Promise<void>;
  syncToBackend: (userId?: string) => Promise<void>;
}

// Props type for the provider
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

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const stored = await loadProgressMap();
      if (isMounted) {
        setProgressMap(stored);
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
    saveProgressMap(progressMap);
  }, [isHydrated, progressMap]);

  const getLessonProgress = useCallback(
    (lessonId: string): LessonProgress => {
      return progressMap[lessonId] ?? createEmptyLessonProgress();
    },
    [progressMap]
  );

  const updateLessonProgress = useCallback((lessonId: string, progress: number) => {
    setProgressMap((prev) => {
      const existing = prev[lessonId] ?? createEmptyLessonProgress();
      const normalized = Math.max(0, Math.min(100, Math.round(progress)));
      const completed = normalized >= LESSON_PASS_THRESHOLD;
      return {
        ...prev,
        [lessonId]: {
          ...existing,
          started: true,
          progress: normalized,
          bestScore: Math.max(existing.bestScore, normalized),
          completed,
          completedAt: completed ? existing.completedAt ?? new Date().toISOString() : undefined,
        },
      };
    });
  }, []);

  const markLessonComplete = useCallback((lessonId: string) => {
    updateLessonProgress(lessonId, 100);
  }, [updateLessonProgress]);

  const markLessonStarted = useCallback((lessonId: string) => {
    setProgressMap((prev) => {
      const existing = prev[lessonId] ?? createEmptyLessonProgress();
      return {
        ...prev,
        [lessonId]: {
          ...existing,
          started: true,
          openedCount: existing.openedCount + 1,
          lastOpenedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const recordQuizAttempt = useCallback((lessonId: string, score: number) => {
    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    setProgressMap((prev) => {
      const existing = prev[lessonId] ?? createEmptyLessonProgress();
      const bestScore = Math.max(existing.bestScore, normalized);
      const completed = bestScore >= LESSON_PASS_THRESHOLD;

      return {
        ...prev,
        [lessonId]: {
          ...existing,
          started: true,
          progress: bestScore,
          bestScore,
          quizAttempts: existing.quizAttempts + 1,
          completed,
          completedAt: completed ? existing.completedAt ?? new Date().toISOString() : undefined,
        },
      };
    });
  }, []);

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
      const previousLessonId = `lesson-${lessonNumber - 1}`;

      return progressMap[previousLessonId]?.completed === true;
    },
    [progressMap]
  );

  const isLessonLocked = useCallback((lessonId: string) => !isLessonUnlocked(lessonId), [isLessonUnlocked]);

  const syncFromBackend = useCallback(async (userId = DEFAULT_TEST_USER_ID) => {
    const remote = await fetchRemoteProgress(userId);
    if (!remote) return;
    setProgressMap(remote);
  }, []);

  const syncToBackend = useCallback(async (userId = DEFAULT_TEST_USER_ID) => {
    await syncRemoteProgress(userId, progressMap);
  }, [progressMap]);

  const value = useMemo(
    () => ({
      progressMap,
      isHydrated,
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
      isHydrated,
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

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = (): ProgressContextType => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
};
