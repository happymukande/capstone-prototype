import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';

const COMMUNITY_ITEMS = [
  {
    title: 'Weekly Challenge Boards',
    detail: 'Compete in themed conservation quiz events with your class or community.',
  },
  {
    title: 'Discussion Threads',
    detail: 'Share tips, ask questions, and celebrate streak milestones with peers.',
  },
  {
    title: 'Team Quests',
    detail: 'Join group goals where XP is combined to unlock shared badges.',
  },
];

export default function CommunityScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Connect</Text>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>Social learning features are planned and can be enabled in phases.</Text>
      </View>

      {COMMUNITY_ITEMS.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDetail}>{item.detail}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.screenBackground,
      flexGrow: 1,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 14,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.heroEyebrow,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
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
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
}
