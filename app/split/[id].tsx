import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Input,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { splitKindEmoji, splitKindLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney } from '@/src/lib/format';
import {
  computeBalances,
  groupTotals,
  nameById,
  suggestSettlements,
} from '@/src/lib/split/settle';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function SplitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const group = useAppStore((s) => s.splitGroups.find((g) => g.id === id));
  const addSplitItem = useAppStore((s) => s.addSplitItem);
  const removeSplitItem = useAppStore((s) => s.removeSplitItem);
  const addSplitParticipant = useAppStore((s) => s.addSplitParticipant);
  const removeSplitParticipant = useAppStore((s) => s.removeSplitParticipant);
  const removeSplitGroup = useAppStore((s) => s.removeSplitGroup);
  const addExpense = useAppStore((s) => s.addExpense);
  const displayName = useAppStore((s) => s.settings.displayName);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState<string | undefined>();
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [newFriend, setNewFriend] = useState('');

  const balances = useMemo(() => (group ? computeBalances(group) : {}), [group]);
  const settlements = useMemo(() => suggestSettlements(balances), [balances]);
  const totals = useMemo(() => (group ? groupTotals(group) : null), [group]);

  if (!group) {
    return (
      <Screen>
        <Body>This split group was deleted or not found.</Body>
        <Button label="Back to splits" onPress={() => router.replace('/split' as any)} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const currency = group.currency;
  const defaultPayer = paidById ?? group.participants.find((p) => p.isYou)?.id ?? group.participants[0]?.id;

  const toggleShare = (pid: string) => {
    setShareIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  const addItem = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Check inputs', 'Enter a title and a positive amount.');
      return;
    }
    if (!defaultPayer) {
      Alert.alert('No participants', 'Add at least one person first.');
      return;
    }
    addSplitItem(group.id, {
      title: title.trim(),
      amount: value,
      paidById: defaultPayer,
      sharedByIds: shareIds,
      splitMode: 'equal',
      date: new Date().toISOString().slice(0, 10),
    });
    setTitle('');
    setAmount('');
    setShareIds([]);
  };

  const addFriend = () => {
    if (!newFriend.trim()) return;
    addSplitParticipant(group.id, newFriend.trim());
    setNewFriend('');
  };

  const logMyShareExpense = () => {
    const you = group.participants.find((p) => p.isYou);
    if (!you || !totals) return;
    // Your fair share of total ≈ sum of item shares for you
    // From balances: total paid by you - yourNet = your share of expenses
    const paidByYou = group.items
      .filter((it) => it.paidById === you.id)
      .reduce((s, it) => s + it.amount, 0);
    const yourShare = Math.round((paidByYou - (balances[you.id] ?? 0)) * 100) / 100;
    if (yourShare <= 0) {
      Alert.alert('Nothing to log', 'Your calculated share is zero right now.');
      return;
    }
    const category =
      group.kind === 'trip'
        ? 'travel'
        : group.kind === 'dinner_date' || group.kind === 'lunch_date'
          ? 'dining'
          : group.kind === 'house_party' || group.kind === 'get_together'
            ? 'parties'
            : 'other';
    addExpense({
      title: `${group.name} · my share`,
      amount: yourShare,
      category,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'other',
      budgetId: group.budgetId,
      source: 'manual',
      notes: `From split group “${group.name}”`,
    });
    if (Platform.OS === 'web') {
      window.alert(`Logged ${formatMoney(yourShare, currency)} to expenses.`);
    } else {
      Alert.alert('Logged', `${formatMoney(yourShare, currency)} added to your expenses.`);
    }
  };

  const deleteGroup = () => {
    const run = () => {
      removeSplitGroup(group.id);
      router.replace('/split' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete “${group.name}”?`)) run();
      return;
    }
    Alert.alert('Delete group', `Remove “${group.name}” and all its bills?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={{ fontSize: 32 }}>{splitKindEmoji[group.kind]}</Text>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Body bold style={{ fontSize: 20 }}>
              {group.name}
            </Body>
            <Caption>
              {splitKindLabels[group.kind]} · {formatMoney(totals?.totalSpent ?? 0, currency)} total
            </Caption>
          </View>
        </View>
        {group.notes ? <Caption style={{ marginBottom: spacing.md }}>{group.notes}</Caption> : null}

        <Card style={{ backgroundColor: theme.gadget.parties.bg }}>
          <Caption>Your position</Caption>
          <Text style={[styles.big, { color: theme.text }]}>
            {(totals?.yourNet ?? 0) > 0.009
              ? `+${formatMoney(totals!.yourNet, currency)}`
              : (totals?.yourNet ?? 0) < -0.009
                ? `−${formatMoney(Math.abs(totals!.yourNet), currency)}`
                : formatMoney(0, currency)}
          </Text>
          <Caption style={{ marginTop: 4 }}>
            {(totals?.yourNet ?? 0) > 0.009
              ? 'Others owe you'
              : (totals?.yourNet ?? 0) < -0.009
                ? 'You owe the group'
                : 'All square'}
          </Caption>
        </Card>

        <SectionHeader title="Settle up" />
        {settlements.length === 0 ? (
          <Caption style={{ marginBottom: spacing.md }}>No transfers needed — balanced.</Caption>
        ) : (
          settlements.map((t, i) => (
            <View
              key={`${t.fromId}-${t.toId}-${i}`}
              style={[styles.settleRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
            >
              <Body>
                <Body bold>{nameById(group.participants, t.fromId)}</Body>
                {' → '}
                <Body bold>{nameById(group.participants, t.toId)}</Body>
              </Body>
              <Text style={{ fontWeight: '700', color: theme.primary }}>
                {formatMoney(t.amount, currency)}
              </Text>
            </View>
          ))
        )}

        <SectionHeader title="Balances" />
        {group.participants.map((p) => {
          const bal = balances[p.id] ?? 0;
          return (
            <View key={p.id} style={styles.balanceRow}>
              <Body>
                {p.name}
                {p.isYou ? ' (you)' : ''}
              </Body>
              <Text
                style={{
                  fontWeight: '700',
                  color: bal > 0.009 ? theme.primary : bal < -0.009 ? theme.danger : theme.text,
                }}
              >
                {bal > 0.009 ? '+' : ''}
                {formatMoney(bal, currency)}
              </Text>
            </View>
          );
        })}

        <SectionHeader title="People" />
        {group.participants.map((p) => (
          <Pressable
            key={p.id}
            onLongPress={() => {
              if (p.isYou) return;
              removeSplitParticipant(group.id, p.id);
            }}
            style={[
              styles.personRow,
              { borderColor: theme.border, backgroundColor: theme.bgElevated },
            ]}
          >
            <Body bold>
              {p.name}
              {p.isYou ? ' (you)' : ''}
            </Body>
            {!p.isYou ? <Caption>Long-press to remove</Caption> : null}
          </Pressable>
        ))}
        <Caption style={{ marginBottom: spacing.sm, marginTop: 4 }}>
          Long-press a friend to remove.
        </Caption>
        <View style={styles.addFriendRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Add friend"
              placeholder="Name only"
              value={newFriend}
              onChangeText={setNewFriend}
            />
          </View>
          <Button label="Add" onPress={addFriend} style={{ marginTop: 22, marginLeft: 8 }} />
        </View>

        <SectionHeader title="Add expense" />
        <Input label="What for?" placeholder="Dinner, gas, Airbnb…" value={title} onChangeText={setTitle} />
        <Input
          label={`Amount (${currency})`}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Caption style={{ marginBottom: 6 }}>Who paid?</Caption>
        <View style={styles.chips}>
          {group.participants.map((p) => (
            <Chip
              key={p.id}
              label={p.isYou ? `${p.name} (you)` : p.name}
              active={defaultPayer === p.id}
              onPress={() => setPaidById(p.id)}
            />
          ))}
        </View>
        <Caption style={{ marginBottom: 6 }}>Split between</Caption>
        <View style={styles.chips}>
          <Chip
            label="Everyone equally"
            active={shareIds.length === 0}
            onPress={() => setShareIds([])}
          />
          {group.participants.map((p) => (
            <Chip
              key={p.id}
              label={shareIds.includes(p.id) ? `✓ ${p.name}` : p.name}
              active={shareIds.includes(p.id)}
              onPress={() => toggleShare(p.id)}
            />
          ))}
        </View>
        <Caption style={{ marginBottom: spacing.sm }}>
          Tip: pick “Everyone” or tap people (selected show ✓). Current:{' '}
          {shareIds.length
            ? shareIds.map((pid) => nameById(group.participants, pid)).join(', ')
            : 'everyone'}
        </Caption>
        <Button label="Add to split" onPress={addItem} />

        <SectionHeader title="Line items" />
        {group.items.length === 0 ? (
          <Caption>No bills yet — add dinner, tickets, groceries…</Caption>
        ) : (
          group.items.map((item) => (
            <View
              key={item.id}
              style={[styles.itemRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
            >
              <View style={{ flex: 1 }}>
                <Body bold>{item.title}</Body>
                <Caption>
                  Paid by {nameById(group.participants, item.paidById)}
                  {item.sharedByIds.length
                    ? ` · split: ${item.sharedByIds.map((sid) => nameById(group.participants, sid)).join(', ')}`
                    : ' · split: everyone'}
                </Caption>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '700', color: theme.text }}>
                  {formatMoney(item.amount, currency)}
                </Text>
                <Button
                  label="×"
                  variant="ghost"
                  onPress={() => removeSplitItem(group.id, item.id)}
                  style={{ paddingVertical: 4, paddingHorizontal: 8 }}
                />
              </View>
            </View>
          ))
        )}

        <SectionHeader title="Actions" />
        <Button label="Log my share to expenses" variant="secondary" onPress={logMyShareExpense} />
        <Button
          label="Delete group"
          variant="danger"
          onPress={deleteGroup}
          style={{ marginTop: spacing.sm }}
        />
        <Caption style={{ marginTop: spacing.lg }}>
          Settlements are suggestions only. GBP never moves money or stores bank accounts — just
          names and amounts for {displayName || 'you'} and friends.
        </Caption>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  big: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  personRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addFriendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});
