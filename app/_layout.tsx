import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { ProgressProvider } from '../src/context/ProgressContext';
import { RoleProvider } from '../src/context/RoleContext';
import { AppThemeProvider, useAppTheme } from '../src/context/ThemeContext';

function RootNavigatorContent() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();

  const currentRoute = segments[segments.length - 1] ?? '';
  const isAuthRoute = ['login', 'signup', 'guest'].includes(currentRoute);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && isAuthRoute) {
      router.replace('/');
      return;
    }

    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, isAuthRoute, router]);

  const screenOptions = useMemo(
    () => ({
      contentStyle: {
        backgroundColor: colors.screenBackground,
      },
      headerStyle: {
        backgroundColor: colors.primaryStrong,
      },
      headerTintColor: colors.onStrong,
      headerTitleStyle: {
        fontWeight: '700' as const,
      },
    }),
    [colors]
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.screenBackground }]}> 
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking authentication…</Text>
      </View>
    );
  }

  return (
    <Stack initialRouteName="(auth)/login" screenOptions={screenOptions}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/guest" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
      <Stack.Screen name="quiz/[id]" options={{ title: 'Quiz' }} />
    </Stack>
  );
}

function RootNavigator() {
  return (
    <AuthProvider>
      <RoleProvider>
        <ProgressProvider>
          <RootNavigatorContent />
        </ProgressProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});
