import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Select } from '@/src/components/Select';
import { Body, Button, Caption, Input, Screen } from '@/src/components/ui';
import { expenseCategoryLabels, paymentMethodLabels } from '@/src/data/labels';
import { useAppStore } from '@/src/store/useAppStore';
import { ExpenseCategory, PaymentMethod } from '@/src/types';
import { spacing } from '@/src/theme';

const categories = Object.keys(expenseCategoryLabels) as ExpenseCategory[];
const paymentMethods = (Object.keys(paymentMethodLabels) as PaymentMethod[]).filter(
  (p) => p !== 'unknown'
);

export default function AddExpenseScreen() {
  const addExpense = useAppStore((s) => s.addExpense);
  const budgets = useAppStore((s) => s.budgets);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit');
  const [notes, setNotes] = useState('');
  const [deductible, setDeductible] = useState<'yes' | 'no'>('no');
  const [budgetId, setBudgetId] = useState<string | undefined>();

  const save = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Check inputs', 'Please enter a title and a valid amount.');
      return;
    }
    addExpense({
      title: title.trim(),
      amount: value,
      category,
      paymentMethod,
      date: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
      deductible: deductible === 'yes',
      budgetId,
      source: 'manual',
    });
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Caption style={{ marginBottom: spacing.sm }}>
          Manual entry — no bank file required.
        </Caption>
        <Input label="Title" placeholder="Coffee, vet bill, flights..." value={title} onChangeText={setTitle} />
        <Input
          label="Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Input
          label="Notes (optional)"
          placeholder="Optional details"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Select
          label="Category"
          value={category}
          options={categories.map((c) => ({ value: c, label: expenseCategoryLabels[c] }))}
          onChange={setCategory}
          searchable
        />
        <Select
          label="Payment mode"
          value={paymentMethod}
          options={paymentMethods.map((p) => ({ value: p, label: paymentMethodLabels[p] }))}
          onChange={setPaymentMethod}
          searchable
        />
        <Select
          label="Possibly deductible?"
          value={deductible}
          options={[
            { value: 'no', label: 'Not deductible' },
            { value: 'yes', label: 'Possibly deductible' },
          ]}
          onChange={setDeductible}
          searchable={false}
        />
        {budgets.length > 0 ? (
          <Select
            label="Link to budget (optional)"
            value={budgetId ?? ''}
            options={[
              { value: '', label: 'No budget link' },
              ...budgets.map((b) => ({ value: b.id, label: b.name })),
            ]}
            onChange={(v) => setBudgetId(v || undefined)}
            searchable
          />
        ) : null}

        <Button label="Save expense" onPress={save} style={{ marginTop: spacing.sm }} />
        <View style={styles.row}>
          <Button
            label="CSV import"
            variant="secondary"
            onPress={() => router.push('/expense/import' as any)}
            style={styles.half}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={styles.half} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  half: { flex: 1 },
});
