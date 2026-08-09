import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Caption, Card, Input, ProgressBar, Screen, SectionHeader } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney, formatPercent } from '@/src/lib/format';
import { downPaymentPlan } from '@/src/lib/tax/estimators';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function DownPaymentScreen() {
  const theme = useTheme();
  const currency = useAppStore((s) => s.settings.currency);

  const [homePrice, setHomePrice] = useState('450000');
  const [percent, setPercent] = useState('20');
  const [savings, setSavings] = useState('18000');
  const [monthly, setMonthly] = useState('1200');
  const [extra, setExtra] = useState('0');

  const plan = useMemo(
    () =>
      downPaymentPlan({
        homePrice: parseFloat(homePrice) || 0,
        targetPercent: parseFloat(percent) || 0,
        currentSavings: parseFloat(savings) || 0,
        monthlyContribution: parseFloat(monthly) || 0,
        monthlyExtra: parseFloat(extra) || 0,
      }),
    [homePrice, percent, savings, monthly, extra]
  );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Body muted>
          Build down-payment capital for home buying across the US and Canada. Track target %, savings,
          and months-to-goal.
        </Body>

        <Input label={`Home price (${currency})`} keyboardType="decimal-pad" value={homePrice} onChangeText={setHomePrice} />
        <Input label="Target down payment %" keyboardType="decimal-pad" value={percent} onChangeText={setPercent} />
        <Input label="Current savings" keyboardType="decimal-pad" value={savings} onChangeText={setSavings} />
        <Input label="Monthly contribution" keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} />
        <Input label="Extra monthly boost" keyboardType="decimal-pad" value={extra} onChangeText={setExtra} />

        <SectionHeader title="Plan snapshot" />
        <Card style={{ backgroundColor: theme.gadget.home.bg }}>
          <Caption>Target amount</Caption>
          <Text style={[styles.big, { color: theme.text }]}>
            {formatMoney(plan.targetAmount, currency)}
          </Text>
          <Body style={{ marginTop: spacing.sm }}>
            Remaining {formatMoney(plan.remaining, currency)} · Progress {formatPercent(plan.progress)}
          </Body>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar progress={plan.progress} color={theme.gadget.home.accent} />
          </View>
          <Body style={{ marginTop: spacing.md }} bold>
            {plan.monthsToGoal == null
              ? 'Add a monthly contribution to project your timeline.'
              : `About ${plan.monthsToGoal} months (${plan.yearsToGoal?.toFixed(1)} years) to goal.`}
          </Body>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  big: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 4,
  },
});
