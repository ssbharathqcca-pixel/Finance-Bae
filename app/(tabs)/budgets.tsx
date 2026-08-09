import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Body,
  Button,
  Caption,
  EmptyState,
  FadeIn,
  ProgressBar,
  SectionHeader,
} from '@/src/components/ui';
import { budgetKindEmoji, budgetKindLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import { clamp, formatMoney } from '@/src/lib/format';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function BudgetsScreen() {
  const theme = useTheme();
  const budgets = useAppStore((s) => s.budgets);
  const spentInBudget = useAppStore((s) => s.spentInBudget);
  const removeBudget = useAppStore((s) => s.removeBudget);
  const currency = useAppStore((s) => s.settings.currency);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={styles.header}>
        <FadeIn>
          <Caption>Life event envelopes</Caption>
          <Text style={[styles.title, { color: theme.text }]}>Budgets</Text>
          <Body muted>Parties · get-togethers · trips · dates · home fund</Body>
        </FadeIn>
        <View style={styles.actions}>
          <Button
            label="+ New budget"
            onPress={() => router.push('/budget/create')}
            style={{ flex: 1 }}
          />
          <Button
            label="Split bills"
            variant="secondary"
            onPress={() => router.push('/split' as any)}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        ListHeaderComponent={<SectionHeader title="Active envelopes" />}
        ListEmptyComponent={
          <EmptyState
            title="No budgets yet"
            body="Create envelopes for house parties, trips, dinner dates, and more."
          />
        }
        renderItem={({ item, index }) => {
          const spent = spentInBudget(item.id);
          // For home fund, treat limit as target savings and show contributions via expenses linked later
          const progress = item.limit > 0 ? clamp((spent / item.limit) * 100, 0, 100) : 0;
          const over = spent > item.limit;
          return (
            <FadeIn delay={Math.min(index * 50, 220)}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.bgElevated, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={{ fontSize: 28 }}>{budgetKindEmoji[item.kind]}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Body bold>{item.name}</Body>
                    <Caption>{budgetKindLabels[item.kind]}</Caption>
                  </View>
                  <Button
                    label="Delete"
                    variant="ghost"
                    onPress={() => removeBudget(item.id)}
                    style={{ paddingVertical: 8, paddingHorizontal: 10 }}
                  />
                </View>
                <View style={styles.amounts}>
                  <Body>
                    {formatMoney(spent, item.currency || currency)}
                    <Caption> spent</Caption>
                  </Body>
                  <Body muted>
                    of {formatMoney(item.limit, item.currency || currency)}
                  </Body>
                </View>
                <ProgressBar
                  progress={progress}
                  color={over ? theme.danger : theme.primary}
                />
                {item.notes ? (
                  <Caption style={{ marginTop: spacing.sm }}>{item.notes}</Caption>
                ) : null}
              </View>
            </FadeIn>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
