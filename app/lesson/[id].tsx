import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCurriculum } from '../../src/hooks/useCurriculum';
import { ThemePalette, getThemePalette } from '../../src/utils/themePalette';

type Step = {
  type: 'note' | 'quiz';
  content: string;
};

export default function LessonPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isHydrated, isLessonUnlocked, markLessonStarted, getLessonProgress } = useProgress();
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);
  const {
    lessons,
    isLoading: isCurriculumLoading,
    error: curriculumError,
    refresh: refreshCurriculum,
  } = useCurriculum();
  const [step, setStep] = useState(0);

  const lesson = useMemo(() => lessons.find((item) => item.id === lessonId), [lessons, lessonId]);
  const lessonProgress = lessonId ? getLessonProgress(lessonId) : null;

  useEffect(() => {
    if (!lessonId || !lesson) return;
    markLessonStarted(lessonId);
  }, [lessonId, lesson, markLessonStarted]);

  if (!isHydrated || isCurriculumLoading) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>{!isHydrated ? 'Loading progress...' : 'Loading lesson...'}</Text>
      </View>
    );
  }

  if (curriculumError) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.errorTitle}>Unable to load lesson.</Text>
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

  const isUnlocked = isLessonUnlocked(lesson.id);

  if (!isUnlocked) {
    const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
    const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;

    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Module Locked</Text>
          <Text style={styles.lockedDesc}>Complete the previous module to unlock this content.</Text>
          {prevLesson && <Text style={styles.prevLessonText}>Required: {prevLesson.title}</Text>}
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const noteSteps: Step[] = (lesson.lectureNotes || []).map(
    (note: string): Step => ({ type: 'note', content: note })
  );

  const allSteps: Step[] = [...noteSteps, { type: 'quiz', content: 'Checkpoint quiz' }];
  const isLastStep = step === allSteps.length - 1;
  const isQuizStep = allSteps[step]?.type === 'quiz';
  const progressWidth = `${((step + 1) / allSteps.length) * 100}%` as const;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.moduleLabel}>Module</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.stepIndicator}>
          Step {step + 1} of {allSteps.length}
        </Text>
        <Text style={styles.metaText}>
          Attempts: {lessonProgress?.quizAttempts ?? 0} | Best Score: {lessonProgress?.bestScore ?? 0}%
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.contentCard}>
        {isQuizStep ? (
          <View style={styles.quizPrompt}>
            <Text style={styles.quizTitle}>Ready for your checkpoint?</Text>
            <Text style={styles.quizDesc}>Take the quiz to score this module and unlock progression.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: lesson.id } })}
            >
              <Text style={styles.primaryButtonText}>Start Quiz</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.noteTitle}>Lecture Note</Text>
            <Text style={styles.noteText}>{allSteps[step]?.content}</Text>
          </View>
        )}
      </View>

      <View style={styles.navigation}>
        <Pressable
          style={[styles.secondaryButton, step === 0 && styles.disabledButton]}
          onPress={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <Text style={[styles.secondaryButtonText, step === 0 && styles.disabledButtonText]}>Previous</Text>
        </Pressable>

        {!isLastStep && (
          <Pressable style={styles.primaryButton} onPress={() => setStep(Math.min(allSteps.length - 1, step + 1))}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
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
    lockedContainer: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: colors.screenBackground,
    },
    lockedBox: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lockedTitle: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 12,
      color: colors.textPrimary,
    },
    lockedDesc: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
      lineHeight: 22,
    },
    prevLessonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: 24,
      textAlign: 'center',
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
    moduleLabel: {
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
      marginBottom: 8,
      color: colors.onStrong,
    },
    stepIndicator: {
      fontSize: 14,
      color: colors.heroSubtle,
      marginBottom: 6,
    },
    metaText: {
      fontSize: 13,
      color: colors.heroSubtle,
      fontWeight: '600',
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
    contentCard: {
      minHeight: 260,
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quizPrompt: {
      alignItems: 'flex-start',
    },
    quizTitle: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 12,
      color: colors.textPrimary,
    },
    quizDesc: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 18,
      lineHeight: 22,
    },
    noteTitle: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 10,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    noteText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    primaryButton: {
      flex: 1,
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
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    disabledButton: {
      backgroundColor: palette.neutralSoft,
      borderColor: colors.border,
    },
    disabledButtonText: {
      color: palette.lockedText,
    },
  });
}
