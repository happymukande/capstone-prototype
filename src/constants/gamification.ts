import { DailyQuestDefinition } from '../types/gamification';

export const XP_PER_LEVEL = 120;
export const DAILY_XP_GOAL = 120;

export const BASE_QUIZ_XP = 20;
export const SCORE_XP_MULTIPLIER = 0.5;
export const PASS_SCORE_BONUS_XP = 10;
export const PERFECT_SCORE_BONUS_XP = 15;

export const DAILY_QUEST_DEFINITIONS: DailyQuestDefinition[] = [
  {
    id: 'quiz-combo',
    title: 'Quiz Combo',
    description: 'Complete 2 quizzes today.',
    target: 2,
    rewardXp: 25,
    metric: 'quizzesCompleted',
  },
  {
    id: 'high-score',
    title: 'High Score',
    description: 'Score 80% or higher in 1 quiz.',
    target: 1,
    rewardXp: 30,
    metric: 'highScoreQuizzes',
  },
  {
    id: 'xp-collector',
    title: 'XP Collector',
    description: 'Earn 120 XP in one day.',
    target: 120,
    rewardXp: 40,
    metric: 'xpEarned',
  },
];
