import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  AppSettings,
  Budget,
  DebtItem,
  Deduction,
  EvidenceItem,
  Expense,
  PetProfile,
  SplitGroup,
  SplitLineItem,
  SplitParticipant,
  TaxProfile,
} from '@/src/types';
import { deleteAttachments } from '@/src/lib/evidenceAttachments';
import { uid, sumBy } from '@/src/lib/format';

const currentYear = new Date().getFullYear();

interface AppState {
  hydrated: boolean;
  settings: AppSettings;
  taxProfile: TaxProfile;
  expenses: Expense[];
  budgets: Budget[];
  deductions: Deduction[];
  evidence: EvidenceItem[];
  pets: PetProfile[];
  splitGroups: SplitGroup[];
  debts: DebtItem[];

  setHydrated: (v: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateTaxProfile: (partial: Partial<TaxProfile>) => void;

  addExpense: (input: Omit<Expense, 'id' | 'createdAt'>) => void;
  addExpensesBulk: (inputs: Omit<Expense, 'id' | 'createdAt'>[]) => number;
  removeExpense: (id: string) => void;

  addBudget: (input: Omit<Budget, 'id' | 'createdAt'>) => void;
  removeBudget: (id: string) => void;

  addDeduction: (
    input: Omit<Deduction, 'id' | 'createdAt' | 'evidenceIds'> & { evidenceIds?: string[] }
  ) => void;
  removeDeduction: (id: string) => void;

  addEvidence: (input: Omit<EvidenceItem, 'id' | 'createdAt'>) => void;
  removeEvidence: (id: string) => void;

  addPet: (input: Omit<PetProfile, 'id' | 'createdAt'>) => void;
  removePet: (id: string) => void;

  addSplitGroup: (
    input: Omit<SplitGroup, 'id' | 'createdAt' | 'items' | 'participants'> & {
      participants?: Omit<SplitParticipant, 'id'>[];
      items?: Omit<SplitLineItem, 'id' | 'createdAt'>[];
    }
  ) => string;
  removeSplitGroup: (id: string) => void;
  updateSplitGroup: (id: string, partial: Partial<Pick<SplitGroup, 'name' | 'notes' | 'kind' | 'budgetId' | 'currency'>>) => void;
  addSplitParticipant: (groupId: string, name: string, isYou?: boolean) => void;
  removeSplitParticipant: (groupId: string, participantId: string) => void;
  addSplitItem: (groupId: string, item: Omit<SplitLineItem, 'id' | 'createdAt'>) => void;
  removeSplitItem: (groupId: string, itemId: string) => void;

  addDebt: (input: Omit<DebtItem, 'id' | 'createdAt'>) => void;
  updateDebt: (id: string, partial: Partial<Omit<DebtItem, 'id' | 'createdAt'>>) => void;
  removeDebt: (id: string) => void;

  // selectors helpers
  spentInBudget: (budgetId: string) => number;
  monthExpenseTotal: (month?: number, year?: number) => number;
  deductionsTotalForYear: (year?: number, country?: 'US' | 'CA') => number;
  getSplitGroup: (id: string) => SplitGroup | undefined;
}

const seedBudgets: Budget[] = [
  {
    id: 'bud_party',
    name: 'Summer house party',
    kind: 'house_party',
    limit: 450,
    currency: 'USD',
    startDate: new Date().toISOString().slice(0, 10),
    notes: 'Food, drinks, decor',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bud_trip',
    name: 'Long weekend trip',
    kind: 'trip',
    limit: 1200,
    currency: 'USD',
    startDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bud_home',
    name: 'Home down payment fund',
    kind: 'home_downpayment',
    limit: 40000,
    currency: 'USD',
    startDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  },
];

const seedExpenses: Expense[] = [
  {
    id: 'exp_1',
    title: 'Grocery run',
    amount: 86.4,
    category: 'food',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp_2',
    title: 'Vet checkup',
    amount: 120,
    category: 'pets',
    date: new Date().toISOString().slice(0, 10),
    notes: 'Annual wellness',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp_3',
    title: 'Date night dinner',
    amount: 94.5,
    category: 'dining',
    date: new Date().toISOString().slice(0, 10),
    budgetId: undefined,
    createdAt: new Date().toISOString(),
  },
];

const seedPets: PetProfile[] = [
  {
    id: 'pet_1',
    name: 'Buddy',
    species: 'Dog',
    monthlyBudget: 180,
    notes: 'Food, treats, grooming',
    createdAt: new Date().toISOString(),
  },
];

const seedYouId = 'part_you';
const seedAlexId = 'part_alex';
const seedSamId = 'part_sam';

const seedSplitGroups: SplitGroup[] = [
  {
    id: 'split_party_demo',
    name: 'Summer house party',
    kind: 'house_party',
    currency: 'USD',
    budgetId: 'bud_party',
    participants: [
      { id: seedYouId, name: 'You', isYou: true },
      { id: seedAlexId, name: 'Alex' },
      { id: seedSamId, name: 'Sam' },
    ],
    items: [
      {
        id: 'sli_1',
        title: 'Snacks & drinks',
        amount: 86,
        paidById: seedYouId,
        sharedByIds: [],
        splitMode: 'equal',
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sli_2',
        title: 'Decorations',
        amount: 42,
        paidById: seedAlexId,
        sharedByIds: [],
        splitMode: 'equal',
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      },
    ],
    notes: 'Demo split — delete or edit anytime.',
    createdAt: new Date().toISOString(),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: {
        displayName: 'Traveler',
        preferredCountry: 'US',
        currency: 'USD',
        darkMode: 'system',
        monthlyIncome: 5200,
        savingsBalance: 12500,
      },
      taxProfile: {
        country: 'US',
        filingStatus: 'single',
        provinceOrState: 'CA',
        annualGrossIncome: 78000,
        otherIncome: 0,
        estimatedWithholding: 12000,
        dependents: 0,
        taxYear: currentYear,
      },
      expenses: seedExpenses,
      budgets: seedBudgets,
      deductions: [],
      evidence: [],
      pets: seedPets,
      splitGroups: seedSplitGroups,
      debts: [
        {
          id: 'debt_mortgage',
          name: 'Primary mortgage',
          kind: 'home_loan',
          balance: 285000,
          aprPercent: 6.4,
          minPayment: 1850,
          lender: 'Home lender',
          currency: 'USD',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'debt_cc',
          name: 'Everyday rewards card',
          kind: 'credit_card',
          balance: 3200,
          aprPercent: 22.9,
          minPayment: 95,
          lender: 'Card issuer',
          currency: 'USD',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'debt_hand',
          name: 'Family hand loan',
          kind: 'hand_loan',
          balance: 2500,
          aprPercent: 0,
          minPayment: 200,
          lender: 'Family',
          notes: 'Interest-free — still track principal',
          currency: 'USD',
          createdAt: new Date().toISOString(),
        },
      ],

      setHydrated: (v) => set({ hydrated: v }),
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      updateTaxProfile: (partial) =>
        set((s) => ({ taxProfile: { ...s.taxProfile, ...partial } })),

      addExpense: (input) =>
        set((s) => ({
          expenses: [
            {
              ...input,
              source: input.source ?? 'manual',
              id: uid('exp'),
              createdAt: new Date().toISOString(),
            },
            ...s.expenses,
          ],
        })),
      addExpensesBulk: (inputs) => {
        if (!inputs.length) return 0;
        const stamped = inputs.map((input) => ({
          ...input,
          source: input.source ?? 'manual',
          id: uid('exp'),
          createdAt: new Date().toISOString(),
        }));
        set((s) => ({ expenses: [...stamped, ...s.expenses] }));
        return stamped.length;
      },
      removeExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      addBudget: (input) =>
        set((s) => ({
          budgets: [
            {
              ...input,
              id: uid('bud'),
              createdAt: new Date().toISOString(),
            },
            ...s.budgets,
          ],
        })),
      removeBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addDeduction: (input) =>
        set((s) => ({
          deductions: [
            {
              ...input,
              evidenceIds: input.evidenceIds ?? [],
              id: uid('ded'),
              createdAt: new Date().toISOString(),
            },
            ...s.deductions,
          ],
        })),
      removeDeduction: (id) =>
        set((s) => ({ deductions: s.deductions.filter((d) => d.id !== id) })),

      addEvidence: (input) =>
        set((s) => ({
          evidence: [
            {
              ...input,
              attachments: input.attachments ?? [],
              id: uid('ev'),
              createdAt: new Date().toISOString(),
            },
            ...s.evidence,
          ],
        })),
      removeEvidence: (id) => {
        const item = get().evidence.find((e) => e.id === id);
        if (item?.attachments?.length) {
          void deleteAttachments(item.attachments);
        }
        set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) }));
      },

      addPet: (input) =>
        set((s) => ({
          pets: [
            {
              ...input,
              id: uid('pet'),
              createdAt: new Date().toISOString(),
            },
            ...s.pets,
          ],
        })),
      removePet: (id) => set((s) => ({ pets: s.pets.filter((p) => p.id !== id) })),

      addSplitGroup: (input) => {
        const id = uid('split');
        const participants: SplitParticipant[] = (input.participants?.length
          ? input.participants
          : [{ name: get().settings.displayName || 'You', isYou: true }]
        ).map((p) => ({
          id: uid('part'),
          name: p.name.trim() || 'Friend',
          isYou: p.isYou,
        }));
        // Ensure exactly one "you" if any marked
        if (!participants.some((p) => p.isYou) && participants[0]) {
          participants[0] = { ...participants[0], isYou: true };
        }
        const items: SplitLineItem[] = (input.items ?? []).map((it) => ({
          ...it,
          id: uid('sli'),
          createdAt: new Date().toISOString(),
        }));
        const group: SplitGroup = {
          id,
          name: input.name,
          kind: input.kind,
          currency: input.currency,
          budgetId: input.budgetId,
          notes: input.notes,
          participants,
          items,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ splitGroups: [group, ...s.splitGroups] }));
        return id;
      },

      removeSplitGroup: (id) =>
        set((s) => ({ splitGroups: s.splitGroups.filter((g) => g.id !== id) })),

      updateSplitGroup: (id, partial) =>
        set((s) => ({
          splitGroups: s.splitGroups.map((g) => (g.id === id ? { ...g, ...partial } : g)),
        })),

      addSplitParticipant: (groupId, name, isYou) =>
        set((s) => ({
          splitGroups: s.splitGroups.map((g) => {
            if (g.id !== groupId) return g;
            const participant: SplitParticipant = {
              id: uid('part'),
              name: name.trim() || 'Friend',
              isYou: !!isYou,
            };
            let participants = [...g.participants, participant];
            if (isYou) {
              participants = participants.map((p) =>
                p.id === participant.id ? p : { ...p, isYou: false }
              );
            }
            return { ...g, participants };
          }),
        })),

      removeSplitParticipant: (groupId, participantId) =>
        set((s) => ({
          splitGroups: s.splitGroups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              participants: g.participants.filter((p) => p.id !== participantId),
              items: g.items
                .filter((it) => it.paidById !== participantId)
                .map((it) => ({
                  ...it,
                  sharedByIds: it.sharedByIds.filter((id) => id !== participantId),
                })),
            };
          }),
        })),

      addSplitItem: (groupId, item) =>
        set((s) => ({
          splitGroups: s.splitGroups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: [
                {
                  ...item,
                  id: uid('sli'),
                  createdAt: new Date().toISOString(),
                },
                ...g.items,
              ],
            };
          }),
        })),

      removeSplitItem: (groupId, itemId) =>
        set((s) => ({
          splitGroups: s.splitGroups.map((g) =>
            g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== itemId) } : g
          ),
        })),

      spentInBudget: (budgetId) =>
        sumBy(
          get().expenses.filter((e) => e.budgetId === budgetId),
          (e) => e.amount
        ),

      monthExpenseTotal: (month, year) => {
        const now = new Date();
        const m = month ?? now.getMonth();
        const y = year ?? now.getFullYear();
        return sumBy(
          get().expenses.filter((e) => {
            const d = new Date(e.date);
            return d.getMonth() === m && d.getFullYear() === y;
          }),
          (e) => e.amount
        );
      },

      deductionsTotalForYear: (year, country) => {
        const y = year ?? get().taxProfile.taxYear;
        const c = country ?? get().taxProfile.country;
        return sumBy(
          get().deductions.filter((d) => d.taxYear === y && d.country === c),
          (d) => d.amount
        );
      },

      getSplitGroup: (id) => get().splitGroups.find((g) => g.id === id),

      addDebt: (input) =>
        set((s) => ({
          debts: [
            {
              ...input,
              id: uid('debt'),
              createdAt: new Date().toISOString(),
            },
            ...s.debts,
          ],
        })),
      updateDebt: (id, partial) =>
        set((s) => ({
          debts: s.debts.map((d) => (d.id === id ? { ...d, ...partial } : d)),
        })),
      removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
    }),
    {
      name: 'gbp-finance-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        settings: s.settings,
        taxProfile: s.taxProfile,
        expenses: s.expenses,
        budgets: s.budgets,
        deductions: s.deductions,
        evidence: s.evidence,
        pets: s.pets,
        splitGroups: s.splitGroups,
        debts: s.debts,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !Array.isArray((state as AppState).splitGroups)) {
          (state as AppState).splitGroups = [];
        }
        if (state && !Array.isArray((state as AppState).debts)) {
          (state as AppState).debts = [];
        }
        state?.setHydrated(true);
      },
    }
  )
);
