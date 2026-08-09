import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, AppTheme } from '@/src/theme';
import { useAppStore } from '@/src/store/useAppStore';

export function useTheme(): AppTheme {
  const system = useColorScheme();
  // Guard: store may briefly be undefined during first paint
  const pref = useAppStore((s) => s.settings?.darkMode ?? 'system');
  const isDark =
    pref === 'dark' ? true : pref === 'light' ? false : system === 'dark';
  return isDark ? darkTheme : lightTheme;
}
