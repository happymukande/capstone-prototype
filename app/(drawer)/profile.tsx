import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { AppThemeColors } from '../../src/constants/theme';
import { useProgress } from '../../src/context/ProgressContext';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import { LOCAL_CURRICULUM } from '../../src/data/localCurriculum';
import {
    fetchCurrentUserProfile,
    touchCurrentUserActivity,
    UserProfile,
} from '../../src/services/userProfiles';

type CurriculumCourse = {
  id: string;
  title: string;
  lessons?: {
    id: string;
    title?: string;
  }[];
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const { role } = useRole();
  const { colors } = useAppTheme();
  const { gamification, isLessonComplete } = useProgress();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fullName =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    'Not set';

  const username =
    user?.user_metadata?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Not set';

  const email = user?.email || 'Not set';
  const initials = username.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatarUrl ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        await touchCurrentUserActivity(user?.id);
        const nextProfile = await fetchCurrentUserProfile(user?.id);
        if (isMounted) setProfile(nextProfile);
      } catch {
        if (isMounted) setProfile(null);
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const courses = useMemo(() => {
    if (!Array.isArray(LOCAL_CURRICULUM)) return [];
    return LOCAL_CURRICULUM as CurriculumCourse[];
  }, []);

  const completedCourses = useMemo(() => {
    return courses.filter((course) => {
      const lessons = Array.isArray(course.lessons) ? course.lessons : [];
      if (lessons.length === 0) return false;
      return lessons.every((lesson) => lesson?.id && isLessonComplete(lesson.id));
    });
  }, [courses, isLessonComplete]);

  const totalXp = gamification?.summary?.totalXp ?? 0;
  const level = gamification?.summary?.level ?? 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Track your learning journey, activity, and completed courses.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" cachePolicy="disk" />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileInfoSection}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.subtext}>Tap settings to edit profile</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{fullName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{username}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
        </View>

        <View style={[styles.infoRow, styles.lastInfoRow]}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.valueCap}>{role || 'student'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gamification Stats</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>XP</Text>
          <Text style={styles.value}>{totalXp}</Text>
        </View>

        <View style={[styles.infoRow, styles.lastInfoRow]}>
          <Text style={styles.label}>Level</Text>
          <Text style={styles.value}>{level}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Courses Completed</Text>

        {completedCourses.length > 0 ? (
          completedCourses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              <Text style={styles.courseTitle}>{course.title}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noCoursesText}>No courses completed yet.</Text>
        )}
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
    profileSection: {
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
    profileInfoSection: {
      flex: 1,
      gap: 4,
    },
    username: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtext: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    lastInfoRow: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    label: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    value: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      textAlign: 'right',
    },
    valueCap: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
      textAlign: 'right',
      textTransform: 'capitalize',
    },
    courseRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    courseTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    noCoursesText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
  });
}
