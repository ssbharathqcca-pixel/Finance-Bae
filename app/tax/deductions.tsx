import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Select } from '@/src/components/Select';
import { Body, Button, Caption, EmptyState, Input, Screen } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function DeductionsScreen() {
  const theme = useTheme();
  const taxProfile = useAppStore((s) => s.taxProfile);
  const deductions = useAppStore((s) => s.deductions);
  const addDeduction = useAppStore((s) => s.addDeduction);
  const removeDeduction = useAppStore((s) => s.removeDeduction);
  const currency = useAppStore((s) => s.settings.currency);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Charitable');

  const categories = ['Charitable', 'Medical', 'Home office', 'Education', 'Business', 'RRSP/IRA', 'Other'];

  const save = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Check inputs', 'Enter a deduction name and amount.');
      return;
    }
    addDeduction({
      name: name.trim(),
      amount: value,
      country: taxProfile.country,
      taxYear: taxProfile.taxYear,
      category,
      evidenceIds: [],
    });
    setName('');
    setAmount('');
  };

  const filtered = deductions.filter(
    (d) => d.country === taxProfile.country && d.taxYear === taxProfile.taxYear
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Body muted>
              Manage deductions for {taxProfile.taxYear} · {taxProfile.country}. Link evidence from the
              vault as you collect receipts.
            </Body>
            <Input label="Name" placeholder="Charitable donation" value={name} onChangeText={setName} />
            <Input label="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <Select
              label="Category"
              value={category}
              options={categories.map((c) => ({ value: c, label: c }))}
              onChange={setCategory}
              searchable
            />
            <Button label="Add deduction" onPress={save} style={{ marginBottom: spacing.lg }} />
            <Caption style={{ marginBottom: spacing.sm }}>
              {filtered.length} deduction{filtered.length === 1 ? '' : 's'} this year
            </Caption>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No deductions yet" body="Add write-offs you plan to claim this year." />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Body bold>{item.name}</Body>
              <Caption>
                {item.category} · {item.taxYear}
              </Caption>
            </View>
            <Text style={{ fontWeight: '700', color: theme.text, marginRight: 10 }}>
              {formatMoney(item.amount, currency)}
            </Text>
            <Button
              label="×"
              variant="ghost"
              onPress={() => removeDeduction(item.id)}
              style={{ paddingVertical: 6, paddingHorizontal: 10 }}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
