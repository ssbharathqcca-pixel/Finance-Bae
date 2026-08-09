import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Body,
  Caption,
  FadeIn,
  GadgetCard,
  HeroBanner,
  SectionHeader,
} from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney } from '@/src/lib/format';
import { estimateTax } from '@/src/lib/tax/estimators';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { spacing } from '@/src/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const session = useAuthStore((s) => s.session);
  const remindersOn = useAuthStore((s) => s.reminderPrefs.enabled);
  const taxProfile = useAppStore((s) => s.taxProfile);
  const monthTotal = useAppStore((s) => s.monthExpenseTotal());
  const deductionsTotal = useAppStore((s) => s.deductionsTotalForYear());
  const budgets = useAppStore((s) => s.budgets);
  const pets = useAppStore((s) => s.pets);
  const estimate = estimateTax(taxProfile, deductionsTotal);

  const gadgets = [
    {
      key: 'expenses',
      title: 'Expenses',
      subtitle: 'Track every dollar',
      emoji: '💳',
      ...theme.gadget.expenses,
      href: '/(tabs)/expenses' as const,
    },
    {
      key: 'tax',
      title: 'Tax liability',
      subtitle: 'IRS & CRA estimates',
      emoji: '📊',
      ...theme.gadget.tax,
      href: '/tax/estimator' as const,
    },
    {
      key: 'parties',
      title: 'Life budgets',
      subtitle: 'Parties, trips, dates',
      emoji: '🎉',
      ...theme.gadget.parties,
      href: '/(tabs)/budgets' as const,
    },
    {
      key: 'pets',
      title: 'Pet care',
      subtitle: `${pets.length} pet profile${pets.length === 1 ? '' : 's'}`,
      emoji: '🐾',
      ...theme.gadget.pets,
      href: '/tools/pets' as const,
    },
    {
      key: 'home',
      title: 'Home fund',
      subtitle: 'Down payment planner',
      emoji: '🏠',
      ...theme.gadget.home,
      href: '/tools/downpayment' as const,
    },
    {
      key: 'evidence',
      title: 'Evidence vault',
      subtitle: 'Back IRS / CRA notices',
      emoji: '🗂️',
      ...theme.gadget.evidence,
      href: '/tax/evidence' as const,
    },
    {
      key: 'calc',
      title: 'Calculator',
      subtitle: 'Quick math gadget',
      emoji: '🧮',
      ...theme.gadget.calculator,
      href: '/tools/calculator' as const,
    },
    {
      key: 'split',
      title: 'Split bills',
      subtitle: 'Trips & parties fair-share',
      emoji: '🧾',
      ...theme.gadget.trips,
      href: '/split' as any,
    },
    {
      key: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Income · spend · save',
      emoji: '📊',
      ...theme.gadget.home,
      href: '/(tabs)/dashboard' as any,
    },
    {
      key: 'debt',
      title: 'Debt tracker',
      subtitle: 'Loans · cards · CoF',
      emoji: '📉',
      ...theme.gadget.budgets,
      href: '/debt' as any,
    },
    {
      key: 'eligibility',
      title: 'Eligibility',
      subtitle: 'Home · loan · card guide',
      emoji: '🏦',
      ...theme.gadget.home,
      href: '/eligibility' as any,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Caption>Guided Budget Platform</Caption>
              <Text style={[styles.greeting, { color: theme.text }]}>
                Hello, {session?.displayName || settings.displayName}
              </Text>
              <Body muted>
                North America · {settings.preferredCountry === 'CA' ? 'Canada' : 'United States'} ·{' '}
                {settings.currency}
                {session
                  ? ` · ${session.mode === 'guest' ? 'Guest' : 'Account'}`
                  : ' · not signed in'}
                {remindersOn ? ' · tax alerts on' : ''}
              </Body>
            </View>
            <Pressable
              onPress={() => router.push(session ? ('/account' as any) : ('/auth' as any))}
              style={[styles.avatar, { backgroundColor: theme.primarySoft, marginRight: 8 }]}
            >
              <Text style={{ fontSize: 18 }}>👤</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={[styles.avatar, { backgroundColor: theme.primarySoft }]}
            >
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <HeroBanner
            title="This month spent"
            value={formatMoney(monthTotal, settings.currency)}
            subtitle={`Est. annual tax: ${formatMoney(estimate.totalEstimatedTax, settings.currency)}`}
            footer={`${budgets.length} active budgets · educational tax tools for IRS & CRA`}
          />
        </FadeIn>

        <FadeIn delay={120}>
          <SectionHeader title="Multi-gadget hub" actionLabel="All tools" onAction={() => router.push('/(tabs)/tools')} />
          <View style={styles.grid}>
            {gadgets.map((g, i) => (
              <View key={g.key} style={styles.gridItem}>
                <GadgetCard
                  title={g.title}
                  subtitle={g.subtitle}
                  emoji={g.emoji}
                  accent={g.accent}
                  background={g.bg}
                  onPress={() => router.push(g.href)}
                />
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <SectionHeader title="Why GBP" />
          <View style={[styles.blurb, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
            <Body>
              One lucid workspace for expenses, life-event budgets, pet care, home down payments,
              and North American tax readiness — with evidence ready for IRS and CRA notices.
            </Body>
            <Caption style={{ marginTop: spacing.sm }}>
              Tax figures are educational estimates, not professional advice.
            </Caption>
          </View>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: '50%',
    padding: 5,
  },
  blurb: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
