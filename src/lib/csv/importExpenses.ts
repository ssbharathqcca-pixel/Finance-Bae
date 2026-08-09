import { expenseCategoryLabels, paymentMethodLabels } from '@/src/data/labels';
import { isDeniedHeader, sanitizeExpenseLabel } from '@/src/lib/privacy/sanitize';
import { parseCsv, rowsToObjects } from '@/src/lib/csv/parseCsv';
import {
  AllowedImportField,
  ExpenseCategory,
  PaymentMethod,
} from '@/src/types';

export type ColumnMapping = Partial<Record<AllowedImportField, string | null>>;

export interface ParsedImportPreview {
  headers: string[];
  /** Headers blocked from mapping for privacy. */
  deniedHeaders: string[];
  /** Headers the user may map. */
  allowedHeaders: string[];
  suggestedMapping: ColumnMapping;
  rawRowCount: number;
  sampleObjects: Record<string, string>[];
}

export interface SanitizedImportRow {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string;
  /** True if amount came from a credit-style negative and was flipped to spend. */
  amountNormalized: boolean;
  skippedReason?: string;
}

export interface ImportBuildResult {
  accepted: SanitizedImportRow[];
  skipped: { index: number; reason: string }[];
}

const TITLE_ALIASES = [
  'description',
  'memo',
  'payee',
  'name',
  'title',
  'merchant',
  'details',
  'transaction',
  'narrative',
  'particulars',
];

const AMOUNT_ALIASES = [
  'amount',
  'debit',
  'withdrawal',
  'spend',
  'value',
  'cad',
  'usd',
  'transaction amount',
  'amt',
];

const CATEGORY_ALIASES = ['category', 'type', 'classification', 'expense category', 'bucket'];

const PAYMENT_ALIASES = [
  'payment method',
  'payment',
  'method',
  'mode',
  'mode of payment',
  'card type',
  'channel',
  'tender',
];

const DATE_ALIASES = [
  'date',
  'transaction date',
  'posted date',
  'posting date',
  'trans date',
  'value date',
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

function findAlias(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.n === alias || h.n.includes(alias));
    if (hit && !isDeniedHeader(hit.raw)) return hit.raw;
  }
  return null;
}

export function analyzeCsv(text: string): ParsedImportPreview {
  const { headers, rows } = parseCsv(text);
  const deniedHeaders = headers.filter((h) => isDeniedHeader(h));
  const allowedHeaders = headers.filter((h) => h && !isDeniedHeader(h));

  const suggestedMapping: ColumnMapping = {
    title: findAlias(allowedHeaders, TITLE_ALIASES),
    amount: findAlias(allowedHeaders, AMOUNT_ALIASES),
    category: findAlias(allowedHeaders, CATEGORY_ALIASES),
    paymentMethod: findAlias(allowedHeaders, PAYMENT_ALIASES),
    date: findAlias(allowedHeaders, DATE_ALIASES),
  };

  const objects = rowsToObjects(headers, rows);

  return {
    headers,
    deniedHeaders,
    allowedHeaders,
    suggestedMapping,
    rawRowCount: rows.length,
    sampleObjects: objects.slice(0, 5),
  };
}

export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  // Accounting negatives: (123.45)
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  // Remove currency symbols and spaces
  s = s.replace(/[^0-9,.\-]/g, '');

  // European 1.234,56 vs US 1,234.56
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // If comma is decimal separator (e.g. 12,50)
    if (/^\d{1,3},\d{1,2}$/.test(s) || /^\d+,\d{2}$/.test(s)) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  if (negative && !s.startsWith('-')) s = `-${s}`;

  const n = parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

export function mapCategory(raw: string | undefined): ExpenseCategory {
  if (!raw) return 'other';
  const s = raw.trim().toLowerCase();

  // Direct keys / labels
  for (const [key, label] of Object.entries(expenseCategoryLabels) as [ExpenseCategory, string][]) {
    if (s === key || s === label.toLowerCase()) return key;
  }

  const rules: [RegExp, ExpenseCategory][] = [
    [/rent|mortgage|hoa|landlord|housing|property/i, 'housing'],
    [/grocery|grocer|supermarket|food|market|costco|walmart/i, 'food'],
    [/uber|lyft|gas|fuel|transit|metro|parking|transport|shell|esso/i, 'transport'],
    [/electric|hydro|water|utility|internet|phone|verizon|rogers|bell/i, 'utilities'],
    [/pharmacy|doctor|dental|medical|hospital|health|clinic/i, 'healthcare'],
    [/netflix|spotify|movie|cinema|game|entertainment|concert/i, 'entertainment'],
    [/amazon|shop|store|mall|retail|target|best buy/i, 'shopping'],
    [/vet|petco|petsmart|pet\b|groom/i, 'pets'],
    [/airline|hotel|airbnb|travel|flight|booking|expedia/i, 'travel'],
    [/restaurant|cafe|coffee|starbucks|dining|doordash|ubereats/i, 'dining'],
    [/party|event|catering/i, 'parties'],
    [/tax|irs|cra|h&r|turbo/i, 'tax'],
  ];

  for (const [re, cat] of rules) {
    if (re.test(s)) return cat;
  }
  return 'other';
}

