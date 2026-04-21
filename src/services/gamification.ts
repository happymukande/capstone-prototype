import {
  BASE_QUIZ_XP,
  DAILY_QUEST_DEFINITIONS,
  DAILY_XP_GOAL,
  PASS_SCORE_BONUS_XP,
  PERFECT_SCORE_BONUS_XP,
  SCORE_XP_MULTIPLIER,
  XP_PER_LEVEL,
} from '../constants/gamification';
import { LESSON_PASS_THRESHOLD } from '../constants/progress';
import {
  DailyChallengeState,
  DailyQuestId,
  DailyQuestProgress,
  DailyQuestStatus,
  GamificationState,
  LevelProgress,
  QuizRewardSummary,
} from '../types/gamification';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type QuizXpBreakdown = Omit<
  QuizRewardSummary,
  'questXpAwarded' | 'totalXpAwarded' | 'completedQuestIds' | 'streakDays' | 'level' | 'leveledUp'
>;

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

function isDailyQuestId(value: unknown): value is DailyQuestId {
  return DAILY_QUEST_DEFINITIONS.some((quest) => quest.id === value);
}

function normalizeQuestProgress(raw: unknown): DailyQuestProgress[] {
  const parsed = Array.isArray(raw) ? raw : [];
  const byId = new Map<DailyQuestId, DailyQuestProgress>();

  for (const questValue of parsed) {
    if (!isRecord(questValue)) continue;
    const idValue = questValue.id;
    if (!isDailyQuestId(idValue)) continue;
    byId.set(idValue, {
      id: idValue,
      progress: clampNumber(Math.round(toSafeNumber(questValue.progress))),
      completed: Boolean(questValue.completed),
      rewardClaimed: Boolean(questValue.rewardClaimed),
      completedAt: typeof questValue.completedAt === 'string' ? questValue.completedAt : undefined,
    });
  }

  return DAILY_QUEST_DEFINITIONS.map((quest) => {
    const existing = byId.get(quest.id);
    if (!existing) {
      return {
        id: quest.id,
        progress: 0,
        completed: false,
        rewardClaimed: false,
      };
    }
    return existing;
  });
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDayDelta(previousDate: string, currentDate: string) {
  const previous = new Date(`${previousDate}T00:00:00`);
  const current = new Date(`${currentDate}T00:00:00`);
  if (Number.isNaN(previous.getTime()) || Number.isNaN(current.getTime())) return 0;
  return Math.floor((current.getTime() - previous.getTime()) / ONE_DAY_MS);
}

function createDailyQuestProgress(): DailyQuestProgress[] {
  return DAILY_QUEST_DEFINITIONS.map((quest) => ({
    id: quest.id,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  }));
}

function createDailyChallengeState(date: string): DailyChallengeState {
  return {
    date,
    xpEarned: 0,
    quizzesCompleted: 0,
    highScoreQuizzes: 0,
    quests: createDailyQuestProgress(),
  };
}

function computeQuizXpBreakdown(score: number): QuizXpBreakdown {
  const normalizedScore = clampNumber(Math.round(score), 0, 100);
  const scoreBonusXp = Math.round(normalizedScore * SCORE_XP_MULTIPLIER);
  const passBonusXp = normalizedScore >= LESSON_PASS_THRESHOLD ? PASS_SCORE_BONUS_XP : 0;
  const perfectBonusXp = normalizedScore === 100 ? PERFECT_SCORE_BONUS_XP : 0;
  const quizXpAwarded = BASE_QUIZ_XP + scoreBonusXp + passBonusXp + perfectBonusXp;

  return {
    baseXp: BASE_QUIZ_XP,
    scoreBonusXp,
    passBonusXp,
    perfectBonusXp,
    quizXpAwarded,
  };
}

function getQuestMetricValue(today: DailyChallengeState, metric: 'quizzesCompleted' | 'highScoreQuizzes' | 'xpEarned') {
  if (metric === 'quizzesCompleted') return today.quizzesCompleted;
  if (metric === 'highScoreQuizzes') return today.highScoreQuizzes;
  return today.xpEarned;
}

function getNextStreakDays(lastActivityDate: string | undefined, currentDate: string, currentStreakDays: number) {
  if (!lastActivityDate) return 1;
  if (lastActivityDate === currentDate) return Math.max(1, currentStreakDays);

  const dayDelta = normalizeDayDelta(lastActivityDate, currentDate);
  if (dayDelta === 1) return Math.max(1, currentStreakDays + 1);
  if (dayDelta > 1) return 1;
  return Math.max(1, currentStreakDays);
}

export function getTodayDateKey(now = new Date()) {
  return formatDateKey(now);
}

export function getLevelFromXp(totalXp: number) {
  const safeXp = clampNumber(Math.round(totalXp), 0);
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = clampNumber(Math.round(totalXp), 0);
  const level = getLevelFromXp(safeXp);
  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const xpIntoLevel = safeXp - currentLevelXp;
  const progressPct = Math.round(clampNumber((xpIntoLevel / XP_PER_LEVEL) * 100, 0, 100));

  return {
    level,
    totalXp: safeXp,
    currentLevelXp,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progressPct,
  };
}

export function createInitialGamificationState(date = getTodayDateKey()): GamificationState {
  return {
    summary: {
      totalXp: 0,
      level: 1,
      streakDays: 0,
      longestStreak: 0,
      lastActivityDate: undefined,
      dailyXpGoal: DAILY_XP_GOAL,
    },
    today: createDailyChallengeState(date),
  };
}

export function normalizeGamificationState(raw: unknown, date = getTodayDateKey()): GamificationState {
  const initial = createInitialGamificationState(date);
  if (!isRecord(raw)) return initial;

  const summaryValue = isRecord(raw.summary) ? raw.summary : {};
  const todayValue = isRecord(raw.today) ? raw.today : {};

  const totalXp = clampNumber(Math.round(toSafeNumber(summaryValue.totalXp, 0)), 0);
  const streakDays = clampNumber(Math.round(toSafeNumber(summaryValue.streakDays, 0)), 0);
  const longestStreak = clampNumber(
    Math.round(toSafeNumber(summaryValue.longestStreak, streakDays)),
    streakDays
  );
  const dailyXpGoal = clampNumber(Math.round(toSafeNumber(summaryValue.dailyXpGoal, DAILY_XP_GOAL)), 1);

  const todayDate = typeof todayValue.date === 'string' && todayValue.date ? todayValue.date : date;
  const normalizedToday: DailyChallengeState = {
    date: todayDate,
    xpEarned: clampNumber(Math.round(toSafeNumber(todayValue.xpEarned, 0)), 0),
    quizzesCompleted: clampNumber(Math.round(toSafeNumber(todayValue.quizzesCompleted, 0)), 0),
    highScoreQuizzes: clampNumber(Math.round(toSafeNumber(todayValue.highScoreQuizzes, 0)), 0),
    quests: normalizeQuestProgress(todayValue.quests),
  };

  return {
    summary: {
      totalXp,
      level: getLevelFromXp(totalXp),
      streakDays,
      longestStreak,
      lastActivityDate:
        typeof summaryValue.lastActivityDate === 'string' ? summaryValue.lastActivityDate : undefined,
      dailyXpGoal,
    },
    today: normalizedToday,
  };
}

export function ensureCurrentDailyState(gamification: GamificationState, date = getTodayDateKey()): GamificationState {
  if (gamification.today.date === date) return gamification;
  return {
    ...gamification,
    today: createDailyChallengeState(date),
  };
}

export function getDailyQuestStatus(gamification: GamificationState): DailyQuestStatus[] {
  const byId = new Map(gamification.today.quests.map((quest) => [quest.id, quest]));
  return DAILY_QUEST_DEFINITIONS.map((quest) => {
    const progress = byId.get(quest.id);
    return {
      ...quest,
      id: quest.id,
      progress: progress?.progress ?? 0,
      completed: progress?.completed ?? false,
      rewardClaimed: progress?.rewardClaimed ?? false,
      completedAt: progress?.completedAt,
    };
  });
}

export function applyQuizGamification(
  gamification: GamificationState,
  score: number,
  now = new Date()
): { gamification: GamificationState; reward: QuizRewardSummary } {
  const currentDate = getTodayDateKey(now);
  const timestamp = now.toISOString();
  const gamificationForToday = ensureCurrentDailyState(gamification, currentDate);
  const xp = computeQuizXpBreakdown(score);

  const today: DailyChallengeState = {
    ...gamificationForToday.today,
    xpEarned: gamificationForToday.today.xpEarned + xp.quizXpAwarded,
    quizzesCompleted: gamificationForToday.today.quizzesCompleted + 1,
    highScoreQuizzes:
      gamificationForToday.today.highScoreQuizzes + (score >= LESSON_PASS_THRESHOLD ? 1 : 0),
  };

  let questXpAwarded = 0;
  const completedQuestIds: DailyQuestId[] = [];
  const existingQuests = new Map(gamificationForToday.today.quests.map((quest) => [quest.id, quest]));
  const updatedQuests: DailyQuestProgress[] = DAILY_QUEST_DEFINITIONS.map((questDefinition) => {
    const existingQuest = existingQuests.get(questDefinition.id);
    const progress = clampNumber(
      getQuestMetricValue(today, questDefinition.metric),
      0,
      questDefinition.target
    );
    const completed = progress >= questDefinition.target;
    const rewardClaimed = existingQuest?.rewardClaimed ?? false;
    const shouldClaimReward = completed && !rewardClaimed;

    if (shouldClaimReward) {
      completedQuestIds.push(questDefinition.id);
      questXpAwarded += questDefinition.rewardXp;
    }

    return {
      id: questDefinition.id,
      progress,
      completed,
      rewardClaimed: rewardClaimed || shouldClaimReward,
      completedAt: shouldClaimReward ? timestamp : existingQuest?.completedAt,
    };
  });

  const previousLevel = gamificationForToday.summary.level;
  const streakDays = getNextStreakDays(
    gamificationForToday.summary.lastActivityDate,
    currentDate,
    gamificationForToday.summary.streakDays
  );
  const totalXpAwarded = xp.quizXpAwarded + questXpAwarded;
  const totalXp = gamificationForToday.summary.totalXp + totalXpAwarded;
  const level = getLevelFromXp(totalXp);

  const updatedGamification: GamificationState = {
    summary: {
      ...gamificationForToday.summary,
      totalXp,
      level,
      streakDays,
      longestStreak: Math.max(gamificationForToday.summary.longestStreak, streakDays),
      lastActivityDate: currentDate,
    },
    today: {
      ...today,
      quests: updatedQuests,
    },
  };

  return {
    gamification: updatedGamification,
    reward: {
      ...xp,
      questXpAwarded,
      totalXpAwarded,
      completedQuestIds,
      streakDays,
      level,
      leveledUp: level > previousLevel,
    },
  };
}
