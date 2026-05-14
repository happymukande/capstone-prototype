import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';
import {
  fetchAdminUserProfiles,
  getDaysActive,
  isUserOnline,
  touchCurrentUserActivity,
  UserProfile,
} from '../../src/services/userProfiles';
import { useAuth } from '../../context/AuthProvider';

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfiles = useCallback(async () => {
    setError('');
    try {
      await touchCurrentUserActivity(user?.id);
      const nextProfiles = await fetchAdminUserProfiles();
      setProfiles(nextProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const onlineCount = profiles.filter((profile) => isUserOnline(profile.lastActiveAt)).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadProfiles} tintColor={colors.primary} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Review user roles, activity, and online status.</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{profiles.length}</Text>
          <Text style={styles.summaryLabel}>Users</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{onlineCount}</Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current User Accounts</Text>
        {isLoading && profiles.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.metaText}>Loading users...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!isLoading && profiles.length === 0 && !error ? <Text style={styles.metaText}>No users found.</Text> : null}

        {profiles.map((profile) => {
          const online = isUserOnline(profile.lastActiveAt);
          return (
            <View key={profile.userId} style={styles.userRow}>
              <View style={styles.userTopLine}>
                <View style={styles.nameWrap}>
                  <View style={[styles.statusDot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
                  <Text style={styles.username}>{profile.username}</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{profile.role}</Text>
                </View>
              </View>
              <View style={styles.userMetaRow}>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text style={styles.metaText}>{getDaysActive(profile.createdAt)} days active</Text>
              </View>
              <Text style={styles.metaText}>
                Last active: {profile.lastActiveAt ? new Date(profile.lastActiveAt).toLocaleString() : 'Not recorded'}
              </Text>
              <Text style={styles.metaText}>{online ? 'Online now' : 'Offline'}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
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
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
    },
    summaryValue: {
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: '800',
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 12,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    userRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 14,
      gap: 6,
    },
    userTopLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    username: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    rolePill: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    roleText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    userMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 8,
    },
  });
}
