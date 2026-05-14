import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { continueAsGuest, signIn } from '../../services/authService';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async () => {
    if (isSubmitting || isGuestSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        setError(result.error ?? 'Unable to sign in');
        return;
      }

      router.replace('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestContinue = async () => {
    if (isSubmitting || isGuestSubmitting) return;

    setError('');
    setIsGuestSubmitting(true);

    try {
      const result = await continueAsGuest();

      if (!result.success) {
        setError(result.error ?? 'Unable to continue as guest');
        return;
      }

      router.replace('/');
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Use your email and password to continue learning.
        </Text>

        <View style={styles.formRow}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting && !isGuestSubmitting}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            editable={!isSubmitting && !isGuestSubmitting}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Enter your password"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.errorText}>{String(error)}</Text> : null}

        <Pressable
          style={[
            styles.primaryButton,
            (isSubmitting || isGuestSubmitting || !email || !password) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isGuestSubmitting || !email || !password}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            (isSubmitting || isGuestSubmitting) && styles.disabledButton,
          ]}
          onPress={handleGuestContinue}
          disabled={isSubmitting || isGuestSubmitting}
        >
          <Text style={styles.secondaryButtonText}>
            {isGuestSubmitting ? 'Continuing as guest...' : 'Continue as guest'}
          </Text>
        </Pressable>

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/signup')}
            disabled={isSubmitting || isGuestSubmitting}
          >
            <Text style={styles.linkText}>Create an account</Text>
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
    secondaryButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.65,
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'center',
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
