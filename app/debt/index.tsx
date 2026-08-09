import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart, PieChart } from '@/src/components/charts';
import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  EmptyState,
  FadeIn,
  Input,
  SectionHeader,
} from '@/src/components/ui';
import { debtKindEmoji, debtKindLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import {
  annualInterestCost,
  debtSummary,
  monthlyInterestCost,
} from '@/src/lib/finance/metrics';
import { formatMoney, formatPercent } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { DebtKind } from '@/src/types';
import { chartColors, spacing } from '@/src/theme';

const kinds = Object.keys(debtKindLabels) as DebtKind[];

export default function DebtTrackerScreen() {
  const theme = useTheme();
  const debts = useAppStore((s) => s.debts);
  const currency = useAppStore((s) => s.settings.currency);
  const addDebt = useAppStore((s) => s.addDebt);
  const removeDebt = useAppStore((s) => s.removeDebt);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [minPay, setMinPay] = useState('');
  const [lender, setLender] = useState('');
  const [kind, setKind] = useState<DebtKind>('credit_card');
  const [showForm, setShowForm] = useState(false);
  const [chart, setChart] = useState<'pie' | 'bar'>('pie');

  const summary = useMemo(() => debtSummary(debts), [debts]);

  const pieData = summary.byKind.map((k) => ({
    label: debtKindLabels[k.kind as DebtKind] || k.kind,
    value: k.balance,
    color: chartColors.debtKinds[k.kind] || chartColors.debt,
  }));

  const barData = debts
    .slice()
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8)
    .map((d) => ({
      label: d.name.slice(0, 10),
      value: d.balance,
      color: chartColors.debtKinds[d.kind] || chartColors.debt,
    }));

  const cofBars = debts
    .slice()
    .sort((a, b) => annualInterestCost(b) - annualInterestCost(a))
    .slice(0, 8)
    .map((d) => ({
      label: d.name.slice(0, 10),
      value: annualInterestCost(d),
      color: chartColors.debtKinds[d.kind] || chartColors.debt,
    }));

  const save = () => {
    const bal = parseFloat(balance.replace(',', '.'));
    const rate = parseFloat(apr.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(bal) || bal < 0) {
      Alert.alert('Check inputs', 'Enter a name and outstanding balance.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      Alert.alert('Check APR', 'Enter interest rate as a percent (e.g. 19.9). Use 0 for free hand loans.');
      return;
    }
    const min = parseFloat(minPay.replace(',', '.'));
    addDebt({
      name: name.trim(),
      kind,
      balance: bal,
      aprPercent: rate,
      minPayment: Number.isFinite(min) && min > 0 ? min : undefined,
      lender: lender.trim() || undefined,
      currency,
    });
    setName('');
    setBalance('');
    setApr('');
    setMinPay('');
    setLender('');
    setShowForm(false);
  };

  const confirmRemove = (id: string, title: string) => {
    const run = () => removeDebt(id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove “${title}”?`)) run();
      return;
    }
    Alert.alert('Remove debt', `Delete “${title}” from the tracker?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['bottom']}>
      <FlatList
        data={debts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Body muted>
              Clear picture of what you owe — home loans, capex, cards, personal loans, overdraft,
              and hand loans — with interest rates and estimated cost of funds. Names only, never
              account numbers.
            </Body>

            <Card
              style={{
                marginTop: spacing.lg,
                backgroundColor: theme.mode === 'dark' ? 'rgba(251,113,133,0.12)' : '#FFF7ED',
              }}
            >
              <Caption>Total debt</Caption>
              <Text style={[styles.big, { color: theme.text }]}>
                {formatMoney(summary.totalBalance, currency)}
              </Text>
              <View style={styles.statRow}>
                <View style={{ flex: 1 }}>
                  <Caption>Est. annual CoF</Caption>
                  <Body bold>{formatMoney(summary.totalAnnualCof, currency)}</Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Caption>Est. monthly CoF</Caption>
                  <Body bold>{formatMoney(summary.totalMonthlyCof, currency)}</Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Caption>Weighted APR</Caption>
                  <Body bold>{formatPercent(summary.weightedApr)}</Body>
                </View>
              </View>
              <Caption style={{ marginTop: spacing.sm }}>
                Cost of funds ≈ balance × APR (educational estimate, not a lender quote).
              </Caption>
            </Card>

            {debts.length > 0 ? (
              <>
                <SectionHeader title="Breakdown charts" />
                <View style={styles.chips}>
                  <Chip label="By type (pie)" active={chart === 'pie'} onPress={() => setChart('pie')} />
                  <Chip label="Balances (bars)" active={chart === 'bar'} onPress={() => setChart('bar')} />
                </View>
                <Card>
                  {chart === 'pie' ? (
                    <PieChart
                      data={pieData}
                      centerLabel="Debt"
                      centerSub="mix"
                    />
                  ) : (
                    <BarChart data={barData} formatValue={(n) => formatMoney(n, currency)} />
                  )}
                </Card>
                <SectionHeader title="Annual cost of funds by debt" />
                <Card>
                  <BarChart data={cofBars} formatValue={(n) => formatMoney(n, currency)} />
                </Card>
              </>
            ) : null}

            <SectionHeader
              title="Your debts"
              actionLabel={showForm ? 'Hide form' : '+ Add debt'}
              onAction={() => setShowForm((v) => !v)}
            />

            {showForm ? (
              <Card style={{ marginBottom: spacing.md }}>
                <Input label="Name" placeholder="Visa · Mortgage · Mom loan" value={name} onChangeText={setName} />
                <Input
                  label={`Balance (${currency})`}
                  keyboardType="decimal-pad"
                  value={balance}
                  onChangeText={setBalance}
                />
                <Input
                  label="Interest rate / APR %"
                  keyboardType="decimal-pad"
                  placeholder="6.5 or 22.9 or 0"
                  value={apr}
                  onChangeText={setApr}
                />
                <Input
                  label="Min payment / month (optional)"
                  keyboardType="decimal-pad"
                  value={minPay}
                  onChangeText={setMinPay}
                />
                <Input
                  label="Lender or party (name only)"
                  placeholder="Bank · Alex · Credit union"
                  value={lender}
                  onChangeText={setLender}
                />
                <Caption style={{ marginBottom: 6 }}>Debt type</Caption>
                <View style={styles.chips}>
                  {kinds.map((k) => (
                    <Chip
                      key={k}
                      label={`${debtKindEmoji[k]} ${debtKindLabels[k]}`}
                      active={kind === k}
                      onPress={() => setKind(k)}
                    />
                  ))}
                </View>
                <Button label="Save debt" onPress={save} />
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !showForm ? (
            <EmptyState
              title="No debts tracked"
              body="Add mortgages, cards, overdrafts, or hand loans to see total CoF."
            />
          ) : null
        }
        renderItem={({ item, index }) => {
          const annual = annualInterestCost(item);
          const monthly = monthlyInterestCost(item);
          return (
            <FadeIn delay={Math.min(index * 40, 160)}>
              <View
                style={[
                  styles.row,
                  { backgroundColor: theme.bgElevated, borderColor: theme.border },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{debtKindEmoji[item.kind]}</Text>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Body bold>{item.name}</Body>
                  <Caption>
                    {debtKindLabels[item.kind]}
                    {item.lender ? ` · ${item.lender}` : ''}
                  </Caption>
                  <Caption style={{ marginTop: 4 }}>
                    APR {formatPercent(item.aprPercent)} · CoF ~{formatMoney(monthly, currency)}
                    /mo · {formatMoney(annual, currency)}/yr
                  </Caption>
                  {item.minPayment != null ? (
                    <Caption>Min pay {formatMoney(item.minPayment, currency)}</Caption>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: theme.text, fontSize: 15 }}>
                    {formatMoney(item.balance, currency)}
                  </Text>
                  <Button
                    label="Remove"
                    variant="ghost"
                    onPress={() => confirmRemove(item.id, item.name)}
                    style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                  />
                </View>
              </View>
            </FadeIn>
          );
        }}
        ListFooterComponent={
          <Button
            label="Back to dashboard"
            variant="secondary"
            onPress={() => router.push('/(tabs)/dashboard' as any)}
            style={{ marginTop: spacing.lg, marginBottom: 40 }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 24 },
  big: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
