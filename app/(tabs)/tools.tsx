import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { spacing } from '@/src/theme';

type Tool = {
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
  bg: string;
  accent: string;
};

export default function ToolsScreen() {
  const theme = useTheme();

  const tools: Tool[] = [
    { title: 'Calculator', subtitle: 'Everyday math', emoji: '🧮', href: '/tools/calculator', ...theme.gadget.calculator },
    { title: 'Down payment', subtitle: 'Home capital', emoji: '🏠', href: '/tools/downpayment', ...theme.gadget.home },
    { title: 'Pet budgets', subtitle: 'Food & vet', emoji: '🐾', href: '/tools/pets', ...theme.gadget.pets },
    { title: 'Tax estimator', subtitle: 'US & Canada', emoji: '📊', href: '/tax/estimator', ...theme.gadget.tax },
    { title: 'Deductions', subtitle: 'Write-offs', emoji: '🧾', href: '/tax/deductions', ...theme.gadget.tax },
    { title: 'Evidence vault', subtitle: 'IRS & CRA', emoji: '🗂️', href: '/tax/evidence', ...theme.gadget.evidence },
    { title: 'Eligibility', subtitle: 'Loans & cards', emoji: '🏦', href: '/eligibility', ...theme.gadget.home },
    { title: 'Dashboard', subtitle: 'Charts', emoji: '📈', href: '/(tabs)/dashboard', ...theme.gadget.home },
    { title: 'Debt tracker', subtitle: 'APR & CoF', emoji: '📉', href: '/debt', ...theme.gadget.budgets },
    { title: 'Split bills', subtitle: 'Trips & parties', emoji: '🤝', href: '/split', ...theme.gadget.parties },
    { title: 'Life budgets', subtitle: 'Envelopes', emoji: '🎯', href: '/(tabs)/budgets', ...theme.gadget.parties },
    { title: 'Expenses', subtitle: 'Spending log', emoji: '💳', href: '/(tabs)/expenses', ...theme.gadget.expenses },
    { title: 'Account', subtitle: 'Backup & login', emoji: '☁️', href: '/account', ...theme.gadget.calculator },
    { title: 'Reminders', subtitle: 'Tax alerts', emoji: '🔔', href: '/account', ...theme.gadget.tax },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Caption>Toolkit</Caption>
        <Text style={[styles.title, { color: theme.text }]}>Gadgets</Text>
        <Body muted style={{ marginBottom: spacing.lg }}>
          Two equal tiles per row
        </Body>

        <View style={styles.grid}>
          {tools.map((t) => (
            <View key={t.title} style={styles.cell}>
              <Pressable
                onPress={() => router.push(t.href as any)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: t.bg,
                    borderColor: theme.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={styles.tileTop}>
                  <View style={[styles.iconBox, { backgroundColor: theme.bgElevated }]}>
                    <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: t.accent }]} />
                </View>
                <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={[styles.tileSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {t.subtitle}
                </Text>
              </Pressable>
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
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  cell: {
    width: '50%',
    padding: 5,
  },
  tile: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  tileTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  tileSub: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '500',
  },
});
