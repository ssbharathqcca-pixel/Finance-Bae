import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Caption, EmptyState, Input, ProgressBar, Screen } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { clamp, formatMoney, sumBy } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function PetsScreen() {
  const theme = useTheme();
  const pets = useAppStore((s) => s.pets);
  const expenses = useAppStore((s) => s.expenses);
  const addPet = useAppStore((s) => s.addPet);
  const removePet = useAppStore((s) => s.removePet);
  const currency = useAppStore((s) => s.settings.currency);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [budget, setBudget] = useState('150');

  const monthPetSpend = useMemo(() => {
    const now = new Date();
    return sumBy(
      expenses.filter((e) => {
        if (e.category !== 'pets') return false;
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
      (e) => e.amount
    );
  }, [expenses]);

  const totalBudget = sumBy(pets, (p) => p.monthlyBudget);

  const save = () => {
    const value = parseFloat(budget.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Check inputs', 'Pet name and monthly budget required.');
      return;
    }
    addPet({
      name: name.trim(),
      species: species.trim() || 'Pet',
      monthlyBudget: value,
    });
    setName('');
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={pets}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Body muted>
              Track food, vet visits, grooming, and enrichment. Log pet expenses under the Pets category
              to fill these envelopes.
            </Body>
            <View style={[styles.summary, { backgroundColor: theme.gadget.pets.bg, borderColor: theme.border }]}>
              <Caption>This month pet spend</Caption>
              <Text style={[styles.big, { color: theme.text }]}>
                {formatMoney(monthPetSpend, currency)}
              </Text>
              <Body muted style={{ marginTop: 4 }}>
                Combined budgets {formatMoney(totalBudget, currency)}
              </Body>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar
                  progress={totalBudget > 0 ? clamp((monthPetSpend / totalBudget) * 100, 0, 100) : 0}
                  color={theme.gadget.pets.accent}
                />
              </View>
            </View>

            <Input label="Pet name" placeholder="Buddy" value={name} onChangeText={setName} />
            <Input label="Species / breed" placeholder="Dog · Golden Retriever" value={species} onChangeText={setSpecies} />
            <Input
              label={`Monthly budget (${currency})`}
              keyboardType="decimal-pad"
              value={budget}
              onChangeText={setBudget}
            />
            <Button label="Add pet" onPress={save} style={{ marginBottom: spacing.lg }} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No pets yet" body="Add a companion and set a monthly care budget." />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>🐾</Text>
              <View style={{ flex: 1 }}>
                <Body bold>{item.name}</Body>
                <Caption>
                  {item.species} · {formatMoney(item.monthlyBudget, currency)}/mo
                </Caption>
              </View>
              <Button
                label="Remove"
                variant="ghost"
                onPress={() => removePet(item.id)}
                style={{ paddingVertical: 8, paddingHorizontal: 10 }}
              />
            </View>
            {item.notes ? <Caption style={{ marginTop: 8 }}>{item.notes}</Caption> : null}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  summary: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  big: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
});
