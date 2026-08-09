import { useColorScheme as useRNColorScheme } from 'react-native';

/** Always returns 'light' | 'dark' for template helpers. */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
