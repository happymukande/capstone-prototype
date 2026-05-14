import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import supabase, { hasSupabaseConfig } from '../lib/supabaseClient';
import { AppThemeColors } from '../src/constants/theme';
import { useAppTheme } from '../src/context/ThemeContext';
import {
    captureAndUploadAvatar,
    pickAndUploadAvatar,
    removeAvatar,
} from '../services/avatarService';
import {
    fetchCurrentUserProfile,
    UserProfile,
} from '../src/services/userProfiles';

export default function EditDetailsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [retryPhotoAction, setRetryPhotoAction] = useState<null | (() => Promise<void>)>(null);

  const avatarUrl = profile?.avatarUrl ?? null;
  const initials = username.slice(0, 2).toUpperCase() || 'U';

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setUsername(user.user_metadata?.username || '');
        setFullName(user.user_metadata?.full_name || '');
        setEmail(user.email || '');
        setPhoneNumber(user.user_metadata?.phone_number || '');

        const nextProfile = await fetchCurrentUserProfile(user.id);
        if (isMounted) setProfile(nextProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const runPhotoAction = async (action: () => Promise<string | null>, retryAction: () => Promise<void>) => {
    if (!user?.id || isPhotoBusy) return;
    setIsPhotoBusy(true);
    setPhotoError(null);
    setRetryPhotoAction(null);

    try {
      const nextAvatarUrl = await action();
      if (nextAvatarUrl) {
        setProfile((current) =>
          current ? { ...current, avatarUrl: nextAvatarUrl } : current
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setPhotoError(message);
      setRetryPhotoAction(() => retryAction);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const handlePickPhoto = async () => {
    await runPhotoAction(() => pickAndUploadAvatar(user!.id), handlePickPhoto);
  };

  const handleTakePhoto = async () => {
    await runPhotoAction(() => captureAndUploadAvatar(user!.id), handleTakePhoto);
  };

  const handleRemovePhoto = async () => {
    if (!user?.id || isPhotoBusy) return;
    
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsPhotoBusy(true);
            setPhotoError(null);
            setRetryPhotoAction(null);
            try {
              await removeAvatar(user.id);
              setProfile((current) =>
                current ? { ...current, avatarUrl: null } : current
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Please try again.';
              setPhotoError(message);
              setRetryPhotoAction(() => handleRemovePhoto);
            } finally {
              setIsPhotoBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (isSaving || !user || !hasSupabaseConfig || !supabase) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim(),
        },
      });

      if (error) {
        console.error('Error updating user:', error);
        Alert.alert('Error', 'Failed to save changes');
      } else {
        Alert.alert('Success', 'Changes saved!');
        router.back();
      }
    } catch (err) {
      console.error('Unexpected error updating user:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textPrimary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>Edit Details</Text>
        <Text style={styles.subtitle}>
          Update your personal information, profile photo, and contact details.
        </Text>
      </View>

      {/* Profile Photo Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Photo</Text>
        <View style={styles.photoSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={styles.photoActions}>
            {isPhotoBusy ? (
              <View style={styles.uploadStatus}>
                <ActivityIndicator color={colors.primaryStrong} />
                <Text style={styles.uploadStatusText}>Updating photo...</Text>
              </View>
            ) : null}
            <Pressable
              style={styles.photoButton}
              onPress={handlePickPhoto}
              disabled={isPhotoBusy}
            >
              <Text style={styles.photoButtonText}>
                {isPhotoBusy ? 'Saving...' : 'Upload'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.photoButton}
              onPress={handleTakePhoto}
              disabled={isPhotoBusy}
            >
              <Text style={styles.photoButtonText}>Camera</Text>
            </Pressable>
            <Pressable
              style={[styles.photoButton, styles.deletePhotoButton]}
              onPress={handleRemovePhoto}
              disabled={isPhotoBusy || !avatarUrl}
            >
              <Text style={[styles.photoButtonText, styles.deletePhotoText]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
        {photoError ? (
          <View style={styles.photoErrorBox}>
            <Text style={styles.photoErrorText}>{photoError}</Text>
            {retryPhotoAction ? (
              <Pressable style={styles.retryButton} onPress={() => void retryPhotoAction()} disabled={isPhotoBusy}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Personal Information Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.formRow}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            editable={!isSaving}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            editable={!isSaving}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            editable={false}
            placeholder="Email cannot be changed here"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, styles.disabledInput]}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            style={styles.input}
            editable={!isSaving}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
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
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 14,
    },
    
    // Photo Section
    photoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    avatar: {
      width: 78,
      height: 78,
      borderRadius: 39,
      borderWidth: 1,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarInitials: {
      color: colors.primaryStrong,
      fontSize: 24,
      fontWeight: '800',
    },
    photoActions: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    uploadStatus: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    uploadStatusText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    photoButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    photoButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    deletePhotoButton: {
      borderColor: colors.danger,
    },
    deletePhotoText: {
      color: colors.danger,
    },
    photoErrorBox: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      padding: 12,
      gap: 10,
    },
    photoErrorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
    },
    retryButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    retryButtonText: {
      color: colors.onStrong,
      fontSize: 12,
      fontWeight: '800',
    },
    
    // Form Section
    formRow: {
      marginBottom: 16,
    },
    label: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
    },
    disabledInput: {
      opacity: 0.6,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.onStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.65,
    },
  });
}