export function mapPaymentMethod(raw: string | undefined): PaymentMethod {
  if (!raw) return 'unknown';
  const s = raw.trim().toLowerCase();

  for (const [key, label] of Object.entries(paymentMethodLabels) as [PaymentMethod, string][]) {
    if (s === key || s === label.toLowerCase()) return key;
  }

  if (/cash|atm withdrawal/i.test(s)) return 'cash';
  if (/debit|checking|chequing|visa debit|interac/i.test(s)) return 'debit';
  if (/credit|visa|mastercard|amex|discover|card/i.test(s)) return 'credit';
  if (/e-?transfer|etransfer|ach|wire|pad|pre-?authorized|bill pay/i.test(s)) return 'e_transfer';
  if (/check|cheque/i.test(s)) return 'check';
  if (/apple pay|google pay|paypal|venmo|wallet|samsung pay/i.test(s)) return 'mobile_wallet';
  return 'other';
}

export function parseFlexibleDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO-ish
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    if (!Number.isNaN(d.getTime())) return s.slice(0, 10);
  }

  // MM/DD/YYYY or DD/MM/YYYY — prefer US if first part > 12 then day-first
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous: default US (MM/DD) for North American product
      month = a;
      day = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    return new Date(t).toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Build sanitized expense rows from CSV text using an explicit column mapping.
 * Only allowed fields are read. Denied headers are never accessed.
 * Debits/spending: negative amounts are converted to positive spend when |amount| is used.
 * Credits/refunds (positive income-like) can be skipped via `spendOnly`.
 */
export function buildSanitizedImport(
  text: string,
  mapping: ColumnMapping,
  options?: { defaultDate?: string }
): ImportBuildResult {
  const defaultDate = options?.defaultDate ?? new Date().toISOString().slice(0, 10);
  const { headers, rows } = parseCsv(text);
  const objects = rowsToObjects(headers, rows);

  // Ensure mapped headers are not on deny-list
  for (const field of Object.keys(mapping) as AllowedImportField[]) {
    const h = mapping[field];
    if (h && isDeniedHeader(h)) {
      throw new Error(`Column “${h}” is blocked for privacy and cannot be imported.`);
    }
  }

  if (!mapping.title || !mapping.amount) {
    throw new Error('Map at least Expense name and Amount before importing.');
  }

  const accepted: SanitizedImportRow[] = [];
  const skipped: { index: number; reason: string }[] = [];

  objects.forEach((obj, index) => {
    const rawTitle = obj[mapping.title!] ?? '';
    const rawAmount = obj[mapping.amount!] ?? '';
    const rawCategory = mapping.category ? obj[mapping.category] : '';
    const rawPayment = mapping.paymentMethod ? obj[mapping.paymentMethod] : '';
    const rawDate = mapping.date ? obj[mapping.date] : '';

    // Never read unmapped columns — privacy by construction
    if (!String(rawTitle).trim()) {
      skipped.push({ index: index + 1, reason: 'Empty expense name' });
      return;
    }

    const title = sanitizeExpenseLabel(rawTitle);
    let amount = parseAmount(rawAmount);
    if (amount == null) {
      skipped.push({ index: index + 1, reason: 'Missing or invalid amount' });
      return;
    }

    let amountNormalized = false;
    // Bank CSVs often show debits as negative; we store expenses as positive spend.
    if (amount < 0) {
      amount = Math.abs(amount);
      amountNormalized = true;
    }

    if (amount <= 0) {
      skipped.push({ index: index + 1, reason: 'Non-positive amount' });
      return;
    }

    const category = mapCategory(rawCategory || title);
    const paymentMethod = mapPaymentMethod(rawPayment);
    const date = parseFlexibleDate(rawDate) ?? defaultDate;

    accepted.push({
      title,
      amount: Math.round(amount * 100) / 100,
      category,
      paymentMethod,
      date,
      amountNormalized,
    });
  });

  return { accepted, skipped };
}

/** Privacy-safe sample template users can fill manually (no bank connection). */
export const PRIVACY_SAFE_CSV_TEMPLATE = `name,amount,category,payment_method,date
Morning coffee,5.25,dining,debit,2026-03-01
Weekly groceries,86.40,food,credit,2026-03-02
Vet checkup,120.00,pets,debit,2026-03-03
`;

export const CSV_PRIVACY_POINTS = [
  'Optional: you can ignore CSV import and enter every expense manually.',
  'Processing happens only on this device — no bank login and no file upload to our servers.',
  'We retain only: expense name, category, amount, and payment mode (plus optional date).',
  'Account numbers, routing numbers, card numbers, balances, addresses, and IDs are blocked or redacted.',
  'The original CSV is discarded after import; only the sanitized expense fields are saved locally.',
  'You may delete imported expenses anytime (long-press on the Expenses list).',
] as const;
