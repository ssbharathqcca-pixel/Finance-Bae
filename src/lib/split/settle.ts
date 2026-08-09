/**
 * Shared bill balances + settlement suggestions for trips / parties.
 * All math is local; only names and amounts are used.
 */

import { SettlementTransfer, SplitGroup, SplitLineItem, SplitParticipant } from '@/src/types';

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function participantsForItem(
  item: SplitLineItem,
  all: SplitParticipant[]
): SplitParticipant[] {
  if (!item.sharedByIds?.length) return all;
  const set = new Set(item.sharedByIds);
  const filtered = all.filter((p) => set.has(p.id));
  return filtered.length ? filtered : all;
}

/**
 * Net balance per participant:
 *   positive = others owe them (they overpaid)
 *   negative = they owe others (they underpaid)
 */
export function computeBalances(group: SplitGroup): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const p of group.participants) balances[p.id] = 0;

  for (const item of group.items) {
    const amount = Number(item.amount) || 0;
    if (amount <= 0) continue;

    if (balances[item.paidById] == null) balances[item.paidById] = 0;
    balances[item.paidById] = roundMoney(balances[item.paidById] + amount);

    const sharers = participantsForItem(item, group.participants);
    if (!sharers.length) continue;

    if (item.splitMode === 'shares' && item.shares) {
      const totalWeight = sharers.reduce((s, p) => s + (item.shares?.[p.id] ?? 0), 0);
      if (totalWeight > 0) {
        for (const p of sharers) {
          const w = item.shares[p.id] ?? 0;
          const share = roundMoney((amount * w) / totalWeight);
          balances[p.id] = roundMoney((balances[p.id] ?? 0) - share);
        }
        // Fix residual cents on last sharer
        const assigned = sharers.reduce((s, p) => {
          const w = item.shares![p.id] ?? 0;
          return s + roundMoney((amount * w) / totalWeight);
        }, 0);
        const residual = roundMoney(amount - assigned);
        if (residual !== 0) {
          const last = sharers[sharers.length - 1];
          balances[last.id] = roundMoney((balances[last.id] ?? 0) - residual);
        }
        continue;
      }
    }

    // Equal split with residual on last person
    const n = sharers.length;
    const base = Math.floor((amount * 100) / n) / 100;
    let allocated = 0;
    sharers.forEach((p, i) => {
      const share = i === n - 1 ? roundMoney(amount - allocated) : base;
      allocated = roundMoney(allocated + share);
      balances[p.id] = roundMoney((balances[p.id] ?? 0) - share);
    });
  }

  return balances;
}

/** Greedy minimize number of transfers from debtors → creditors. */
export function suggestSettlements(balances: Record<string, number>): SettlementTransfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, bal] of Object.entries(balances)) {
    const v = roundMoney(bal);
    if (v < -0.009) debtors.push({ id, amount: -v });
    else if (v > 0.009) creditors.push({ id, amount: v });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const amount = roundMoney(pay);
    if (amount > 0) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount,
      });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount <= 0.009) i++;
    if (creditors[j].amount <= 0.009) j++;
  }

  return transfers;
}

export function groupTotals(group: SplitGroup): {
  totalSpent: number;
  itemCount: number;
  yourNet: number;
  youParticipant?: SplitParticipant;
} {
  const totalSpent = roundMoney(
    group.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  );
  const balances = computeBalances(group);
  const you = group.participants.find((p) => p.isYou);
  return {
    totalSpent,
    itemCount: group.items.length,
    yourNet: you ? balances[you.id] ?? 0 : 0,
    youParticipant: you,
  };
}

export function nameById(participants: SplitParticipant[], id: string): string {
  return participants.find((p) => p.id === id)?.name ?? 'Someone';
}
