import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DAILY_QUEST_DEFINITIONS } from '../../src/constants/gamification';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCurriculum } from '../../src/hooks/useCurriculum';
import { QuizRewardSummary } from '../../src/types/gamification';
import { ThemePalette, getThemePalette } from '../../src/utils/themePalette';

export default function QuizPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isHydrated, recordQuizAttempt } = useProgress();
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);
  const {
    lessons,
    isLoading: isCurriculumLoading,
    error: curriculumError,
    refresh: refreshCurriculum,
  } = useCurriculum();

  const lesson = useMemo(() => lessons.find((item) => item.id === lessonId), [lessons, lessonId]);

  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalPercent, setFinalPercent] = useState(0);
  const [rewardSummary, setRewardSummary] = useState<QuizRewardSummary | null>(null);

  if (!isHydrated || isCurriculumLoading) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>{!isHydrated ? 'Loading progress...' : 'Loading quiz...'}</Text>
      </View>
    );
  }

  if (curriculumError) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.errorTitle}>Unable to load quiz.</Text>
        <Text style={styles.errorText}>{curriculumError}</Text>
        <Pressable style={styles.primaryButton} onPress={refreshCurriculum}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>Lesson not found.</Text>
      </View>
    );
  }

  const quizzes = lesson.quizzes || [];

  const handleSelect = (choice: number) => {
    setUserChoice(choice);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    const current = quizzes[qIndex];
    const answeredCorrect = userChoice === current.answer;
    const nextCorrect = answeredCorrect ? correct + 1 : correct;

    if (qIndex + 1 < quizzes.length) {
      setCorrect(nextCorrect);
      setQIndex((index) => index + 1);
      setShowFeedback(false);
      setUserChoice(null);
      return;
    }

    const scorePct = Math.round((nextCorrect / quizzes.length) * 100);
    setCorrect(nextCorrect);
    setFinalPercent(scorePct);
    const reward = recordQuizAttempt(lesson.id, scorePct);
    setRewardSummary(reward);
    setQuizComplete(true);
  };

  if (quizComplete) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Quiz Complete</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scorePct}>{finalPercent}%</Text>
            <Text style={styles.scoreText}>Final Score</Text>
          </View>
          <Text style={styles.resultText}>
            {finalPercent >= 80
              ? 'Strong result. You are ready for the next module.'
              : finalPercent >= 60
              ? 'Good attempt. Review key notes before moving on.'
              : 'Needs improvement. Revisit the module and retake the quiz.'}
          </Text>
          {rewardSummary && (
            <View style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>Rewards</Text>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Quiz XP</Text>
                <Text style={styles.rewardValue}>+{rewardSummary.quizXpAwarded}</Text>
              </View>
              {rewardSummary.questXpAwarded > 0 && (
                <View style={styles.rewardRow}>
                  <Text style={styles.rewardLabel}>Quest bonus XP</Text>
                  <Text style={styles.rewardValue}>+{rewardSummary.questXpAwarded}</Text>
                </View>
              )}
              <View style={styles.rewardRow}>
                <Text style={styles.rewardTotalLabel}>Total XP</Text>
                <Text style={styles.rewardTotalValue}>+{rewardSummary.totalXpAwarded}</Text>
              </View>
              <Text style={styles.metaRewardText}>
                Streak: {rewardSummary.streakDays} day{rewardSummary.streakDays === 1 ? '' : 's'} | Level{' '}
                {rewardSummary.level}
              </Text>
              {rewardSummary.leveledUp && <Text style={styles.levelUpText}>Level up unlocked.</Text>}
              {rewardSummary.completedQuestIds.length > 0 && (
                <View style={styles.questRewardWrap}>
                  <Text style={styles.questRewardTitle}>Daily challenges completed</Text>
                  {rewardSummary.completedQuestIds.map((questId) => {
                    const quest = DAILY_QUEST_DEFINITIONS.find((item) => item.id === questId);
                    return (
                      <Text key={questId} style={styles.questRewardItem}>
                        + {quest?.title ?? questId}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.primaryButtonText}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (quizzes.length === 0) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>No quiz is configured for this module.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Quiz: {lesson.title}</Text>
        <Text style={styles.progressText}>
          Question {qIndex + 1} of {quizzes.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((qIndex + 1) / quizzes.length) * 100}%` }]} />
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.question}>{quizzes[qIndex].question}</Text>
        {quizzes[qIndex].options.map((option: string, index: number) => {
          const isSelected = userChoice === index;
          const isCorrect = index === quizzes[qIndex].answer;

          let optionStyle: StyleProp<ViewStyle> = styles.option;
          if (showFeedback) {
            if (isSelected && isCorrect) optionStyle = [styles.option, styles.optionCorrect];
            else if (isSelected && !isCorrect) optionStyle = [styles.option, styles.optionWrong];
            else if (!isSelected && isCorrect) optionStyle = [styles.option, styles.optionCorrect];
          }

          return (
            <Pressable
              key={index}
              style={optionStyle}
              onPress={() => !showFeedback && handleSelect(index)}
              disabled={showFeedback}
            >
              <Text style={showFeedback && isSelected ? styles.optionTextHighlight : styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}

        {showFeedback && (
          <View
            style={[
              styles.feedback,
              userChoice === quizzes[qIndex].answer ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            <Text style={styles.feedbackLabel}>
              {userChoice === quizzes[qIndex].answer ? 'Correct' : 'Incorrect'}
            </Text>
            <Text style={styles.feedbackExplanation}>{quizzes[qIndex].explanation}</Text>
            <Pressable style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>
                {qIndex + 1 === quizzes.length ? 'View Results' : 'Next Question'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors, palette: ThemePalette) {
  return StyleSheet.create({
    fallbackWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.screenBackground,
    },
    fallbackText: {
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
      marginBottom: 16,
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    container: {
      padding: 20,
      flexGrow: 1,
      backgroundColor: colors.screenBackground,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 8,
      color: colors.onStrong,
    },
    progressText: {
      fontSize: 14,
      color: colors.heroSubtle,
      lineHeight: 20,
    },
    progressBar: {
      height: 8,
      backgroundColor: palette.progressTrack,
      borderRadius: 999,
      marginBottom: 20,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    questionCard: {
      backgroundColor: colors.surface,
      padding: 18,
      borderRadius: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    question: {
      fontWeight: '800',
      fontSize: 18,
      marginBottom: 18,
      color: colors.textPrimary,
      lineHeight: 24,
    },
    option: {
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginTop: 10,
      backgroundColor: palette.mutedSurface,
    },
    optionCorrect: {
      borderColor: colors.success,
      backgroundColor: palette.successSoft,
    },
    optionWrong: {
      borderColor: colors.danger,
      backgroundColor: palette.dangerSoft,
    },
    optionText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    optionTextHighlight: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    feedback: {
      marginTop: 18,
      padding: 16,
      borderRadius: 16,
      borderLeftWidth: 4,
    },
    feedbackCorrect: {
      backgroundColor: palette.successSoft,
      borderLeftColor: colors.success,
    },
    feedbackWrong: {
      backgroundColor: palette.dangerSoft,
      borderLeftColor: colors.danger,
    },
    feedbackLabel: {
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 8,
      color: colors.textPrimary,
    },
    feedbackExplanation: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 20,
    },
    primaryButton: {
      backgroundColor: colors.primaryStrong,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.onStrong,
      fontWeight: '700',
      fontSize: 15,
    },
    completionCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 22,
      marginTop: 12,
      marginBottom: 24,
    },
    completionTitle: {
      fontSize: 30,
      fontWeight: '800',
      marginBottom: 24,
      color: colors.textPrimary,
    },
    scoreBox: {
      alignItems: 'center',
      marginBottom: 24,
      width: '100%',
      backgroundColor: palette.infoSoft,
      borderRadius: 18,
      paddingVertical: 18,
    },
    scorePct: {
      fontSize: 64,
      fontWeight: '800',
      color: colors.primary,
    },
    scoreText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 8,
    },
    resultText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    rewardCard: {
      width: '100%',
      backgroundColor: palette.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 22,
    },
    rewardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    rewardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 12,
    },
    rewardLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    rewardValue: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    rewardTotalLabel: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    rewardTotalValue: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    metaRewardText: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
      lineHeight: 18,
    },
    levelUpText: {
      marginTop: 6,
      fontSize: 12,
      color: colors.success,
      fontWeight: '700',
    },
    questRewardWrap: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    questRewardTitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    questRewardItem: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: 4,
    },
  });
}
