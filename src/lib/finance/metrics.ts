import { expenseCategoryLabels } from '@/src/data/labels';
import { DebtItem, Expense, ExpenseCategory, TaxProfile } from '@/src/types';

export function monthlyIncomeFromProfile(
  taxProfile: TaxProfile,
  settingsMonthly?: number
): number {
  if (settingsMonthly != null && Number.isFinite(settingsMonthly) && settingsMonthly > 0) {
    return settingsMonthly;
  }
  const annual = (taxProfile.annualGrossIncome || 0) + (taxProfile.otherIncome || 0);
  return annual / 12;
}

export function expensesInMonth(
  expenses: Expense[],
  month?: number,
  year?: number
): Expense[] {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + (e.amount || 0), 0);
}

export function categoryBreakdown(
  expenses: Expense[]
): { key: ExpenseCategory; label: string; amount: number; colorIndex: number }[] {
  const map = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) || 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([key, amount], i) => ({
      key,
      label: expenseCategoryLabels[key],
      amount,
      colorIndex: i,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Last N complete-ish months of totals (including current). */
export function monthlyExpenseSeries(
  expenses: Expense[],
  monthsBack = 6
): { key: string; label: string; amount: number; year: number; month: number }[] {
  const now = new Date();
  const series: { key: string; label: string; amount: number; year: number; month: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const amount = sumExpenses(expensesInMonth(expenses, m, y));
    series.push({
      key: `${y}-${m}`,
      label: d.toLocaleString(undefined, { month: 'short' }),
      amount,
      year: y,
      month: m,
    });
  }
  return series;
}

export function cashflowSnapshot(params: {
  monthlyIncome: number;
  monthExpenses: number;
  savingsBalance: number;
}): {
  income: number;
  expenses: number;
  /** Income − expenses this month (can be negative). */
  monthlySavings: number;
  savingsRate: number;
  savingsBalance: number;
} {
  const income = Math.max(0, params.monthlyIncome);
  const expenses = Math.max(0, params.monthExpenses);
  const monthlySavings = income - expenses;
  const savingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;
  return {
    income,
    expenses,
    monthlySavings,
    savingsRate,
    savingsBalance: Math.max(0, params.savingsBalance),
  };
}

/** Estimated annual interest cost ≈ balance × APR. */
export function annualInterestCost(debt: DebtItem): number {
  return (debt.balance || 0) * ((debt.aprPercent || 0) / 100);
}

export function monthlyInterestCost(debt: DebtItem): number {
  return annualInterestCost(debt) / 12;
}

export function debtSummary(debts: DebtItem[]): {
  totalBalance: number;
  totalAnnualCof: number;
  totalMonthlyCof: number;
  /** Weighted average APR by balance. */
  weightedApr: number;
  byKind: { kind: string; balance: number; annualCof: number; count: number }[];
} {
  const totalBalance = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const totalAnnualCof = debts.reduce((s, d) => s + annualInterestCost(d), 0);
  const weightedApr =
    totalBalance > 0
      ? debts.reduce((s, d) => s + (d.balance || 0) * (d.aprPercent || 0), 0) / totalBalance
      : 0;

  const kindMap = new Map<string, { balance: number; annualCof: number; count: number }>();
  for (const d of debts) {
    const cur = kindMap.get(d.kind) || { balance: 0, annualCof: 0, count: 0 };
    cur.balance += d.balance || 0;
    cur.annualCof += annualInterestCost(d);
    cur.count += 1;
    kindMap.set(d.kind, cur);
  }

  const byKind = Array.from(kindMap.entries())
    .map(([kind, v]) => ({ kind, ...v }))
    .sort((a, b) => b.balance - a.balance);

  return {
    totalBalance,
    totalAnnualCof,
    totalMonthlyCof: totalAnnualCof / 12,
    weightedApr,
    byKind,
  };
}
