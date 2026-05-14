import { useCallback, useEffect, useState } from 'react';
import { fetchCurriculum } from '../services/curriculumApi';
import { LessonContent } from '../types/curriculum';

interface UseCurriculumResult {
  lessons: LessonContent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Failed to load lesson content.';
}

function getLessonOrderNumber(lessonId: string) {
  const match = lessonId.match(/(\d+)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]);
}

function sortLessons(lessons: LessonContent[]) {
  return [...lessons].sort((a, b) => {
    const aOrder = getLessonOrderNumber(a.id);
    const bOrder = getLessonOrderNumber(b.id);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.title.localeCompare(b.title);
  });
}

export function useCurriculum(): UseCurriculumResult {
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const remoteLessons = await fetchCurriculum(false);
      if (!remoteLessons) {
        throw new Error('No lesson content is available yet.');
      }
      setLessons(sortLessons(remoteLessons));
    } catch (err) {
      setLessons([]);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const remoteLessons = await fetchCurriculum(false);
        if (!remoteLessons) {
          throw new Error('No lesson content is available yet.');
        }
        if (!isMounted) return;
        setLessons(sortLessons(remoteLessons));
      } catch (err) {
        if (!isMounted) return;
        setLessons([]);
        setError(getErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    lessons,
    isLoading,
    error,
    refresh,
  };
}
