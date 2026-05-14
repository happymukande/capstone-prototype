import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { signUp } from '../../services/authService';
import { AppThemeColors } from '../../src/constants/theme';
import { useAppTheme } from '../../src/context/ThemeContext';

type SignupRole = 'student' | 'teacher';
const SIGNUP_ROLE_OPTIONS: SignupRole[] = ['student', 'teacher'];

export default function SignupScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<SignupRole>('student');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError('');
    setInfo('');

    if (!email.trim() || !password) {
      setError('Please provide an email and password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(email.trim(), password, selectedRole);

    if (!result.success) {
      setError(result.error?.message ?? String(result.error ?? 'Unable to sign up'));
      setIsSubmitting(false);
      return;
    }

    if (result.data?.session) {
      router.replace('/');
      return;
    }

    setInfo('Signup completed. Please check your email to confirm your account and then sign in.');
    setIsSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Create account</Text>
        <Text style={styles.title}>Sign up</Text>
        <Text style={styles.subtitle}>Register with your email to save progress and access more features.</Text>

        <View style={styles.formRow}>
          <Text style={styles.label}>Account type</Text>
          <View style={styles.roleRow}>
            {SIGNUP_ROLE_OPTIONS.map((role) => {
              const selected = selectedRole === role;
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedRole(role)}
                  disabled={isSubmitting}
                  style={[styles.roleButton, selected && styles.roleButtonActive]}
                >
                  <Text style={[styles.roleButtonText, selected && styles.roleButtonTextActive]}>
                    Sign up as {role === 'teacher' ? 'Teacher' : 'Student'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting}
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
            editable={!isSubmitting}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Create a password"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isSubmitting}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Confirm your password"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info ? <Text style={styles.infoText}>{info}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting || !email || !password || !confirmPassword}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Creating account...' : 'Sign up'}</Text>
        </Pressable>

        <View style={styles.linkRow}>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Already have an account?</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/guest')}>
            <Text style={styles.linkText}>Continue as guest</Text>
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
    roleRow: {
      flexDirection: 'row',
      gap: 10,
    },
    roleButton: {
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      backgroundColor: colors.surfaceAlt,
    },
    roleButtonActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    roleButtonText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    roleButtonTextActive: {
      color: colors.onStrong,
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
    infoText: {
      color: colors.success,
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
