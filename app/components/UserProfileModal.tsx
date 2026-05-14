import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppThemeColors } from '../../src/constants/theme';

export interface UserProfileModalProps {
  visible: boolean;
  user: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    streak: number;
    isOnline: boolean;
  } | null;
  colors: AppThemeColors;
  onClose: () => void;
}

export default function UserProfileModal({
  visible,
  user,
  colors,
  onClose,
}: UserProfileModalProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>

            {/* Avatar with Online Indicator */}
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
              <View
                style={[
                  styles.onlineIndicator,
                  { backgroundColor: user.isOnline ? colors.success : colors.textMuted },
                ]}
              />
            </View>

            {/* Username */}
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.statusText}>
              {user.isOnline ? '🟢 Online' : '⚪ Offline'}
            </Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.xp}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user.streak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>

            {/* Close action button */}
            <Pressable style={styles.closeActionButton} onPress={onClose}>
              <Text style={styles.closeActionButtonText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      width: '85%',
      maxWidth: 320,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    closeButtonText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    avatarContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: colors.primaryStrong,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarInitials: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.primaryStrong,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    username: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 20,
    },
    statsContainer: {
      flexDirection: 'row',
      width: '100%',
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primaryStrong,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    closeActionButton: {
      width: '100%',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primaryStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeActionButtonText: {
      color: colors.onStrong,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
