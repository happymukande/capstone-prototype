import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';

const FUTURE_PROFILE_FIELDS = ['Name and email from auth', 'XP and level from progress data', 'Achievements and learner history'];

export default function ProfileScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Simple for now</Text>
        <Text style={styles.subtitle}>
          This page stays intentionally minimal until backend profile data is fully connected.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Access</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{role}</Text>
        </View>
        <Text style={styles.bodyText}>
          We&apos;re only showing the active app role here to keep the screen clean and predictable.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Planned Backend Profile Data</Text>
        <Text style={styles.bodyText}>
          Once backend integration is ready, this screen can display real user information instead of temporary values.
        </Text>
        {FUTURE_PROFILE_FIELDS.map((item) => (
          <View key={item} style={styles.listRow}>
            <View style={styles.listDot} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
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
      marginBottom: 16,
    },
    eyebrow: {
      alignSelf: 'flex-start',
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    rolePill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    rolePillText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    bodyText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 12,
    },
    listDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
      marginTop: 7,
    },
    listText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
}
