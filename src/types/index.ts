export type CountryCode = 'US' | 'CA';
export type CurrencyCode = 'USD' | 'CAD';

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'healthcare'
  | 'entertainment'
  | 'shopping'
  | 'pets'
  | 'travel'
  | 'dining'
  | 'parties'
  | 'tax'
  | 'other';

/** How the purchase was paid — never includes account or card numbers. */
export type PaymentMethod =
  | 'cash'
  | 'debit'
  | 'credit'
  | 'e_transfer'
  | 'check'
  | 'mobile_wallet'
  | 'other'
  | 'unknown';

export type ExpenseSource = 'manual' | 'csv_import';

export type BudgetKind =
  | 'house_party'
  | 'get_together'
  | 'trip'
  | 'dinner_date'
  | 'lunch_date'
  | 'pet'
  | 'home_downpayment'
  | 'custom';

export type NoticeAuthority = 'IRS' | 'CRA' | 'STATE' | 'PROVINCIAL' | 'OTHER';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date (YYYY-MM-DD)
  /** Payment mode only — never account/card numbers. */
  paymentMethod?: PaymentMethod;
  notes?: string;
  budgetId?: string;
  deductible?: boolean;
  /** manual entry is default; csv_import only after explicit user consent. */
  source?: ExpenseSource;
  createdAt: string;
}

/**
 * Privacy contract for CSV import: only these fields may be retained.
 * Account numbers, routing numbers, balances, addresses, and raw bank
 * metadata must never be stored.
 */
export type AllowedImportField = 'title' | 'amount' | 'category' | 'paymentMethod' | 'date';

export interface Budget {
  id: string;
  name: string;
  kind: BudgetKind;
  limit: number;
  currency: CurrencyCode;
  startDate: string;
  endDate?: string;
  notes?: string;
  color?: string;
  createdAt: string;
}

export interface Deduction {
  id: string;
  name: string;
  amount: number;
  country: CountryCode;
  taxYear: number;
  category: string;
  notes?: string;
  evidenceIds: string[];
  createdAt: string;
}

export type EvidenceAttachmentKind = 'image' | 'pdf' | 'file';

export interface EvidenceAttachment {
  id: string;
  kind: EvidenceAttachmentKind;
  name: string;
  /** Local file URI (documentDirectory on native; blob/data on web when needed). */
  uri: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  authority: NoticeAuthority;
  noticeRef?: string;
  taxYear?: number;
  tags: string[];
  /** Optional free-text note about paper copies / external storage. */
  attachmentNote?: string;
  /** Camera photos, gallery images, and PDF/document uploads. */
  attachments: EvidenceAttachment[];
  createdAt: string;
}

export interface PetProfile {
  id: string;
  name: string;
  species: string;
  monthlyBudget: number;
  notes?: string;
  createdAt: string;
}

export interface TaxProfile {
  country: CountryCode;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | 'common_law';
  provinceOrState: string;
  annualGrossIncome: number;
  otherIncome: number;
  estimatedWithholding: number;
  dependents: number;
  taxYear: number;
}

export interface AppSettings {
  displayName: string;
  preferredCountry: CountryCode;
  currency: CurrencyCode;
  darkMode: 'system' | 'light' | 'dark';
  /**
   * Monthly take-home income for dashboard cashflow.
   * Falls back to taxProfile.annualGrossIncome / 12 when unset.
   */
  monthlyIncome?: number;
  /** Optional liquid savings balance for net-worth style snapshot. */
  savingsBalance?: number;
}

/** Debt categories for North American household balance sheets. */
export type DebtKind =
  | 'home_loan'
  | 'capex'
  | 'credit_card'
  | 'personal_loan'
  | 'overdraft'
  | 'hand_loan'
  | 'auto_loan'
  | 'student_loan'
  | 'other';

export interface DebtItem {
  id: string;
  name: string;
  kind: DebtKind;
  /** Outstanding principal. */
  balance: number;
  /** Annual percentage rate (e.g. 19.99 for 19.99% APR). */
  aprPercent: number;
  /** Optional monthly minimum payment. */
  minPayment?: number;
  /** Lender or person (name only — no account numbers). */
  lender?: string;
  notes?: string;
  currency: CurrencyCode;
  createdAt: string;
}

/** Shared bill events — trips, parties, dates, get-togethers. */
export type SplitEventKind =
  | 'house_party'
  | 'get_together'
  | 'trip'
  | 'dinner_date'
  | 'lunch_date'
  | 'custom';

export interface SplitParticipant {
  id: string;
  name: string;
  /** True when this person is the app user. */
  isYou?: boolean;
}

export type SplitMode = 'equal' | 'shares';

export interface SplitLineItem {
  id: string;
  title: string;
  amount: number;
  /** Who fronted the money. */
  paidById: string;
  /**
   * Who shares the cost. If empty, all current participants share equally.
   * Amounts never include bank account data — names + amounts only.
   */
  sharedByIds: string[];
  splitMode: SplitMode;
  /** Optional weight per participant id when splitMode is 'shares'. */
  shares?: Record<string, number>;
  date: string;
  createdAt: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  kind: SplitEventKind;
  currency: CurrencyCode;
  /** Optional link to a life-event budget envelope. */
  budgetId?: string;
  participants: SplitParticipant[];
  items: SplitLineItem[];
  notes?: string;
  createdAt: string;
}

export interface SettlementTransfer {
  fromId: string;
  toId: string;
  amount: number;
}
