import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { useTheme } from '@/src/hooks/useTheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabIcon({ emoji, color, focused }: { emoji: string; color: string | undefined; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 48 }}>
      <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.75 }}>{emoji}</Text>
      {focused ? (
        <View
          style={{
            marginTop: 3,
            width: 5,
            height: 5,
            borderRadius: 99,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { fontWeight: '700', color: theme.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="🏠" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="📊" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="💳" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="🎯" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: 'Tax',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="📑" color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Gadgets',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="🧰" color={String(color)} focused={focused} />
          ),
        }}
      />
      {/* hide default template route if present */}
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
