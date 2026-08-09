import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Caption, Chip, Input, Screen } from '@/src/components/ui';
import { splitKindLabels } from '@/src/data/labels';
import { useAppStore } from '@/src/store/useAppStore';
import { SplitEventKind } from '@/src/types';
import { spacing } from '@/src/theme';

const kinds = Object.keys(splitKindLabels) as SplitEventKind[];

export default function CreateSplitScreen() {
  const addSplitGroup = useAppStore((s) => s.addSplitGroup);
  const displayName = useAppStore((s) => s.settings.displayName);
  const currency = useAppStore((s) => s.settings.currency);
  const budgets = useAppStore((s) => s.budgets);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<SplitEventKind>('trip');
  const [friends, setFriends] = useState('Alex, Sam');
  const [notes, setNotes] = useState('');
  const [budgetId, setBudgetId] = useState<string | undefined>(undefined);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this trip or party a name.');
      return;
    }
    const extra = friends
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const id = addSplitGroup({
      name: name.trim(),
      kind,
      currency,
      budgetId: budgetId || undefined,
      notes: notes.trim() || undefined,
      participants: [
        { name: displayName || 'You', isYou: true },
        ...extra.map((n) => ({ name: n, isYou: false })),
      ],
    });
    router.replace(`/split/${id}` as any);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Caption style={{ marginBottom: spacing.sm }}>
          Shared ledger by first name only — no account numbers.
        </Caption>

        <Input
          label="Group name"
          placeholder="Lake weekend · Birthday bash"
          value={name}
          onChangeText={setName}
        />
        <Caption style={{ marginBottom: 6 }}>Event type</Caption>
        <View style={styles.chips}>
          {kinds.map((k) => (
            <Chip
              key={k}
              label={splitKindLabels[k]}
              active={kind === k}
              onPress={() => setKind(k)}
            />
          ))}
        </View>
        <Input
          label="Friends (comma-separated)"
          placeholder="Alex, Sam, Jordan"
          value={friends}
          onChangeText={setFriends}
        />
        <Caption style={{ marginBottom: spacing.sm }}>
          You ({displayName || 'You'}) are added automatically.
        </Caption>
        <Input
          label="Notes (optional)"
          placeholder="Optional"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        {budgets.length > 0 ? (
          <>
            <Caption style={{ marginBottom: 6 }}>Link budget (optional)</Caption>
            <View style={styles.chips}>
              <Chip label="None" active={!budgetId} onPress={() => setBudgetId(undefined)} />
              {budgets.map((b) => (
                <Chip
                  key={b.id}
                  label={b.name}
                  active={budgetId === b.id}
                  onPress={() => setBudgetId(b.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Button label="Create group" onPress={save} />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
});
