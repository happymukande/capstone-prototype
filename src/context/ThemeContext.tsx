import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { APP_THEME_COLORS, AppThemeColors, AppThemeMode } from '../constants/theme';

interface ThemeContextValue {
  mode: AppThemeMode;
  isDarkMode: boolean;
  isHydrated: boolean;
  colors: AppThemeColors;
  navigationTheme: Theme;
  setMode: (nextMode: AppThemeMode) => void;
  toggleDarkMode: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'capstone.theme.v1';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getFallbackMode(systemColorScheme: 'light' | 'dark' | null | undefined): AppThemeMode {
  return systemColorScheme === 'dark' ? 'dark' : 'light';
}

function isThemeMode(value: unknown): value is AppThemeMode {
  return value === 'light' || value === 'dark';
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>(() => getFallbackMode(systemColorScheme));
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && isThemeMode(stored) && isMounted) {
          setModeState(stored);
          return;
        }

        if (isMounted) {
          setModeState(getFallbackMode(systemColorScheme));
        }
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [systemColorScheme]);

  const setMode = useCallback((nextMode: AppThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
      // Keep in-memory theme mode even if persistence fails.
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const colors = useMemo(() => APP_THEME_COLORS[mode], [mode]);

  const navigationTheme = useMemo<Theme>(() => {
    const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.screenBackground,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, mode]);

  const value = useMemo(
    () => ({
      mode,
      isDarkMode: mode === 'dark',
      isHydrated,
      colors,
      navigationTheme,
      setMode,
      toggleDarkMode,
    }),
    [mode, isHydrated, colors, navigationTheme, setMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
}
