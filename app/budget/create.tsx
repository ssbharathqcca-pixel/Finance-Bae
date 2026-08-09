import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Input, Screen } from '@/src/components/ui';
import { budgetKindLabels } from '@/src/data/labels';
import { useAppStore } from '@/src/store/useAppStore';
import { BudgetKind } from '@/src/types';
import { spacing } from '@/src/theme';

const kinds = Object.keys(budgetKindLabels) as BudgetKind[];

export default function CreateBudgetScreen() {
  const addBudget = useAppStore((s) => s.addBudget);
  const currency = useAppStore((s) => s.settings.currency);

  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [kind, setKind] = useState<BudgetKind>('house_party');
  const [notes, setNotes] = useState('');

  const save = () => {
    const value = parseFloat(limit.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Check inputs', 'Please enter a name and a positive budget limit.');
      return;
    }
    addBudget({
      name: name.trim(),
      kind,
      limit: value,
      currency,
      startDate: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Budget name" placeholder="Dinner date downtown" value={name} onChangeText={setName} />
        <Input
          label={`Limit (${currency})`}
          placeholder="250"
          keyboardType="decimal-pad"
          value={limit}
          onChangeText={setLimit}
        />
        <Input label="Notes" placeholder="Who's invited, venue, gifts..." value={notes} onChangeText={setNotes} multiline />

        <View style={styles.chips}>
          {kinds.map((k) => (
            <Chip key={k} label={budgetKindLabels[k]} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>

        <Button label="Create budget" onPress={save} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
});
