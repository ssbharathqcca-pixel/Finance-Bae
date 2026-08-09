import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, FadeIn, GadgetCard, SectionHeader } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { spacing } from '@/src/theme';

export default function ToolsScreen() {
  const theme = useTheme();

  const tools = [
    {
      title: 'Calculator',
      subtitle: 'Swift everyday math',
      emoji: '🧮',
      href: '/tools/calculator',
      ...theme.gadget.calculator,
    },
    {
      title: 'Down payment',
      subtitle: 'Home buying capital',
      emoji: '🏠',
      href: '/tools/downpayment',
      ...theme.gadget.home,
    },
    {
      title: 'Pet budgets',
      subtitle: 'Food, vet, grooming',
      emoji: '🐾',
      href: '/tools/pets',
      ...theme.gadget.pets,
    },
    {
      title: 'Tax estimator',
      subtitle: 'US & Canada models',
      emoji: '📊',
      href: '/tax/estimator',
      ...theme.gadget.tax,
    },
    {
      title: 'Deductions',
      subtitle: 'Track write-offs',
      emoji: '🧾',
      href: '/tax/deductions',
      ...theme.gadget.tax,
    },
    {
      title: 'Evidence vault',
      subtitle: 'IRS & CRA notices',
      emoji: '🗂️',
      href: '/tax/evidence',
      ...theme.gadget.evidence,
    },
    {
      title: 'Eligibility',
      subtitle: 'Home · loans · cards',
      emoji: '🏦',
      href: '/eligibility',
      ...theme.gadget.home,
    },
    {
      title: 'Dashboard',
      subtitle: 'Charts · cashflow',
      emoji: '📊',
      href: '/(tabs)/dashboard',
      ...theme.gadget.home,
    },
    {
      title: 'Debt tracker',
      subtitle: 'APR · cost of funds',
      emoji: '📉',
      href: '/debt',
      ...theme.gadget.budgets,
    },
    {
      title: 'Account & sync',
      subtitle: 'Auth · encrypted backup',
      emoji: '☁️',
      href: '/account',
      ...theme.gadget.calculator,
    },
    {
      title: 'Tax reminders',
      subtitle: 'IRS & CRA instalments',
      emoji: '🔔',
      href: '/account',
      ...theme.gadget.tax,
    },
    {
      title: 'Split bills',
      subtitle: 'Trips & parties fair-share',
      emoji: '🧾',
      href: '/split',
      ...theme.gadget.parties,
    },
    {
      title: 'Life budgets',
      subtitle: 'Parties, trips, dates',
      emoji: '🎉',
      href: '/(tabs)/budgets',
      ...theme.gadget.parties,
    },
    {
      title: 'Expenses',
      subtitle: 'Daily spending log',
      emoji: '💳',
      href: '/(tabs)/expenses',
      ...theme.gadget.expenses,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Caption>Multi-gadget toolkit</Caption>
          <Text style={[styles.title, { color: theme.text }]}>Gadgets</Text>
          <Body muted>Everything you need in one lucid control surface</Body>
        </FadeIn>

        <SectionHeader title="All tools" />
        <View style={styles.grid}>
          {tools.map((t) => (
            <View key={t.title} style={styles.item}>
              <GadgetCard
                title={t.title}
                subtitle={t.subtitle}
                emoji={t.emoji}
                accent={t.accent}
                background={t.bg}
                onPress={() => router.push(t.href as any)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  item: {
    width: '50%',
    padding: 6,
  },
});
