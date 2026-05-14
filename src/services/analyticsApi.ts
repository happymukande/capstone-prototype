import supabase, { hasSupabaseConfig } from '../../lib/supabaseClient';
import { LESSON_PASS_THRESHOLD } from '../constants/progress';
import { LessonContent } from '../types/curriculum';
import { ProgressMap, loadProgressState } from './progressStorage';
import { fetchCurriculum } from './curriculumApi';

type SupabaseProgressRow = {
  user_id: string;
  progress_map: ProgressMap | null;
};

export interface TeacherAnalyticsOverview {
  totalLearners: number;
  activeLearners: number;
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  archivedLessons: number;
  startedLessonEntries: number;
  completedLessonEntries: number;
  completionRate: number;
  totalQuizAttempts: number;
  averageBestScore: number;
}

export interface TeacherAnalyticsLesson {
  lessonId: string;
  title: string;
  status: string;
  learnersStarted: number;
  learnersCompleted: number;
  inProgressLearners: number;
  completionRate: number;
  totalQuizAttempts: number;
  averageBestScore: number;
}

export interface TeacherAnalyticsSummary {
  generatedAt: string;
  passThreshold: number;
  overview: TeacherAnalyticsOverview;
  perLesson: TeacherAnalyticsLesson[];
}

function isStarted(progress: any) {
  return Boolean(progress?.started || Number(progress?.progress || 0) > 0 || Number(progress?.quizAttempts || 0) > 0);
}

function isCompleted(progress: any, passThreshold: number) {
  if (progress?.completed === true) return true;
  return Number(progress?.bestScore || 0) >= passThreshold || Number(progress?.progress || 0) >= passThreshold;
}

function calculateAnalyticsFromData(
  lessons: LessonContent[],
  progressRows: SupabaseProgressRow[],
  passThreshold = LESSON_PASS_THRESHOLD
): TeacherAnalyticsSummary {
  const lessonStats = new Map<string, any>();
  for (const lesson of lessons) {
    lessonStats.set(lesson.id, {
      lessonId: lesson.id,
      title: lesson.title,
      status: lesson.status,
      learnersStarted: 0,
      learnersCompleted: 0,
      inProgressLearners: 0,
      totalQuizAttempts: 0,
      bestScoreSum: 0,
      bestScoreSamples: 0,
    });
  }

  let activeLearners = 0;
  let startedLessonEntries = 0;
  let completedLessonEntries = 0;
  let totalQuizAttempts = 0;
  let bestScoreSum = 0;
  let bestScoreSamples = 0;

  for (const row of progressRows) {
    const progressMap = row.progress_map ?? {};
    const lessonIds = Object.keys(progressMap);
    let activeForUser = false;

    for (const lessonId of lessonIds) {
      const progress = (progressMap as ProgressMap)[lessonId];
      const started = isStarted(progress);
      const completed = isCompleted(progress, passThreshold);
      const quizAttempts = Number(progress?.quizAttempts || 0);
      const bestScore = Number(progress?.bestScore || 0);

      if (started) activeForUser = true;

      if (!lessonStats.has(lessonId)) {
        lessonStats.set(lessonId, {
          lessonId,
          title: `${lessonId} (Unmapped)`,
          status: 'unmapped',
          learnersStarted: 0,
          learnersCompleted: 0,
          inProgressLearners: 0,
          totalQuizAttempts: 0,
          bestScoreSum: 0,
          bestScoreSamples: 0,
        });
      }

      const stats = lessonStats.get(lessonId);

      if (started) {
        stats.learnersStarted += 1;
        startedLessonEntries += 1;
      }
      if (completed) {
        stats.learnersCompleted += 1;
        completedLessonEntries += 1;
      } else if (started) {
        stats.inProgressLearners += 1;
      }

      stats.totalQuizAttempts += quizAttempts;
      totalQuizAttempts += quizAttempts;

      if (bestScore > 0) {
        stats.bestScoreSum += bestScore;
        stats.bestScoreSamples += 1;
        bestScoreSum += bestScore;
        bestScoreSamples += 1;
      }
    }

    if (activeForUser) {
      activeLearners += 1;
    }
  }

  const perLesson: TeacherAnalyticsLesson[] = Array.from(lessonStats.values())
    .map((stats) => ({
      lessonId: stats.lessonId,
      title: stats.title,
      status: stats.status,
      learnersStarted: stats.learnersStarted,
      learnersCompleted: stats.learnersCompleted,
      inProgressLearners: stats.inProgressLearners,
      completionRate:
        stats.learnersStarted > 0 ? Math.round((stats.learnersCompleted / stats.learnersStarted) * 100) : 0,
      totalQuizAttempts: stats.totalQuizAttempts,
      averageBestScore:
        stats.bestScoreSamples > 0 ? Math.round((stats.bestScoreSum / stats.bestScoreSamples) * 10) / 10 : 0,
    }))
    .sort((a, b) => {
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
      return a.lessonId.localeCompare(b.lessonId);
    });

  const publishedLessons = lessons.filter((lesson) => lesson.status === 'published').length;
  const draftLessons = lessons.filter((lesson) => lesson.status === 'draft').length;
  const archivedLessons = lessons.filter((lesson) => lesson.status === 'archived').length;

  return {
    generatedAt: new Date().toISOString(),
    passThreshold,
    overview: {
      totalLearners: progressRows.length,
      activeLearners,
      totalLessons: lessons.length,
      publishedLessons,
      draftLessons,
      archivedLessons,
      startedLessonEntries,
      completedLessonEntries,
      completionRate:
        startedLessonEntries > 0 ? Math.round((completedLessonEntries / startedLessonEntries) * 100) : 0,
      totalQuizAttempts,
      averageBestScore: bestScoreSamples > 0 ? Math.round((bestScoreSum / bestScoreSamples) * 10) / 10 : 0,
    },
    perLesson,
  };
}

export async function fetchTeacherAnalytics(_adminKey?: string): Promise<TeacherAnalyticsSummary | null> {
  const lessons = (await fetchCurriculum(true)) ?? [];

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('user_id,progress_map');

    if (!error && Array.isArray(data)) {
      return calculateAnalyticsFromData(lessons as LessonContent[], data as SupabaseProgressRow[], LESSON_PASS_THRESHOLD);
    }
  }

  const progressState = await loadProgressState();
  const progressRows: SupabaseProgressRow[] = [
    {
      user_id: 'local-demo-user',
      progress_map: progressState.progressMap,
    },
  ];
  return calculateAnalyticsFromData(lessons as LessonContent[], progressRows, LESSON_PASS_THRESHOLD);
}
