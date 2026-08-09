import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Body, Button, Caption, Chip, Input, Screen } from '@/src/components/ui';
import { expenseCategoryLabels, paymentMethodLabels } from '@/src/data/labels';
import { useAppStore } from '@/src/store/useAppStore';
import { ExpenseCategory, PaymentMethod } from '@/src/types';
import { spacing } from '@/src/theme';

const categories = Object.keys(expenseCategoryLabels) as ExpenseCategory[];
const paymentMethods = Object.keys(paymentMethodLabels) as PaymentMethod[];

export default function AddExpenseScreen() {
  const addExpense = useAppStore((s) => s.addExpense);
  const budgets = useAppStore((s) => s.budgets);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit');
  const [notes, setNotes] = useState('');
  const [deductible, setDeductible] = useState(false);
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
      deductible,
      budgetId,
      source: 'manual',
    });
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Caption style={{ marginBottom: spacing.md }}>
          Manual entry keeps full control — no bank file required.
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
          placeholder="Receipt details, split with friends..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Body bold style={{ marginBottom: 8 }}>
          Category
        </Body>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={expenseCategoryLabels[c]}
              active={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <Body bold style={{ marginBottom: 8 }}>
          Payment mode
        </Body>
        <View style={styles.chips}>
          {paymentMethods
            .filter((p) => p !== 'unknown')
            .map((p) => (
              <Chip
                key={p}
                label={paymentMethodLabels[p]}
                active={paymentMethod === p}
                onPress={() => setPaymentMethod(p)}
              />
            ))}
        </View>

        <View style={styles.chips}>
          <Chip
            label={deductible ? '✓ Possibly deductible' : 'Not deductible'}
            active={deductible}
            onPress={() => setDeductible((v) => !v)}
          />
        </View>

        {budgets.length > 0 ? (
          <View style={styles.chips}>
            <Chip label="No budget link" active={!budgetId} onPress={() => setBudgetId(undefined)} />
            {budgets.map((b) => (
              <Chip
                key={b.id}
                label={b.name}
                active={budgetId === b.id}
                onPress={() => setBudgetId(b.id)}
              />
            ))}
          </View>
        ) : null}

        <Button label="Save expense" onPress={save} style={{ marginTop: spacing.md }} />
        <Button
          label="Optional: privacy-first CSV import"
          variant="secondary"
          onPress={() => router.push('/expense/import' as any)}
          style={{ marginTop: spacing.sm }}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
});
