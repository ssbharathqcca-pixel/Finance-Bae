import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart, LineChart, PieChart } from '@/src/components/charts';
import { Select } from '@/src/components/Select';
import {
  Body,
  Button,
  Caption,
  Card,
  FadeIn,
  Input,
  SectionHeader,
} from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import {
  cashflowSnapshot,
  categoryBreakdown,
  expensesInMonth,
  monthlyExpenseSeries,
  monthlyIncomeFromProfile,
  sumExpenses,
  debtSummary,
} from '@/src/lib/finance/metrics';
import { formatMoney, formatPercent } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { chartColors, spacing } from '@/src/theme';

type ChartMode = 'pie' | 'bar' | 'line';

export default function DashboardScreen() {
  const theme = useTheme();
  const currency = useAppStore((s) => s.settings.currency);
  const settings = useAppStore((s) => s.settings);
  const taxProfile = useAppStore((s) => s.taxProfile);
  const expenses = useAppStore((s) => s.expenses);
  const debts = useAppStore((s) => s.debts);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [chartMode, setChartMode] = useState<ChartMode>('pie');
  const [compareMode, setCompareMode] = useState<'cashflow' | 'categories' | 'trend'>('cashflow');
  const [incomeDraft, setIncomeDraft] = useState(
    String(settings.monthlyIncome ?? Math.round(taxProfile.annualGrossIncome / 12))
  );
  const [savingsDraft, setSavingsDraft] = useState(String(settings.savingsBalance ?? 0));

  const monthlyIncome = monthlyIncomeFromProfile(taxProfile, settings.monthlyIncome);
  const monthExps = useMemo(() => expensesInMonth(expenses), [expenses]);
  const monthSpend = sumExpenses(monthExps);
  const snap = cashflowSnapshot({
    monthlyIncome,
    monthExpenses: monthSpend,
    savingsBalance: settings.savingsBalance ?? 0,
  });
  const cats = useMemo(() => categoryBreakdown(monthExps), [monthExps]);
  const series = useMemo(() => monthlyExpenseSeries(expenses, 6), [expenses]);
  const debt = useMemo(() => debtSummary(debts), [debts]);

  const cashflowPie = [
    { label: 'Income kept', value: Math.max(0, snap.monthlySavings), color: chartColors.savings },
    { label: 'Expenses', value: snap.expenses, color: chartColors.expenses },
  ].filter((d) => d.value > 0);

  const cashflowBars = [
    { label: 'Income', value: snap.income, color: chartColors.income },
    { label: 'Expenses', value: snap.expenses, color: chartColors.expenses },
    {
      label: 'Saved',
      value: Math.max(0, snap.monthlySavings),
      color: chartColors.savings,
    },
  ];

  const categoryData = cats.slice(0, 8).map((c, i) => ({
    label: c.label,
    value: c.amount,
    color: chartColors.categories[i % chartColors.categories.length],
  }));

  const incomeFlat = series.map((s) => ({
    label: s.label,
    value: monthlyIncome,
  }));
  const expenseTrend = series.map((s) => ({
    label: s.label,
    value: s.amount,
  }));
  const savingsTrend = series.map((s) => ({
    label: s.label,
    value: Math.max(0, monthlyIncome - s.amount),
  }));

  const saveCashflowInputs = () => {
    const inc = parseFloat(incomeDraft.replace(',', '.'));
    const sav = parseFloat(savingsDraft.replace(',', '.'));
    updateSettings({
      monthlyIncome: Number.isFinite(inc) && inc >= 0 ? inc : undefined,
      savingsBalance: Number.isFinite(sav) && sav >= 0 ? sav : 0,
    });
  };

  const healthColor =
    snap.savingsRate >= 20
      ? theme.savings
      : snap.savingsRate >= 0
        ? theme.income
        : theme.debt;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Caption>Your money at a glance</Caption>
          <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
          <Body muted>Income · expenses · savings — clear, calm, actionable</Body>
        </FadeIn>

        <FadeIn delay={40}>
          <LinearGradient
            colors={
              theme.mode === 'dark'
                ? ['#064E3B', '#0C4A6E']
                : ['#059669', '#0EA5E9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>This month</Text>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTiny}>Income</Text>
                <Text style={styles.heroVal}>{formatMoney(snap.income, currency)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTiny}>Expenses</Text>
                <Text style={styles.heroVal}>{formatMoney(snap.expenses, currency)}</Text>
              </View>
            </View>
            <View style={[styles.heroRow, { marginTop: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTiny}>Saved this month</Text>
                <Text style={styles.heroVal}>
                  {formatMoney(snap.monthlySavings, currency)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTiny}>Savings rate</Text>
                <Text style={styles.heroVal}>{formatPercent(snap.savingsRate)}</Text>
              </View>
            </View>
            <Text style={styles.heroFoot}>
              Liquid savings balance · {formatMoney(snap.savingsBalance, currency)}
            </Text>
          </LinearGradient>
        </FadeIn>

        <FadeIn delay={80}>
          <View style={styles.kpiRow}>
            <Kpi
              title="Income"
              value={formatMoney(snap.income, currency)}
              tone={theme.income}
              soft={theme.mode === 'dark' ? 'rgba(13,148,136,0.2)' : '#CCFBF1'}
            />
            <Kpi
              title="Expenses"
              value={formatMoney(snap.expenses, currency)}
              tone={theme.expense}
              soft={theme.mode === 'dark' ? 'rgba(245,158,11,0.18)' : '#FEF3C7'}
            />
            <Kpi
              title="Savings"
              value={formatMoney(Math.max(0, snap.monthlySavings), currency)}
              tone={healthColor}
              soft={theme.mode === 'dark' ? 'rgba(16,185,129,0.18)' : '#D1FAE5'}
            />
          </View>
        </FadeIn>

        <FadeIn delay={100}>
          <Card
            style={{
              backgroundColor: theme.mode === 'dark' ? 'rgba(251,113,133,0.12)' : '#FFF1F2',
              borderColor: theme.border,
            }}
            onPress={() => router.push('/debt' as any)}
          >
            <View style={styles.debtHead}>
              <Text style={{ fontSize: 22 }}>📉</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Body bold>Debt snapshot</Body>
                <Caption>
                  Total {formatMoney(debt.totalBalance, currency)} · Est. annual cost of funds{' '}
                  {formatMoney(debt.totalAnnualCof, currency)}
                </Caption>
              </View>
            </View>
            <Caption style={{ marginTop: 8 }}>
              Weighted APR {formatPercent(debt.weightedApr)} · Tap for full breakdown (mortgage,
              cards, hand loans…)
            </Caption>
            <Button
              label="Open debt tracker"
              variant="secondary"
              onPress={() => router.push('/debt' as any)}
              style={{ marginTop: 12 }}
            />
          </Card>
        </FadeIn>

        <SectionHeader title="Charts" />
        <Select
          label="Compare"
          value={compareMode}
          options={[
            { value: 'cashflow', label: 'Income vs spend' },
            { value: 'categories', label: 'Categories' },
            { value: 'trend', label: '6-month trend' },
          ]}
          onChange={(id) => {
            setCompareMode(id);
            if (id === 'trend') setChartMode('line');
            else setChartMode('pie');
          }}
          searchable={false}
        />
        {compareMode !== 'trend' ? (
          <Select
            label="Chart style"
            value={chartMode === 'line' ? 'pie' : chartMode}
            options={[
              { value: 'pie', label: 'Pie chart' },
              { value: 'bar', label: 'Bar chart' },
            ]}
            onChange={(m) => setChartMode(m as ChartMode)}
            searchable={false}
          />
        ) : (
          <Caption style={{ marginBottom: spacing.md }}>
            Trend: income, expenses, and savings over 6 months
          </Caption>
        )}

        <Card>
          {compareMode === 'cashflow' && chartMode === 'pie' && (
            <PieChart
              data={
                cashflowPie.length
                  ? cashflowPie
                  : [{ label: 'No data', value: 1, color: theme.bgMuted }]
              }
              centerLabel="Month"
              centerSub="split"
            />
          )}
          {compareMode === 'cashflow' && chartMode !== 'pie' && (
            <BarChart
              data={cashflowBars}
              formatValue={(n) => formatMoney(n, currency)}
            />
          )}
          {compareMode === 'categories' && chartMode === 'pie' && (
            <PieChart
              data={
                categoryData.length
                  ? categoryData
                  : [{ label: 'No expenses', value: 1, color: theme.bgMuted }]
              }
              centerLabel="Spend"
              centerSub="by type"
            />
          )}
          {compareMode === 'categories' && chartMode !== 'pie' && (
            <BarChart
              data={
                categoryData.length
                  ? categoryData
                  : [{ label: 'None', value: 0, color: theme.bgMuted }]
              }
              formatValue={(n) => formatMoney(n, currency)}
            />
          )}
          {compareMode === 'trend' && (
            <LineChart
              series={[
                { name: 'Income', color: chartColors.income, points: incomeFlat },
                { name: 'Expenses', color: chartColors.expenses, points: expenseTrend },
                { name: 'Savings', color: chartColors.savings, points: savingsTrend },
              ]}
              formatValue={(n) => formatMoney(n, currency)}
            />
          )}
        </Card>

        <Button
          label="Check loan & card eligibility"
          onPress={() => router.push('/eligibility' as any)}
          style={{ marginTop: spacing.md }}
        />

        <SectionHeader title="Update cashflow inputs" />
        <Card>
          <Body muted style={{ marginBottom: spacing.sm }}>
            Set take-home income and liquid savings so the dashboard matches your reality (not just
            taxable gross).
          </Body>
          <Input
            label={`Monthly take-home (${currency})`}
            keyboardType="decimal-pad"
            value={incomeDraft}
            onChangeText={setIncomeDraft}
          />
          <Input
            label={`Savings balance (${currency})`}
            keyboardType="decimal-pad"
            value={savingsDraft}
            onChangeText={setSavingsDraft}
          />
          <Button label="Save to dashboard" onPress={saveCashflowInputs} />
        </Card>

        <Caption style={{ marginTop: spacing.lg, marginBottom: 40 }}>
          Soft greens and blues support calm focus; amber marks spending; coral is reserved for
          debt — designed to feel inviting, not stressful.
        </Caption>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({
  title,
  value,
  tone,
  soft,
}: {
  title: string;
  value: string;
  tone: string;
  soft: string;
}) {
  return (
    <View style={[styles.kpi, { backgroundColor: soft, borderColor: 'transparent' }]}>
      <Text style={{ color: tone, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
        {title.toUpperCase()}
      </Text>
      <Text style={{ color: tone, fontSize: 15, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  hero: {
    borderRadius: 22,
    padding: spacing.xxl,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroRow: { flexDirection: 'row', marginTop: 10 },
  heroTiny: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  heroVal: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  heroFoot: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 14,
    fontSize: 13,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  kpi: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  debtHead: { flexDirection: 'row', alignItems: 'center' },
  compareRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  compareChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
