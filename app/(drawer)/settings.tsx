import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeColors } from '../../src/constants/theme';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { signOut } from '../../services/authService';

export default function SettingsScreen() {
  const router = useRouter();
  const { role } = useRole();
  const { colors, mode, isDarkMode, toggleDarkMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
    router.replace('/login');
  };

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
        <View style={styles.themeRow}>
          <View style={styles.themeTextWrap}>
            <Text style={styles.themeLabel}>{role}</Text>
            <Text style={styles.metaText}>Your role is set when you create your account.</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable style={styles.editDetailsButton} onPress={() => router.push('/edit-details')}>
          <Text style={styles.editDetailsButtonText}>Edit user details</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
          <Text style={styles.signOutButtonText}>{isSigningOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
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
    editDetailsButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    editDetailsButtonText: {
      color: colors.onStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    signOutButton: {
      backgroundColor: colors.danger,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    signOutButtonText: {
      fontSize: 15,
      fontWeight: '700',
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
