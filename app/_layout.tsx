import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { AuthProvider } from '../context/AuthProvider';
import { ProgressProvider } from '../src/context/ProgressContext';
import { RoleProvider } from '../src/context/RoleContext';
import { AppThemeProvider, useAppTheme } from '../src/context/ThemeContext';

function RootNavigator() {
  const { colors } = useAppTheme();

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

  return (
    <AuthProvider>
      <RoleProvider>
        <ProgressProvider>
          <Stack initialRouteName="(drawer)" screenOptions={screenOptions}>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
            <Stack.Screen name="quiz/[id]" options={{ title: 'Quiz' }} />
          </Stack>
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
