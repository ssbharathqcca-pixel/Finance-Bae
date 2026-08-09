import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Select } from '@/src/components/Select';
import { Button, Caption, Input, Screen } from '@/src/components/ui';
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
  const [budgetId, setBudgetId] = useState<string>('');

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
        <Select
          label="Event type"
          value={kind}
          options={kinds.map((k) => ({ value: k, label: splitKindLabels[k] }))}
          onChange={setKind}
          searchable
        />
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
          <Select
            label="Link budget (optional)"
            value={budgetId}
            options={[
              { value: '', label: 'None' },
              ...budgets.map((b) => ({ value: b.id, label: b.name })),
            ]}
            onChange={setBudgetId}
            searchable
          />
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
});
