import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeColors } from '../../src/constants/theme';
import { useCurriculum } from '../../src/hooks/useCurriculum';
import { useProgress } from '../../src/context/ProgressContext';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function TestYourKnowledgeScreen() {
  const router = useRouter();
  const { lessons, isLoading, error, refresh } = useCurriculum();
  const { isLessonUnlocked, getLessonProgress } = useProgress();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const challengeLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const unlocked = isLessonUnlocked(lesson.id);
        return unlocked && lesson.quizzes.length > 0;
      }),
    [lessons, isLessonUnlocked]
  );

  if (isLoading) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.centerText}>Loading quiz challenges...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorTitle}>Unable to load challenges</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Test Your Knowledge</Text>
        <Text style={styles.subtitle}>Game-based challenge quizzes to earn XP, extend streaks, and complete quests.</Text>
      </View>

      {challengeLessons.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No unlocked quiz challenges yet.</Text>
          <Text style={styles.cardText}>Complete earlier lessons to unlock your next challenge node.</Text>
        </View>
      )}

      {challengeLessons.map((lesson) => {
        const progress = getLessonProgress(lesson.id);
        return (
          <View key={lesson.id} style={styles.card}>
            <Text style={styles.cardTitle}>{lesson.title}</Text>
            <Text style={styles.cardText}>{lesson.description}</Text>
            <Text style={styles.metaText}>
              Best score: {progress.bestScore}% | Attempts: {progress.quizAttempts}
            </Text>
            <Pressable
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: lesson.id } })}
            >
              <Text style={styles.actionBtnText}>Start Challenge Quiz</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    centerWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.screenBackground,
    },
    centerText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    errorTitle: {
      fontSize: 18,
      color: colors.textPrimary,
      fontWeight: '800',
      marginBottom: 8,
    },
    errorText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 20,
    },
    retryBtn: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    retryBtnText: {
      color: colors.onStrong,
      fontWeight: '700',
    },
    container: {
      padding: 20,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.onStrong,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.heroSubtle,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 12,
      fontWeight: '600',
    },
    actionBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    actionBtnText: {
      color: colors.onStrong,
      fontWeight: '700',
      fontSize: 14,
    },
  });
}
