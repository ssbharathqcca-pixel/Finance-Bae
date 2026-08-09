/**
 * Educational Canada federal + provincial/territorial tables (illustrative 2024-style).
 * NOT official CRA tables — verify before any real filing.
 */

import { TaxBracket } from '@/src/lib/tax/brackets';

export type CaRegionModel = {
  code: string;
  name: string;
  brackets: TaxBracket[];
  /** Basic personal amount for non-refundable credit (educational). */
  basicPersonalAmount: number;
  /** Lowest bracket rate — used to value non-refundable credits. */
  lowestRate: number;
  note?: string;
};

/** Federal brackets (same for all residents for ordinary income — educational). */
export const CA_FEDERAL_BRACKETS: TaxBracket[] = [
  { upTo: 55867, rate: 0.15 },
  { upTo: 111733, rate: 0.205 },
  { upTo: 173205, rate: 0.26 },
  { upTo: 246752, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
];

export const CA_FEDERAL_BPA = 15705;
export const CA_FEDERAL_LOWEST_RATE = 0.15;

/**
 * Simplified Canada Workers Benefit / child-related educational credit placeholder.
 * Real CWB/CWB disability/CCTB rules are far more complex.
 */
export function estimateCaDependentCredit(dependents: number): number {
  // Educational non-refundable-style amount applied at federal lowest rate later
  if (dependents <= 0) return 0;
  // Approximate "amount" for eligible dependent-style support (highly simplified)
  return Math.min(dependents, 4) * 2500;
}

export const CA_PROVINCE_TABLES: Record<string, CaRegionModel> = {
  AB: {
    code: 'AB',
    name: 'Alberta',
    brackets: [
      { upTo: 148269, rate: 0.1 },
      { upTo: 177922, rate: 0.12 },
      { upTo: 237230, rate: 0.13 },
      { upTo: 355845, rate: 0.14 },
      { upTo: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 21885,
    lowestRate: 0.1,
  },
  BC: {
    code: 'BC',
    name: 'British Columbia',
    brackets: [
      { upTo: 47937, rate: 0.0506 },
      { upTo: 95875, rate: 0.077 },
      { upTo: 110076, rate: 0.105 },
      { upTo: 133664, rate: 0.1229 },
      { upTo: 181232, rate: 0.147 },
      { upTo: 252752, rate: 0.168 },
      { upTo: Infinity, rate: 0.205 },
    ],
    basicPersonalAmount: 12580,
    lowestRate: 0.0506,
  },
  MB: {
    code: 'MB',
    name: 'Manitoba',
    brackets: [
      { upTo: 47000, rate: 0.108 },
      { upTo: 100000, rate: 0.1275 },
      { upTo: Infinity, rate: 0.174 },
    ],
    basicPersonalAmount: 15780,
    lowestRate: 0.108,
  },
  NB: {
    code: 'NB',
    name: 'New Brunswick',
    brackets: [
      { upTo: 49958, rate: 0.094 },
      { upTo: 99916, rate: 0.14 },
      { upTo: 185064, rate: 0.16 },
      { upTo: Infinity, rate: 0.195 },
    ],
    basicPersonalAmount: 13044,
    lowestRate: 0.094,
  },
  NL: {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    brackets: [
      { upTo: 43198, rate: 0.087 },
      { upTo: 86395, rate: 0.145 },
      { upTo: 154244, rate: 0.158 },
      { upTo: 215943, rate: 0.178 },
      { upTo: 275870, rate: 0.198 },
      { upTo: 551739, rate: 0.208 },
      { upTo: 1103478, rate: 0.213 },
      { upTo: Infinity, rate: 0.218 },
    ],
    basicPersonalAmount: 10818,
    lowestRate: 0.087,
  },
  NS: {
    code: 'NS',
    name: 'Nova Scotia',
    brackets: [
      { upTo: 29590, rate: 0.0879 },
      { upTo: 59180, rate: 0.1495 },
      { upTo: 93000, rate: 0.1667 },
      { upTo: 150000, rate: 0.175 },
      { upTo: Infinity, rate: 0.21 },
    ],
    basicPersonalAmount: 8744,
    lowestRate: 0.0879,
  },
  NT: {
    code: 'NT',
    name: 'Northwest Territories',
    brackets: [
      { upTo: 50597, rate: 0.059 },
      { upTo: 101198, rate: 0.086 },
      { upTo: 164525, rate: 0.122 },
      { upTo: Infinity, rate: 0.1405 },
    ],
    basicPersonalAmount: 17373,
    lowestRate: 0.059,
  },
  NU: {
    code: 'NU',
    name: 'Nunavut',
    brackets: [
      { upTo: 53268, rate: 0.04 },
      { upTo: 106537, rate: 0.07 },
      { upTo: 173205, rate: 0.09 },
      { upTo: Infinity, rate: 0.115 },
    ],
    basicPersonalAmount: 18767,
    lowestRate: 0.04,
  },
  ON: {
    code: 'ON',
    name: 'Ontario',
    brackets: [
      { upTo: 51446, rate: 0.0505 },
      { upTo: 102894, rate: 0.0915 },
      { upTo: 150000, rate: 0.1116 },
      { upTo: 220000, rate: 0.1216 },
      { upTo: Infinity, rate: 0.1316 },
    ],
    basicPersonalAmount: 12399,
    lowestRate: 0.0505,
    note: 'Ontario Health Premium & surtaxes simplified/not fully modeled.',
  },
  PE: {
    code: 'PE',
    name: 'Prince Edward Island',
    brackets: [
      { upTo: 32656, rate: 0.098 },
      { upTo: 64313, rate: 0.138 },
      { upTo: 105000, rate: 0.167 },
      { upTo: Infinity, rate: 0.187 },
    ],
    basicPersonalAmount: 13500,
    lowestRate: 0.098,
  },
  QC: {
    code: 'QC',
    name: 'Quebec',
    brackets: [
      { upTo: 51780, rate: 0.14 },
      { upTo: 103545, rate: 0.19 },
      { upTo: 126000, rate: 0.24 },
      { upTo: Infinity, rate: 0.2575 },
    ],
    basicPersonalAmount: 18056,
    lowestRate: 0.14,
    note: 'Quebec abatement & distinct federal interaction simplified.',
  },
  SK: {
    code: 'SK',
    name: 'Saskatchewan',
    brackets: [
      { upTo: 52057, rate: 0.105 },
      { upTo: 148734, rate: 0.125 },
      { upTo: Infinity, rate: 0.145 },
    ],
    basicPersonalAmount: 18491,
    lowestRate: 0.105,
  },
  YT: {
    code: 'YT',
    name: 'Yukon',
    brackets: [
      { upTo: 55867, rate: 0.064 },
      { upTo: 111733, rate: 0.09 },
      { upTo: 173205, rate: 0.109 },
      { upTo: 500000, rate: 0.128 },
      { upTo: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 15705,
    lowestRate: 0.064,
  },
};

export function getCaRegionModel(code: string): CaRegionModel {
  const key = (code || 'ON').toUpperCase().trim();
  return (
    CA_PROVINCE_TABLES[key] ?? {
      code: key,
      name: key,
      brackets: CA_PROVINCE_TABLES.ON.brackets,
      basicPersonalAmount: CA_PROVINCE_TABLES.ON.basicPersonalAmount,
      lowestRate: CA_PROVINCE_TABLES.ON.lowestRate,
      note: 'Unknown region — using Ontario-style placeholder.',
    }
  );
}
