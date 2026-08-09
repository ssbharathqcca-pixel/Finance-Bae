import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Caption, EmptyState, FadeIn, SectionHeader } from '@/src/components/ui';
import { expenseCategoryLabels, paymentMethodLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney, formatShortDate } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function ExpensesScreen() {
  const theme = useTheme();
  const expenses = useAppStore((s) => s.expenses);
  const currency = useAppStore((s) => s.settings.currency);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const monthTotal = useAppStore((s) => s.monthExpenseTotal());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={styles.header}>
        <FadeIn>
          <Caption>Spending tracker</Caption>
          <Text style={[styles.title, { color: theme.text }]}>Expenses</Text>
          <Body muted>Month total · {formatMoney(monthTotal, currency)}</Body>
        </FadeIn>
        <View style={styles.actions}>
          <Button
            label="+ Add manually"
            onPress={() => router.push('/expense/add')}
            style={{ flex: 1 }}
          />
          <Button
            label="CSV import"
            variant="secondary"
            onPress={() => router.push('/expense/import' as any)}
            style={{ flex: 1 }}
          />
        </View>
        <Caption style={{ marginTop: spacing.sm }}>
          CSV import is optional and privacy-first — only name, category, amount, and payment mode.
        </Caption>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <EmptyState
            title="No expenses yet"
            body="Log coffee runs, pet care, dinner dates, and more."
          />
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index * 40, 200)}>
            <Pressable
              onLongPress={() => removeExpense(item.id)}
              style={[
                styles.row,
                { backgroundColor: theme.bgElevated, borderColor: theme.border },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                <Text>💸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Body bold>{item.title}</Body>
                <Caption>
                  {expenseCategoryLabels[item.category]} · {formatShortDate(item.date)}
                  {item.paymentMethod
                    ? ` · ${paymentMethodLabels[item.paymentMethod]}`
                    : ''}
                  {item.source === 'csv_import' ? ' · imported' : ''}
                  {item.deductible ? ' · deductible' : ''}
                </Caption>
              </View>
              <Text style={[styles.amount, { color: theme.text }]}>
                {formatMoney(item.amount, currency)}
              </Text>
            </Pressable>
          </FadeIn>
        )}
        ListHeaderComponent={
          expenses.length ? (
            <SectionHeader title="Recent" actionLabel="Long-press to delete" />
          ) : (
            <View style={{ height: spacing.md }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontWeight: '700',
    fontSize: 15,
  },
});
