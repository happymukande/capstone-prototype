import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCurriculum } from '../../src/hooks/useCurriculum';
import { getLessonRecommendation } from '../../src/services/recommendation';
import { ThemePalette, getThemePalette } from '../../src/utils/themePalette';

type RecommendationPresentation = {
  accent: string;
  buttonTextColor: string;
};

type LessonStatusPresentation = {
  badgeBackground: string;
  badgeText: string;
  progressFill: string;
};

function getRecommendationPresentation(kind: string, colors: AppThemeColors): RecommendationPresentation {
  switch (kind) {
    case 'resume':
      return { accent: colors.primary, buttonTextColor: colors.onPrimary };
    case 'start':
      return { accent: colors.primaryStrong, buttonTextColor: colors.onStrong };
    case 'review':
      return { accent: colors.warning, buttonTextColor: colors.textPrimary };
    case 'all-complete':
      return { accent: colors.success, buttonTextColor: colors.onPrimary };
    default:
      return { accent: colors.surfaceAlt, buttonTextColor: colors.textPrimary };
  }
}

function getLessonStatusPresentation(
  progress: number,
  isUnlocked: boolean,
  colors: AppThemeColors,
  palette: ThemePalette
): LessonStatusPresentation {
  if (!isUnlocked) {
    return {
      badgeBackground: palette.neutralSoft,
      badgeText: palette.lockedText,
      progressFill: palette.lockedText,
    };
  }

  if (progress >= 80) {
    return {
      badgeBackground: colors.success,
      badgeText: colors.onPrimary,
      progressFill: colors.success,
    };
  }

  if (progress >= 50) {
    return {
      badgeBackground: colors.warning,
      badgeText: colors.textPrimary,
      progressFill: colors.warning,
    };
  }

  if (progress > 0) {
    return {
      badgeBackground: colors.primary,
      badgeText: colors.onPrimary,
      progressFill: colors.primary,
    };
  }

  return {
    badgeBackground: colors.info,
    badgeText: colors.onPrimary,
    progressFill: colors.info,
  };
}

