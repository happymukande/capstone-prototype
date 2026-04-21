import { AppThemeColors } from '../constants/theme';

export interface ThemePalette {
  elevatedSurface: string;
  mutedSurface: string;
  inputBackground: string;
  inputDisabled: string;
  progressTrack: string;
  selectedSurface: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
  neutralSoft: string;
  lockedSurface: string;
  lockedText: string;
  actionMuted: string;
  shadowColor: string;
}

export function getThemePalette(colors: AppThemeColors, isDarkMode: boolean): ThemePalette {
  return {
    elevatedSurface: isDarkMode ? '#101611' : '#fbfefb',
    mutedSurface: isDarkMode ? '#111713' : '#f7fbf7',
    inputBackground: isDarkMode ? '#101611' : '#fbfefb',
    inputDisabled: isDarkMode ? '#172019' : '#ecf4ed',
    progressTrack: isDarkMode ? '#1a261d' : '#dfeade',
    selectedSurface: isDarkMode ? '#163420' : '#e6f5e8',
    successSoft: isDarkMode ? '#102116' : '#e9f7ec',
    warningSoft: isDarkMode ? '#2b220f' : '#fbf3df',
    dangerSoft: isDarkMode ? '#2a1512' : '#fdece8',
    infoSoft: isDarkMode ? '#112218' : '#e7f5ea',
    neutralSoft: isDarkMode ? '#101611' : '#f5f8f5',
    lockedSurface: isDarkMode ? '#0f1410' : '#f4f7f4',
    lockedText: isDarkMode ? '#92a692' : '#7a8c7b',
    actionMuted: isDarkMode ? '#2a332c' : '#b7c4b8',
    shadowColor: isDarkMode ? '#000000' : colors.surfaceStrong,
  };
}
