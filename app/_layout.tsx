import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/store/useAuthStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

LogBox.ignoreLogs(['expo-notifications', 'SecureStore', 'AsyncStorage has been extracted']);

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    // Never leave the app blank if font loading stalls
    const t = setTimeout(() => setForceReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded || forceReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, forceReady]);

  if (!fontsLoaded && !forceReady) {
    return <View style={{ flex: 1, backgroundColor: '#F7F9F8' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const theme = useTheme();
  const authHydrated = useAuthStore((s) => s.hydrated);
  const reminderPrefs = useAuthStore((s) => s.reminderPrefs);

  useEffect(() => {
    if (!authHydrated || !reminderPrefs.enabled) return;
    // Deferred so notifications never block first paint / clicks
    const t = setTimeout(() => {
      void import('@/src/lib/reminders/taxInstallments')
        .then((m) => m.scheduleTaxReminders(reminderPrefs))
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [
    authHydrated,
    reminderPrefs.enabled,
    reminderPrefs.country,
    reminderPrefs.daysBefore,
    reminderPrefs.hour,
  ]);

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="expense/add" options={{ title: 'Add expense', presentation: 'modal' }} />
        <Stack.Screen name="expense/import" options={{ title: 'CSV import', presentation: 'modal' }} />
        <Stack.Screen name="budget/create" options={{ title: 'New budget', presentation: 'modal' }} />
        <Stack.Screen name="split/index" options={{ title: 'Split bills' }} />
        <Stack.Screen name="split/create" options={{ title: 'New split group', presentation: 'modal' }} />
        <Stack.Screen name="split/[id]" options={{ title: 'Split group' }} />
        <Stack.Screen name="tax/estimator" options={{ title: 'Tax estimator' }} />
        <Stack.Screen name="tax/deductions" options={{ title: 'Deductions' }} />
        <Stack.Screen name="tax/evidence" options={{ title: 'Evidence vault' }} />
        <Stack.Screen name="tools/downpayment" options={{ title: 'Down payment planner' }} />
        <Stack.Screen name="tools/calculator" options={{ title: 'Calculator' }} />
        <Stack.Screen name="tools/pets" options={{ title: 'Pet budgets' }} />
        <Stack.Screen name="auth/index" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ title: 'Account & reminders' }} />
        <Stack.Screen name="debt/index" options={{ title: 'Debt tracker' }} />
        <Stack.Screen name="eligibility/index" options={{ title: 'Eligibility guide' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