export default function CoursesScreen() {
  const { role } = useRole();
  const {
    progressMap,
    gamification,
    dailyQuestStatus,
    levelProgress,
    isHydrated,
    isLessonUnlocked,
  } = useProgress();
  const {
    lessons,
    isLoading: isCurriculumLoading,
    error: curriculumError,
    refresh: refreshCurriculum,
  } = useCurriculum();
  const router = useRouter();
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);

  const recommendation = useMemo(
    () => getLessonRecommendation(lessons, progressMap, isLessonUnlocked),
    [lessons, progressMap, isLessonUnlocked]
  );

  const recommendationPresentation = getRecommendationPresentation(recommendation.kind, colors);
  const dailyGoalProgress = Math.min(
    100,
    Math.round((gamification.today.xpEarned / gamification.summary.dailyXpGoal) * 100)
  );

  const handleRecommendationAction = () => {
    if (recommendation.lessonId) {
      router.push({ pathname: '/lesson/[id]', params: { id: recommendation.lessonId } });
      return;
    }

    void refreshCurriculum();
  };

  if (!isHydrated || isCurriculumLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>{!isHydrated ? 'Loading progress...' : 'Loading lessons...'}</Text>
      </View>
    );
  }

  if (curriculumError) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorTitle}>Unable to load lessons.</Text>
        <Text style={styles.errorText}>{curriculumError}</Text>
        <Pressable style={styles.primaryAction} onPress={refreshCurriculum}>
          <Text style={styles.primaryActionText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Academy</Text>
        <Text style={styles.title}>Learning Dashboard</Text>
        <Text style={styles.subtitle}>Continue your pathway and unlock the next module.</Text>
        <View style={styles.heroActionRow}>
          {(role === 'teacher' || role === 'admin') && (
            <Pressable style={styles.primaryAction} onPress={() => router.push('/(drawer)/admin')}>
              <Text style={styles.primaryActionText}>Teacher Admin</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryAction} onPress={refreshCurriculum}>
            <Text style={styles.secondaryActionText}>Refresh Lessons</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.gamificationCard}>
        <Text style={styles.cardTitle}>Daily Progress</Text>
        <View style={styles.gamificationStatRow}>
          <View style={styles.gamificationStatItem}>
            <Text style={styles.gamificationStatLabel}>Level</Text>
            <Text style={styles.gamificationStatValue}>{levelProgress.level}</Text>
            <Text style={styles.gamificationStatHint}>
              {levelProgress.xpIntoLevel}/{levelProgress.xpForNextLevel} XP
            </Text>
          </View>
          <View style={styles.gamificationStatItem}>
            <Text style={styles.gamificationStatLabel}>Streak</Text>
            <Text style={styles.gamificationStatValue}>{gamification.summary.streakDays}</Text>
            <Text style={styles.gamificationStatHint}>Best: {gamification.summary.longestStreak} days</Text>
          </View>
          <View style={styles.gamificationStatItem}>
            <Text style={styles.gamificationStatLabel}>XP Today</Text>
            <Text style={styles.gamificationStatValue}>{gamification.today.xpEarned}</Text>
            <Text style={styles.gamificationStatHint}>{dailyGoalProgress}% of goal</Text>
          </View>
        </View>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${levelProgress.progressPct}%` }]} />
        </View>
      </View>

      <View style={styles.questCard}>
        <Text style={styles.cardTitle}>Daily Challenges</Text>
        {dailyQuestStatus.map((quest) => {
          const progressPct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
          const questFillColor = quest.completed ? colors.success : colors.primary;

          return (
            <View key={quest.id} style={styles.questItem}>
              <View style={styles.questHeader}>
                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={[styles.questProgressText, quest.completed && styles.questProgressTextComplete]}>
                  {quest.progress}/{quest.target}
                </Text>
              </View>
              <Text style={styles.questDescription}>{quest.description}</Text>
              <View style={styles.questTrack}>
                <View
                  style={[
                    styles.questFill,
                    {
                      width: `${progressPct}%`,
                      backgroundColor: questFillColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.recommendCard, { borderLeftColor: recommendationPresentation.accent }]}>
        <Text style={[styles.recommendEyebrow, { color: recommendationPresentation.accent }]}>Suggested Next Step</Text>
        <Text style={styles.recommendTitle}>{recommendation.headline}</Text>
        <Text style={styles.recommendText}>{recommendation.detail}</Text>
        <Pressable
          style={[styles.recommendBtn, { backgroundColor: recommendationPresentation.accent }]}
          onPress={handleRecommendationAction}
        >
          <Text style={[styles.recommendBtnText, { color: recommendationPresentation.buttonTextColor }]}>
            {recommendation.ctaLabel}
          </Text>
        </Pressable>
      </View>

      {lessons.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>No published modules yet.</Text>
          <Text style={styles.emptyText}>Publish at least one lesson in the backend to populate this dashboard.</Text>
        </View>
      )}

      {lessons.map((lesson, index) => {
        const lessonProgress = progressMap[lesson.id];
        const progress = lessonProgress?.progress ?? 0;
        const isCompleted = lessonProgress?.completed ?? false;
        const isStarted = lessonProgress?.started ?? progress > 0;
        const isUnlocked = isLessonUnlocked(lesson.id);
        const statusPresentation = getLessonStatusPresentation(progress, isUnlocked, colors, palette);

        return (
          <Pressable
            key={lesson.id}
            style={[
              styles.lessonCard,
              isCompleted && styles.lessonCardCompleted,
              !isUnlocked && styles.lessonCardLocked,
            ]}
            onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonNumber}>Module {index + 1}</Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDesc}>{lesson.description}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusPresentation.badgeBackground }]}>
                <Text style={[styles.badgeText, { color: statusPresentation.badgeText }]}>
                  {isUnlocked ? `${progress}%` : 'LOCK'}
                </Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: statusPresentation.progressFill },
                ]}
              />
            </View>

            {!isUnlocked && <Text style={styles.lockedLabel}>Locked: complete previous module</Text>}
            {isCompleted && <Text style={styles.completedLabel}>Completed</Text>}
            {!isCompleted && isStarted && isUnlocked && <Text style={styles.inProgressLabel}>In Progress</Text>}
            {!isStarted && isUnlocked && <Text style={styles.notStartedLabel}>Not Started</Text>}
          </Pressable>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap a module to view notes and launch the checkpoint quiz.</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors, palette: ThemePalette) {
  return StyleSheet.create({
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.screenBackground,
      padding: 24,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
      lineHeight: 20,
    },
    container: {
      padding: 20,
      paddingTop: 24,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 16,
    },
    eyebrow: {
      fontSize: 12,
      color: colors.heroEyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.onStrong,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.heroSubtle,
      lineHeight: 22,
    },
    heroActionRow: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    primaryAction: {
      backgroundColor: colors.primaryStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
    },
    primaryActionText: {
      color: colors.onStrong,
      fontSize: 14,
      fontWeight: '700',
    },
    secondaryAction: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
    },
    secondaryActionText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    gamificationCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    gamificationStatRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    gamificationStatItem: {
      flexBasis: '31%',
      flexGrow: 1,
      backgroundColor: palette.mutedSurface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    gamificationStatLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      color: colors.textMuted,
      fontWeight: '700',
      marginBottom: 6,
      letterSpacing: 0.6,
    },
    gamificationStatValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    gamificationStatHint: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    levelTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: palette.progressTrack,
      overflow: 'hidden',
    },
    levelFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    questCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    questItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    questHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
      gap: 12,
    },
    questTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    questProgressText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '700',
    },
    questProgressTextComplete: {
      color: colors.success,
    },
    questDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    questTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: palette.progressTrack,
      overflow: 'hidden',
    },
    questFill: {
      height: '100%',
    },
    recommendCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      marginBottom: 14,
    },
    recommendEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 6,
      letterSpacing: 0.6,
    },
    recommendTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    recommendText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    recommendBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
    },
    recommendBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    lessonCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lessonCardCompleted: {
      borderLeftColor: colors.success,
      backgroundColor: palette.successSoft,
    },
    lessonCardLocked: {
      borderLeftColor: palette.lockedText,
      backgroundColor: palette.lockedSurface,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 12,
    },
    lessonInfo: {
      flex: 1,
    },
    lessonNumber: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    lessonTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    lessonDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    badge: {
      minWidth: 64,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    progressBar: {
      height: 6,
      backgroundColor: palette.progressTrack,
      borderRadius: 999,
      marginBottom: 10,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
    },
    lockedLabel: {
      fontSize: 12,
      color: palette.lockedText,
      fontWeight: '700',
    },
    completedLabel: {
      fontSize: 12,
      color: colors.success,
      fontWeight: '700',
    },
    inProgressLabel: {
      fontSize: 12,
      color: colors.warning,
      fontWeight: '700',
    },
    notStartedLabel: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
    },
    footer: {
      marginTop: 28,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
