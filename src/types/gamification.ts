export type DailyQuestId = 'quiz-combo' | 'high-score' | 'xp-collector';

export type DailyQuestMetric = 'quizzesCompleted' | 'highScoreQuizzes' | 'xpEarned';

export interface DailyQuestDefinition {
  id: DailyQuestId;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  metric: DailyQuestMetric;
}

export interface DailyQuestProgress {
  id: DailyQuestId;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  completedAt?: string;
}

export interface DailyChallengeState {
  date: string;
  xpEarned: number;
  quizzesCompleted: number;
  highScoreQuizzes: number;
  quests: DailyQuestProgress[];
}

export interface GamificationSummary {
  totalXp: number;
  level: number;
  streakDays: number;
  longestStreak: number;
  lastActivityDate?: string;
  dailyXpGoal: number;
}

export interface GamificationState {
  summary: GamificationSummary;
  today: DailyChallengeState;
}

export interface DailyQuestStatus extends DailyQuestDefinition, DailyQuestProgress {}

export interface LevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export interface QuizRewardSummary {
  baseXp: number;
  scoreBonusXp: number;
  passBonusXp: number;
  perfectBonusXp: number;
  quizXpAwarded: number;
  questXpAwarded: number;
  totalXpAwarded: number;
  completedQuestIds: DailyQuestId[];
  streakDays: number;
  level: number;
  leveledUp: boolean;
}
