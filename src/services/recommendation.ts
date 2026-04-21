import { LESSON_PASS_THRESHOLD } from '../constants/progress';
import { LessonContent } from '../types/curriculum';
import { ProgressMap } from './progressStorage';

export type RecommendationKind = 'resume' | 'start' | 'review' | 'all-complete' | 'none';

export interface LessonRecommendation {
  kind: RecommendationKind;
  lessonId?: string;
  headline: string;
  detail: string;
  ctaLabel: string;
}

const EMPTY_PROGRESS = {
  progress: 0,
  completed: false,
  started: false,
  openedCount: 0,
  quizAttempts: 0,
  bestScore: 0,
};

function getProgress(progressMap: ProgressMap, lessonId: string) {
  return progressMap[lessonId] ?? EMPTY_PROGRESS;
}

export function getLessonRecommendation(
  lessons: LessonContent[],
  progressMap: ProgressMap,
  isLessonUnlocked: (lessonId: string) => boolean,
  passThreshold = LESSON_PASS_THRESHOLD
): LessonRecommendation {
  if (lessons.length === 0) {
    return {
      kind: 'none',
      headline: 'No Published Modules',
      detail: 'There are no published lessons yet. Add and publish content in Teacher Admin.',
      ctaLabel: 'Refresh Lessons',
    };
  }

  const unlockedLessons = lessons.filter((lesson) => isLessonUnlocked(lesson.id));

  if (unlockedLessons.length === 0) {
    return {
      kind: 'none',
      headline: 'Modules Currently Locked',
      detail: 'No modules are unlocked yet. Confirm lesson IDs start from lesson-1 and are ordered correctly.',
      ctaLabel: 'Refresh Lessons',
    };
  }

  const resumeCandidates = unlockedLessons
    .filter((lesson) => {
      const progress = getProgress(progressMap, lesson.id);
      return progress.started && !progress.completed;
    })
    .sort((a, b) => {
      const aProgress = getProgress(progressMap, a.id);
      const bProgress = getProgress(progressMap, b.id);
      if (aProgress.progress !== bProgress.progress) {
        return bProgress.progress - aProgress.progress;
      }
      return bProgress.openedCount - aProgress.openedCount;
    });

  if (resumeCandidates.length > 0) {
    const lesson = resumeCandidates[0];
    const progress = getProgress(progressMap, lesson.id);

    return {
      kind: 'resume',
      lessonId: lesson.id,
      headline: `Resume: ${lesson.title}`,
      detail: `You are ${progress.progress}% complete. Keep going to unlock the next module.`,
      ctaLabel: 'Continue Lesson',
    };
  }

  const startCandidates = unlockedLessons.filter((lesson) => {
    const progress = getProgress(progressMap, lesson.id);
    return !progress.started && !progress.completed;
  });

  if (startCandidates.length > 0) {
    const lesson = startCandidates[0];
    return {
      kind: 'start',
      lessonId: lesson.id,
      headline: `Start: ${lesson.title}`,
      detail: 'This is the best next unlocked lesson to begin.',
      ctaLabel: 'Start Lesson',
    };
  }

  const reviewCandidates = unlockedLessons
    .filter((lesson) => {
      const progress = getProgress(progressMap, lesson.id);
      return progress.completed && progress.bestScore < 100;
    })
    .sort((a, b) => {
      const aScore = getProgress(progressMap, a.id).bestScore;
      const bScore = getProgress(progressMap, b.id).bestScore;
      return aScore - bScore;
    });

  if (reviewCandidates.length > 0) {
    const lesson = reviewCandidates[0];
    const progress = getProgress(progressMap, lesson.id);
    return {
      kind: 'review',
      lessonId: lesson.id,
      headline: `Review: ${lesson.title}`,
      detail: `Best quiz score is ${progress.bestScore}%. Improve it beyond ${passThreshold}% to master the topic.`,
      ctaLabel: 'Review Lesson',
    };
  }

  return {
    kind: 'all-complete',
    headline: 'All Modules Completed',
    detail: 'Great work. You have completed all currently unlocked modules.',
    ctaLabel: 'Refresh Lessons',
  };
}
