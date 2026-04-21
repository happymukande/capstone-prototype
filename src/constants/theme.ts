export type AppThemeMode = 'light' | 'dark';

export interface AppThemeColors {
  screenBackground: string;
  surface: string;
  surfaceAlt: string;
  surfaceStrong: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  onPrimary: string;
  onStrong: string;
  heroBackground: string;
  heroEyebrow: string;
  heroSubtle: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  drawerBackground: string;
  drawerActiveBackground: string;
  drawerActiveText: string;
  drawerInactiveText: string;
}

export const APP_THEME_COLORS: Record<AppThemeMode, AppThemeColors> = {
  light: {
    screenBackground: '#f5faf5',
    surface: '#ffffff',
    surfaceAlt: '#edf7ee',
    surfaceStrong: '#102318',
    border: '#d7e7d9',
    textPrimary: '#102318',
    textSecondary: '#345044',
    textMuted: '#5f7a6f',
    primary: '#2f8f46',
    primaryStrong: '#155724',
    onPrimary: '#ffffff',
    onStrong: '#ffffff',
    heroBackground: '#102318',
    heroEyebrow: '#8ad9a0',
    heroSubtle: '#d6f5dd',
    success: '#34a853',
    warning: '#d9a441',
    danger: '#cc5a43',
    info: '#2f8f46',
    drawerBackground: '#f5faf5',
    drawerActiveBackground: '#dff3e4',
    drawerActiveText: '#102318',
    drawerInactiveText: '#5f7a6f',
  },
  dark: {
    screenBackground: '#050705',
    surface: '#0b100c',
    surfaceAlt: '#111713',
    surfaceStrong: '#000000',
    border: '#1d2a20',
    textPrimary: '#f5fff6',
    textSecondary: '#d7ead9',
    textMuted: '#92ab96',
    primary: '#3ddc72',
    primaryStrong: '#1d8f47',
    onPrimary: '#021404',
    onStrong: '#ffffff',
    heroBackground: '#000000',
    heroEyebrow: '#7edc9a',
    heroSubtle: '#bfe9c8',
    success: '#48c774',
    warning: '#e2b04b',
    danger: '#f07b63',
    info: '#3ddc72',
    drawerBackground: '#050705',
    drawerActiveBackground: '#153520',
    drawerActiveText: '#f5fff6',
    drawerInactiveText: '#a8bdaa',
  },
};
