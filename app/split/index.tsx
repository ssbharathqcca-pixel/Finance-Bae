import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Body,
  Button,
  Caption,
  EmptyState,
  FadeIn,
  SectionHeader,
} from '@/src/components/ui';
import { splitKindEmoji, splitKindLabels } from '@/src/data/labels';
import { useTheme } from '@/src/hooks/useTheme';
import { formatMoney } from '@/src/lib/format';
import { groupTotals } from '@/src/lib/split/settle';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing } from '@/src/theme';

export default function SplitListScreen() {
  const theme = useTheme();
  const groups = useAppStore((s) => s.splitGroups);
  const removeSplitGroup = useAppStore((s) => s.removeSplitGroup);
  const currency = useAppStore((s) => s.settings.currency);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['bottom']}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Body muted>
              Split trips, house parties, get-togethers, and dates fairly. Only names and amounts —
              no bank details.
            </Body>
            <Button
              label="+ New split group"
              onPress={() => router.push('/split/create' as any)}
              style={{ marginTop: spacing.md }}
            />
            <SectionHeader title="Your groups" />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No shared bills yet"
            body="Create a group for a trip or party, add friends, and log who paid what."
          />
        }
        renderItem={({ item, index }) => {
          const totals = groupTotals(item);
          const cur = item.currency || currency;
          const netLabel =
            totals.yourNet > 0.009
              ? `You're owed ${formatMoney(totals.yourNet, cur)}`
              : totals.yourNet < -0.009
                ? `You owe ${formatMoney(Math.abs(totals.yourNet), cur)}`
                : 'You are settled';
          return (
            <FadeIn delay={Math.min(index * 40, 200)}>
              <Pressable
                onPress={() => router.push(`/split/${item.id}` as any)}
                onLongPress={() => removeSplitGroup(item.id)}
                style={[
                  styles.card,
                  { backgroundColor: theme.bgElevated, borderColor: theme.border },
                ]}
              >
                <View style={styles.row}>
                  <Text style={{ fontSize: 28 }}>{splitKindEmoji[item.kind]}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Body bold>{item.name}</Body>
                    <Caption>
                      {splitKindLabels[item.kind]} · {item.participants.length} people ·{' '}
                      {totals.itemCount} items
                    </Caption>
                  </View>
                </View>
                <View style={styles.footer}>
                  <Body bold>{formatMoney(totals.totalSpent, cur)}</Body>
                  <Caption
                    style={{
                      color:
                        totals.yourNet > 0.009
                          ? theme.primary
                          : totals.yourNet < -0.009
                            ? theme.danger
                            : theme.textSecondary,
                      fontWeight: '600',
                    }}
                  >
                    {netLabel}
                  </Caption>
                </View>
              </Pressable>
            </FadeIn>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
