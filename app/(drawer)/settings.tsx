import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';
import { AppRole, useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useProgress } from '../../src/context/ProgressContext';
import { isBackendDisabled } from '../../src/lib/supabase';

const ROLE_OPTIONS: AppRole[] = ['student', 'teacher', 'admin'];

export default function SettingsScreen() {
  const { role, setRole } = useRole();
  const { colors, mode, isDarkMode, toggleDarkMode } = useAppTheme();
  const { cloudUserId } = useProgress();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Preferences</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Keep your workspace calm, focused, and energy-aware.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeRow}>
          <View style={styles.themeTextWrap}>
            <Text style={styles.themeLabel}>Dark mode</Text>
            <Text style={styles.metaText}>Current mode: {mode}</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isDarkMode ? colors.onPrimary : colors.surface}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Role</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((candidateRole) => {
            const selected = role === candidateRole;
            return (
              <Pressable
                key={candidateRole}
                style={[styles.roleButton, selected && styles.roleButtonActive]}
                onPress={() => setRole(candidateRole)}
              >
                <Text style={[styles.roleButtonText, selected && styles.roleButtonTextActive]}>
                  {candidateRole}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Environment</Text>
        <Text style={styles.metaText}>
          APP ROLE ENV: {process.env.EXPO_PUBLIC_APP_ROLE ? process.env.EXPO_PUBLIC_APP_ROLE : 'Not set'}
        </Text>
        <Text style={styles.metaText}>Backend Disabled: {isBackendDisabled ? 'Yes' : 'No'}</Text>
        <Text style={styles.metaText}>Cloud User ID: {cloudUserId ?? 'Not resolved yet'}</Text>
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
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 22,
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
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
    sectionTitle: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginBottom: 10,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surfaceAlt,
    },
    themeTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    themeLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
      textTransform: 'capitalize',
    },
    roleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleButton: {
      minWidth: '31%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    roleButtonActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    roleButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      textTransform: 'capitalize',
      fontSize: 14,
    },
    roleButtonTextActive: {
      color: colors.onStrong,
    },
    metaText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 4,
    },
  });
}
