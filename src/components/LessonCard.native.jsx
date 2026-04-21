import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { getThemePalette } from '../utils/themePalette';

export default function LessonCardNative({ lesson, onPress }) {
  const { title, description, duration, timeSpent, progress } = lesson;
  const { colors, isDarkMode } = useAppTheme();
  const palette = useMemo(() => getThemePalette(colors, isDarkMode), [colors, isDarkMode]);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);
  const cta = progress > 0 && progress < 100 ? 'Continue' : progress === 100 ? 'Review' : 'Start';
  return (
    <Pressable style={styles.card} onPress={() => onPress && onPress(lesson)}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{timeSpent}/{duration} min</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.cta}><Text style={styles.ctaText}>{cta}</Text></View>
    </Pressable>
  );
}

function createStyles(colors, palette) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    desc: {
      marginTop: 8,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    progressBar: {
      height: 8,
      backgroundColor: palette.progressTrack,
      borderRadius: 999,
      marginTop: 10,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    cta: {
      marginTop: 14,
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryStrong,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    ctaText: {
      color: colors.onStrong,
      fontWeight: '700',
    },
  });
}
