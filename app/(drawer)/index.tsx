import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useCurriculum } from '../../src/hooks/useCurriculum';
import { getLessonRecommendation } from '../../src/services/recommendation';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { progressMap, isHydrated, isLessonUnlocked } = useProgress();
  const { lessons, isLoading: isCurriculumLoading } = useCurriculum();

  const recommendation = useMemo(
    () => getLessonRecommendation(lessons, progressMap, isLessonUnlocked),
    [lessons, progressMap, isLessonUnlocked]
  );

  const completedLessons = lessons.filter((lesson) => progressMap[lesson.id]?.completed).length;
  const publishedLessonCount = lessons.filter((lesson) => lesson.status === 'published').length;

  const handleExploreEnergyTips = () => {
    if (recommendation.lessonId) {
      router.push({ pathname: '/lesson/[id]', params: { id: recommendation.lessonId } });
      return;
    }
    router.push('/courses');
  };

  if (!isHydrated || isCurriculumLoading) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.centerText}>{!isHydrated ? 'Loading progress...' : 'Loading home...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Energy Learning</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Keep it simple: learn one practical energy-saving habit and move forward with confidence.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today&apos;s Focus</Text>
        <Text style={styles.cardText}>{recommendation.detail}</Text>
        <Text style={styles.metaText}>
          {publishedLessonCount > 0
            ? `${completedLessons} of ${publishedLessonCount} published lessons completed.`
            : 'Published lessons will appear here as soon as they are ready.'}
        </Text>
      </View>

      <View style={styles.actionStack}>
        <Pressable style={styles.primaryBtn} onPress={handleExploreEnergyTips}>
          <Text style={styles.primaryBtnText}>Explore Energy Tips</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/courses')}>
          <Text style={styles.secondaryBtnText}>View Dashboard</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    centerWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.screenBackground,
    },
    centerText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    container: {
      padding: 20,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
      justifyContent: 'center',
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: 18,
      padding: 22,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eyebrow: {
      color: colors.heroEyebrow,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      color: colors.onStrong,
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 8,
    },
    subtitle: {
      color: colors.heroSubtle,
      fontSize: 14,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      color: colors.textPrimary,
      fontWeight: '800',
      marginBottom: 10,
    },
    cardText: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 22,
    },
    metaText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    actionStack: {
      gap: 12,
    },
    primaryBtn: {
      alignItems: 'center',
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    primaryBtnText: {
      color: colors.onStrong,
      fontWeight: '700',
      fontSize: 15,
    },
    secondaryBtn: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
