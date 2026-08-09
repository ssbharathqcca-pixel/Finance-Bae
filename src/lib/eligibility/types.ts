import { CountryCode } from '@/src/types';

export type ProductKind = 'home_loan' | 'personal_loan' | 'credit_card' | 'limit_increase';

export type LikelihoodBand = 'strong' | 'fair' | 'stretch' | 'unlikely';

export interface EligibilityInputs {
  country: CountryCode;
  /** Monthly take-home (preferred) or gross converted. */
  monthlyIncome: number;
  /** Monthly living expenses (not including debt payments). */
  monthlyExpenses: number;
  /** Total monthly debt payments (loans, cards minimums, etc.). */
  monthlyDebtPayments: number;
  /** Credit score estimate 300–900 (US FICO-style or CA equivalent band). */
  creditScore: number;
  /** Years at current job / self-employed. */
  employmentYears: number;
  /** Stable income? */
  incomeStable: boolean;

  // Home loan
  homePrice?: number;
  downPayment?: number;
  /** Requested mortgage term years */
  mortgageYears?: number;
  /** Property is primary residence */
  primaryResidence?: boolean;

  // Personal loan
  personalLoanAmount?: number;
  personalLoanMonths?: number;

  // Credit card
  requestedCardLimit?: number;
  existingCardLimits?: number;
  /** Current revolving balances on cards */
  cardBalances?: number;

  // Limit increase
  currentLimit?: number;
  requestedNewLimit?: number;
  monthsWithCard?: number;
  onTimePaymentMonths?: number;
  recentLatePayments?: number;
  incomeIncreasedRecently?: boolean;
}

export interface CheckResult {
  id: string;
  /** Plain-language name of the check */
  title: string;
  /** Pass / soft-pass / fail for visualization */
  status: 'good' | 'ok' | 'watch' | 'risk';
  /** What we looked at, in everyday words */
  detail: string;
  /** Optional numeric for meters 0–100 */
  score?: number;
}

export interface ProductEstimate {
  product: ProductKind;
  title: string;
  band: LikelihoodBand;
  /** 0–100 educational score */
  score: number;
  headline: string;
  summary: string;
  checks: CheckResult[];
  /** Suggested figures (not offers) */
  suggestions: { label: string; value: string }[];
  tips: string[];
  disclaimer: string;
}

export interface EligibilityBundle {
  country: CountryCode;
  generatedAt: string;
  /** Shared money snapshot in plain words */
  moneySnapshot: {
    monthlyIncome: string;
    monthlyExpenses: string;
    monthlyDebtPayments: string;
    freeCashAfterDebts: string;
    debtLoadPercent: string;
  };
  products: ProductEstimate[];
}
