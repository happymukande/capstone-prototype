import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { ensureSupabaseUserId } from '../../services/authService';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function GuestScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleContinue = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    const userId = await ensureSupabaseUserId();
    if (!userId) {
      setError('Unable to continue as a guest. Please try signing in or signing up.');
      setIsSubmitting(false);
      return;
    }

    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Guest access</Text>
        <Text style={styles.title}>Continue without an account</Text>
        <Text style={styles.subtitle}>Use the app immediately with a temporary session. You can sign in later to keep your progress.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleContinue}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Starting guest session…' : 'Continue as guest'}</Text>
        </Pressable>

        <View style={styles.linkRow}>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.linkText}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.screenBackground,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 4,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    title: {
      color: colors.onStrong,
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 8,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 24,
    },
    primaryButton: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButtonText: {
      color: colors.onStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.65,
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    linkText: {
      color: colors.primaryStrong,
      fontSize: 14,
      fontWeight: '700',
    },
    errorText: {
      color: colors.danger,
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
