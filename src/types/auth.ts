import {
  Budget,
  DebtItem,
  Deduction,
  EvidenceItem,
  Expense,
  PetProfile,
  SplitGroup,
  TaxProfile,
  AppSettings,
} from '@/src/types';

export type AuthMode = 'guest' | 'account';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  /** Hex salt for password hashing — never store plain passwords. */
  passwordSalt: string;
  /** Hex SHA-256(salt + password). */
  passwordHash: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  mode: AuthMode;
  signedInAt: string;
}

/** Snapshot of app data eligible for encrypted backup / remote sync. */
export interface SyncPayload {
  version: 1;
  exportedAt: string;
  deviceId?: string;
  userEmail?: string;
  settings: AppSettings;
  taxProfile: TaxProfile;
  expenses: Expense[];
  budgets: Budget[];
  deductions: Deduction[];
  /** Evidence metadata only — attachment binary URIs may be device-local. */
  evidence: EvidenceItem[];
  pets: PetProfile[];
  splitGroups: SplitGroup[];
  debts: DebtItem[];
  reminderPrefs: TaxReminderPrefs;
}

export interface TaxReminderPrefs {
  enabled: boolean;
  /** Days before each installment due date to notify. */
  daysBefore: number;
  /** US quarterly / CA instalment schedule. */
  country: 'US' | 'CA';
  /** Optional hour local time 0–23. */
  hour: number;
  lastScheduledAt?: string;
}

export const DEFAULT_REMINDER_PREFS: TaxReminderPrefs = {
  enabled: false,
  daysBefore: 7,
  country: 'US',
  hour: 9,
};

/** Encrypted envelope written to disk / optional remote. */
export interface EncryptedBackup {
  v: 1;
  alg: 'GBP-XOR-SHA256-v1';
  salt: string;
  /** base64 ciphertext of JSON SyncPayload */
  ciphertext: string;
  createdAt: string;
  label?: string;
}
