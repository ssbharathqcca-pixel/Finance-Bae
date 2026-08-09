/**
 * Educational US federal + state income tax tables (illustrative 2024/2025-style).
 * NOT official IRS/state tables — verify before any real filing.
 */

import { TaxBracket, taxFromBrackets } from '@/src/lib/tax/brackets';
import { TaxProfile } from '@/src/types';

export type UsFilingKey = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export type UsStateModel =
  | { code: string; name: string; kind: 'none'; note: string }
  | {
      code: string;
      name: string;
      kind: 'flat';
      rate: number;
      /** Optional state standard deduction (single-like simplified). */
      standardDeduction?: number;
      note?: string;
    }
  | {
      code: string;
      name: string;
      kind: 'brackets';
      brackets: TaxBracket[];
      standardDeduction?: number;
      note?: string;
    };

/** Map app filing statuses used for US federal. */
export function usFilingKey(status: TaxProfile['filingStatus']): UsFilingKey {
  if (status === 'married_joint' || status === 'common_law') return 'married_joint';
  if (status === 'married_separate') return 'married_separate';
  if (status === 'head_of_household') return 'head_of_household';
  return 'single';
}

export const US_STANDARD_DEDUCTION: Record<UsFilingKey, number> = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_of_household: 21900,
};

export const US_FEDERAL_BRACKETS: Record<UsFilingKey, TaxBracket[]> = {
  single: [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married_joint: [
    { upTo: 23200, rate: 0.1 },
    { upTo: 94300, rate: 0.12 },
    { upTo: 201050, rate: 0.22 },
    { upTo: 383900, rate: 0.24 },
    { upTo: 487450, rate: 0.32 },
    { upTo: 731200, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  married_separate: [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 365600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { upTo: 16550, rate: 0.1 },
    { upTo: 63100, rate: 0.12 },
    { upTo: 100500, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243700, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

/**
 * Child Tax Credit (educational): up to $2,000 per dependent with simplified phase-out.
 * Real CTC has age/SSN/refundable rules we do not model.
 */
export function estimateUsChildTaxCredit(
  dependents: number,
  grossIncome: number,
  filing: UsFilingKey
): number {
  if (dependents <= 0) return 0;
  const maxCredit = dependents * 2000;
  const threshold = filing === 'married_joint' ? 400000 : 200000;
  if (grossIncome <= threshold) return maxCredit;
  const excess = grossIncome - threshold;
  const reduction = Math.floor(excess / 1000) * 50;
  return Math.max(0, maxCredit - reduction);
}

/** Simplified state tables — ordinary wage/income tax only. */
export const US_STATE_TABLES: Record<string, UsStateModel> = {
  AL: {
    code: 'AL',
    name: 'Alabama',
    kind: 'brackets',
    brackets: [
      { upTo: 500, rate: 0.02 },
      { upTo: 3000, rate: 0.04 },
      { upTo: Infinity, rate: 0.05 },
    ],
    standardDeduction: 2500,
  },
  AK: { code: 'AK', name: 'Alaska', kind: 'none', note: 'No state personal income tax.' },
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    kind: 'flat',
    rate: 0.025,
    standardDeduction: 14600,
    note: 'Flat rate model (simplified).',
  },
  AR: {
    code: 'AR',
    name: 'Arkansas',
    kind: 'brackets',
    brackets: [
      { upTo: 4400, rate: 0.02 },
      { upTo: 8800, rate: 0.04 },
      { upTo: Infinity, rate: 0.044 },
    ],
    standardDeduction: 2340,
  },
  CA: {
    code: 'CA',
    name: 'California',
    kind: 'brackets',
    // Single-style simplified brackets
    brackets: [
      { upTo: 10412, rate: 0.01 },
      { upTo: 24684, rate: 0.02 },
      { upTo: 38959, rate: 0.04 },
      { upTo: 54081, rate: 0.06 },
      { upTo: 68350, rate: 0.08 },
      { upTo: 349137, rate: 0.093 },
      { upTo: 418961, rate: 0.103 },
      { upTo: 698271, rate: 0.113 },
      { upTo: Infinity, rate: 0.123 },
    ],
    standardDeduction: 5363,
    note: 'Mental Health Services Tax not modeled.',
  },
  CO: {
    code: 'CO',
    name: 'Colorado',
    kind: 'flat',
    rate: 0.044,
    standardDeduction: 14600,
  },
  CT: {
    code: 'CT',
    name: 'Connecticut',
    kind: 'brackets',
    brackets: [
      { upTo: 10000, rate: 0.02 },
      { upTo: 50000, rate: 0.045 },
      { upTo: 100000, rate: 0.055 },
      { upTo: 200000, rate: 0.06 },
      { upTo: 250000, rate: 0.065 },
      { upTo: 500000, rate: 0.069 },
      { upTo: Infinity, rate: 0.0699 },
    ],
    standardDeduction: 0,
  },
  DE: {
    code: 'DE',
    name: 'Delaware',
    kind: 'brackets',
    brackets: [
      { upTo: 2000, rate: 0.022 },
      { upTo: 5000, rate: 0.039 },
      { upTo: 10000, rate: 0.048 },
      { upTo: 20000, rate: 0.052 },
      { upTo: 25000, rate: 0.0555 },
      { upTo: 60000, rate: 0.066 },
      { upTo: Infinity, rate: 0.066 },
    ],
    standardDeduction: 3250,
  },
  FL: { code: 'FL', name: 'Florida', kind: 'none', note: 'No state personal income tax.' },
  GA: {
    code: 'GA',
    name: 'Georgia',
    kind: 'flat',
    rate: 0.0539,
    standardDeduction: 12000,
    note: 'Flat rate model (simplified).',
  },
  HI: {
    code: 'HI',
    name: 'Hawaii',
    kind: 'brackets',
    brackets: [
      { upTo: 2400, rate: 0.014 },
      { upTo: 4800, rate: 0.032 },
      { upTo: 9600, rate: 0.055 },
      { upTo: 14400, rate: 0.064 },
      { upTo: 19200, rate: 0.068 },
      { upTo: 24000, rate: 0.072 },
      { upTo: 36000, rate: 0.076 },
      { upTo: 48000, rate: 0.079 },
      { upTo: 150000, rate: 0.0825 },
      { upTo: 175000, rate: 0.09 },
      { upTo: 200000, rate: 0.1 },
      { upTo: Infinity, rate: 0.11 },
    ],
    standardDeduction: 2200,
  },
  ID: {
    code: 'ID',
    name: 'Idaho',
    kind: 'flat',
    rate: 0.058,
    standardDeduction: 14600,
  },
  IL: {
    code: 'IL',
    name: 'Illinois',
    kind: 'flat',
    rate: 0.0495,
    standardDeduction: 0,
    note: 'Personal exemption credit not fully modeled.',
  },
  IN: {
    code: 'IN',
    name: 'Indiana',
    kind: 'flat',
    rate: 0.0305,
    standardDeduction: 0,
  },
  IA: {
    code: 'IA',
    name: 'Iowa',
    kind: 'flat',
    rate: 0.057,
    standardDeduction: 0,
    note: 'Flattening reforms simplified to flat rate.',
  },
  KS: {
    code: 'KS',
    name: 'Kansas',
    kind: 'brackets',
    brackets: [
      { upTo: 15000, rate: 0.031 },
      { upTo: 30000, rate: 0.0525 },
      { upTo: Infinity, rate: 0.057 },
    ],
    standardDeduction: 3500,
  },
  KY: {
    code: 'KY',
    name: 'Kentucky',
    kind: 'flat',
    rate: 0.04,
    standardDeduction: 3160,
  },
  LA: {
    code: 'LA',
    name: 'Louisiana',
    kind: 'brackets',
    brackets: [
      { upTo: 12500, rate: 0.0185 },
      { upTo: 50000, rate: 0.035 },
      { upTo: Infinity, rate: 0.0425 },
    ],
    standardDeduction: 4500,
  },
  ME: {
    code: 'ME',
    name: 'Maine',
    kind: 'brackets',
    brackets: [
      { upTo: 26050, rate: 0.058 },
      { upTo: 61600, rate: 0.0675 },
      { upTo: Infinity, rate: 0.0715 },
    ],
    standardDeduction: 14600,
  },
  MD: {
    code: 'MD',
    name: 'Maryland',
    kind: 'brackets',
    brackets: [
      { upTo: 1000, rate: 0.02 },
      { upTo: 2000, rate: 0.03 },
      { upTo: 3000, rate: 0.04 },
      { upTo: 100000, rate: 0.0475 },
      { upTo: 125000, rate: 0.05 },
      { upTo: 150000, rate: 0.0525 },
      { upTo: 250000, rate: 0.055 },
      { upTo: Infinity, rate: 0.0575 },
    ],
    standardDeduction: 2550,
    note: 'County piggyback tax not modeled.',
  },
  MA: {
    code: 'MA',
    name: 'Massachusetts',
    kind: 'flat',
    rate: 0.05,
    standardDeduction: 0,
    note: 'Millionaire surtax (4% over $1M) not modeled.',
  },
  MI: {
    code: 'MI',
    name: 'Michigan',
    kind: 'flat',
    rate: 0.0425,
    standardDeduction: 0,
  },
  MN: {
    code: 'MN',
    name: 'Minnesota',
    kind: 'brackets',
    brackets: [
      { upTo: 31690, rate: 0.0535 },
      { upTo: 104090, rate: 0.068 },
      { upTo: 193240, rate: 0.0785 },
      { upTo: Infinity, rate: 0.0985 },
    ],
    standardDeduction: 14575,
  },
  MS: {
    code: 'MS',
    name: 'Mississippi',
    kind: 'flat',
    rate: 0.047,
    standardDeduction: 2300,
  },
  MO: {
    code: 'MO',
    name: 'Missouri',
    kind: 'brackets',
    brackets: [
      { upTo: 1207, rate: 0.0 },
      { upTo: 2414, rate: 0.02 },
      { upTo: 3621, rate: 0.025 },
      { upTo: 4828, rate: 0.03 },
      { upTo: 6035, rate: 0.035 },
      { upTo: 7242, rate: 0.04 },
      { upTo: 8449, rate: 0.045 },
      { upTo: Infinity, rate: 0.048 },
    ],
    standardDeduction: 14600,
  },
  MT: {
    code: 'MT',
    name: 'Montana',
    kind: 'brackets',
    brackets: [
      { upTo: 20500, rate: 0.047 },
      { upTo: Infinity, rate: 0.059 },
    ],
    standardDeduction: 14600,
  },
  NE: {
    code: 'NE',
    name: 'Nebraska',
    kind: 'brackets',
    brackets: [
      { upTo: 3700, rate: 0.0246 },
      { upTo: 22170, rate: 0.0351 },
      { upTo: 35730, rate: 0.0501 },
      { upTo: Infinity, rate: 0.0584 },
    ],
    standardDeduction: 7900,
  },
  NV: { code: 'NV', name: 'Nevada', kind: 'none', note: 'No state personal income tax.' },
  NH: {
    code: 'NH',
    name: 'New Hampshire',
    kind: 'none',
    note: 'No wage income tax (interest/dividends tax largely phased out).',
  },
  NJ: {
    code: 'NJ',
    name: 'New Jersey',
    kind: 'brackets',
    brackets: [
      { upTo: 20000, rate: 0.014 },
      { upTo: 35000, rate: 0.0175 },
      { upTo: 40000, rate: 0.035 },
      { upTo: 75000, rate: 0.05525 },
      { upTo: 500000, rate: 0.0637 },
      { upTo: 1000000, rate: 0.0897 },
      { upTo: Infinity, rate: 0.1075 },
    ],
    standardDeduction: 0,
  },
  NM: {
    code: 'NM',
    name: 'New Mexico',
    kind: 'brackets',
    brackets: [
      { upTo: 5500, rate: 0.017 },
      { upTo: 11000, rate: 0.032 },
      { upTo: 16000, rate: 0.047 },
      { upTo: 210000, rate: 0.049 },
      { upTo: Infinity, rate: 0.059 },
    ],
    standardDeduction: 14600,
  },
  NY: {
    code: 'NY',
    name: 'New York',
    kind: 'brackets',
    brackets: [
      { upTo: 8500, rate: 0.04 },
      { upTo: 11700, rate: 0.045 },
      { upTo: 13900, rate: 0.0525 },
      { upTo: 80650, rate: 0.055 },
      { upTo: 215400, rate: 0.06 },
      { upTo: 1077550, rate: 0.0685 },
      { upTo: 5000000, rate: 0.0965 },
      { upTo: 25000000, rate: 0.103 },
      { upTo: Infinity, rate: 0.109 },
    ],
    standardDeduction: 8000,
    note: 'NYC local tax not modeled.',
  },
  NC: {
    code: 'NC',
    name: 'North Carolina',
    kind: 'flat',
    rate: 0.045,
    standardDeduction: 12750,
  },
  ND: {
    code: 'ND',
    name: 'North Dakota',
    kind: 'brackets',
    brackets: [
      { upTo: 44725, rate: 0.0195 },
      { upTo: 225975, rate: 0.025 },
      { upTo: Infinity, rate: 0.029 },
    ],
    standardDeduction: 14600,
  },
  OH: {
    code: 'OH',
    name: 'Ohio',
    kind: 'brackets',
    brackets: [
      { upTo: 26050, rate: 0.0 },
      { upTo: 100000, rate: 0.0275 },
      { upTo: Infinity, rate: 0.035 },
    ],
    standardDeduction: 0,
    note: 'School district taxes not modeled.',
  },
  OK: {
    code: 'OK',
    name: 'Oklahoma',
    kind: 'brackets',
    brackets: [
      { upTo: 1000, rate: 0.0025 },
      { upTo: 2500, rate: 0.0075 },
      { upTo: 3750, rate: 0.0175 },
      { upTo: 4900, rate: 0.0275 },
      { upTo: 7200, rate: 0.0375 },
      { upTo: Infinity, rate: 0.0475 },
    ],
    standardDeduction: 6350,
  },
  OR: {
    code: 'OR',
    name: 'Oregon',
    kind: 'brackets',
    brackets: [
      { upTo: 4050, rate: 0.0475 },
      { upTo: 10200, rate: 0.0675 },
      { upTo: 125000, rate: 0.0875 },
      { upTo: Infinity, rate: 0.099 },
    ],
    standardDeduction: 2745,
  },
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    kind: 'flat',
    rate: 0.0307,
    standardDeduction: 0,
    note: 'Local earned income tax not modeled.',
  },
  RI: {
    code: 'RI',
    name: 'Rhode Island',
    kind: 'brackets',
    brackets: [
      { upTo: 73450, rate: 0.0375 },
      { upTo: 166950, rate: 0.0475 },
      { upTo: Infinity, rate: 0.0599 },
    ],
    standardDeduction: 10550,
  },
  SC: {
    code: 'SC',
    name: 'South Carolina',
    kind: 'brackets',
    brackets: [
      { upTo: 3460, rate: 0.0 },
      { upTo: 17330, rate: 0.03 },
      { upTo: Infinity, rate: 0.064 },
    ],
    standardDeduction: 14600,
  },
  SD: { code: 'SD', name: 'South Dakota', kind: 'none', note: 'No state personal income tax.' },
  TN: {
    code: 'TN',
    name: 'Tennessee',
    kind: 'none',
    note: 'No wage income tax (Hall tax repealed).',
  },
  TX: { code: 'TX', name: 'Texas', kind: 'none', note: 'No state personal income tax.' },
  UT: {
    code: 'UT',
    name: 'Utah',
    kind: 'flat',
    rate: 0.0455,
    standardDeduction: 0,
  },
  VT: {
    code: 'VT',
    name: 'Vermont',
    kind: 'brackets',
    brackets: [
      { upTo: 45400, rate: 0.0335 },
      { upTo: 110050, rate: 0.066 },
      { upTo: 229550, rate: 0.076 },
      { upTo: Infinity, rate: 0.0875 },
    ],
    standardDeduction: 6500,
  },
  VA: {
    code: 'VA',
    name: 'Virginia',
    kind: 'brackets',
    brackets: [
      { upTo: 3000, rate: 0.02 },
      { upTo: 5000, rate: 0.03 },
      { upTo: 17000, rate: 0.05 },
      { upTo: Infinity, rate: 0.0575 },
    ],
    standardDeduction: 8000,
  },
  WA: {
    code: 'WA',
    name: 'Washington',
    kind: 'none',
    note: 'No general wage income tax (capital gains tax not modeled).',
  },
  WV: {
    code: 'WV',
    name: 'West Virginia',
    kind: 'brackets',
    brackets: [
      { upTo: 10000, rate: 0.0236 },
      { upTo: 25000, rate: 0.0315 },
      { upTo: 40000, rate: 0.0354 },
      { upTo: 60000, rate: 0.0472 },
      { upTo: Infinity, rate: 0.0512 },
    ],
    standardDeduction: 0,
  },
  WI: {
    code: 'WI',
    name: 'Wisconsin',
    kind: 'brackets',
    brackets: [
      { upTo: 14320, rate: 0.0354 },
      { upTo: 28640, rate: 0.0465 },
      { upTo: 315310, rate: 0.053 },
      { upTo: Infinity, rate: 0.0765 },
    ],
    standardDeduction: 12760,
  },
  WY: { code: 'WY', name: 'Wyoming', kind: 'none', note: 'No state personal income tax.' },
  DC: {
    code: 'DC',
    name: 'District of Columbia',
    kind: 'brackets',
    brackets: [
      { upTo: 10000, rate: 0.04 },
      { upTo: 40000, rate: 0.06 },
      { upTo: 60000, rate: 0.065 },
      { upTo: 250000, rate: 0.085 },
      { upTo: 500000, rate: 0.0925 },
      { upTo: 1000000, rate: 0.0975 },
      { upTo: Infinity, rate: 0.1075 },
    ],
    standardDeduction: 14600,
  },
};

export function getUsStateModel(code: string): UsStateModel {
  const key = (code || 'CA').toUpperCase().trim();
  return (
    US_STATE_TABLES[key] ?? {
      code: key,
      name: key,
      kind: 'flat',
      rate: 0.05,
      note: 'Unknown region — using 5% flat placeholder.',
    }
  );
}

export function computeUsStateTax(
  stateTaxable: number,
  model: UsStateModel
): { tax: number; marginal: number; note: string } {
  if (model.kind === 'none') {
    return { tax: 0, marginal: 0, note: model.note };
  }
  if (model.kind === 'flat') {
    return {
      tax: Math.max(0, stateTaxable) * model.rate,
      marginal: model.rate,
      note: model.note ?? `${model.name} flat rate ${(model.rate * 100).toFixed(2)}%.`,
    };
  }
  const { tax, marginal } = taxFromBrackets(stateTaxable, model.brackets);
  return {
    tax,
    marginal,
    note: model.note ?? `${model.name} progressive brackets (educational).`,
  };
}
