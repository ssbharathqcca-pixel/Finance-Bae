/**
 * Educational tax estimators only — NOT professional tax advice.
 * Uses deeper US state + CA provincial tables and simplified credits.
 * Always verify with IRS / CRA or a licensed tax professional.
 */

import { taxFromBrackets, clampNonNegative } from '@/src/lib/tax/brackets';
import {
  CA_FEDERAL_BPA,
  CA_FEDERAL_BRACKETS,
  CA_FEDERAL_LOWEST_RATE,
  estimateCaDependentCredit,
  getCaRegionModel,
} from '@/src/lib/tax/caTables';
import {
  US_FEDERAL_BRACKETS,
  US_STANDARD_DEDUCTION,
  computeUsStateTax,
  estimateUsChildTaxCredit,
  getUsStateModel,
  usFilingKey,
} from '@/src/lib/tax/usTables';
import { CountryCode, TaxProfile } from '@/src/types';

export interface TaxEstimateResult {
  country: CountryCode;
  regionCode: string;
  regionName: string;
  filingLabel: string;
  grossIncome: number;
  taxableIncome: number;
  /** Federal tax before credits. */
  federalTaxGross: number;
  /** Federal tax after non-refundable / CTC-style credits. */
  federalTax: number;
  /** State / provincial tax before regional credits. */
  regionalTaxGross: number;
  /** State / provincial tax after credits. */
  regionalTax: number;
  federalCredits: number;
  regionalCredits: number;
  totalCredits: number;
  totalEstimatedTax: number;
  effectiveRate: number;
  marginalRate: number;
  estimatedLiabilityAfterWithholding: number;
  standardDeductionUsed: number;
  creditLines: { label: string; amount: number }[];
  notes: string[];
  disclaimer: string;
}

function filingLabel(profile: TaxProfile): string {
  const map: Record<TaxProfile['filingStatus'], string> = {
    single: 'Single',
    married_joint: 'Married filing jointly',
    married_separate: 'Married filing separately',
    head_of_household: 'Head of household',
    common_law: 'Common-law / joint-style',
  };
  return map[profile.filingStatus] ?? profile.filingStatus;
}

export function estimateUSFederalTax(
  profile: TaxProfile,
  itemizedDeductions = 0
): TaxEstimateResult {
  const filing = usFilingKey(profile.filingStatus);
  const gross = profile.annualGrossIncome + profile.otherIncome;
  const standard = US_STANDARD_DEDUCTION[filing];
  const deduction = Math.max(standard, itemizedDeductions);
  const taxable = clampNonNegative(gross - deduction);

  const fedBrackets = US_FEDERAL_BRACKETS[filing];
  const fed = taxFromBrackets(taxable, fedBrackets);

  const ctc = estimateUsChildTaxCredit(profile.dependents, gross, filing);
  const federalCredits = ctc;
  const federalTax = clampNonNegative(fed.tax - federalCredits);

  const stateModel = getUsStateModel(profile.provinceOrState);
  const stateStd =
    stateModel.kind === 'none' ? 0 : stateModel.standardDeduction ?? 0;
  // Simplified: state taxable ≈ max(0, gross - state standard deduction)
  // (Many states start from federal AGI; we keep this educational.)
  const stateTaxable =
    stateModel.kind === 'none' ? 0 : clampNonNegative(gross - stateStd);
  const state = computeUsStateTax(stateTaxable, stateModel);
  const regionalCredits = 0;
  const regionalTax = clampNonNegative(state.tax - regionalCredits);

  const total = federalTax + regionalTax;
  const afterWithholding = total - profile.estimatedWithholding;

  const creditLines: { label: string; amount: number }[] = [];
  if (ctc > 0) creditLines.push({ label: 'Child Tax Credit (simplified)', amount: ctc });

  const notes = [
    `Federal filing status: ${filingLabel(profile)}.`,
    `Federal standard deduction used: $${standard.toLocaleString('en-US')} (vs itemized $${itemizedDeductions.toLocaleString('en-US')}).`,
    `State model: ${stateModel.name} (${stateModel.kind}). ${state.note}`,
    'Does not include AMT, NIIT, SE tax, FICA, local/city taxes, or most credits.',
    'CTC model ignores age/SSN/refundable split — educational only.',
  ];

  return {
    country: 'US',
    regionCode: stateModel.code,
    regionName: stateModel.name,
    filingLabel: filingLabel(profile),
    grossIncome: gross,
    taxableIncome: taxable,
    federalTaxGross: fed.tax,
    federalTax,
    regionalTaxGross: state.tax,
    regionalTax,
    federalCredits,
    regionalCredits,
    totalCredits: federalCredits + regionalCredits,
    totalEstimatedTax: total,
    effectiveRate: gross > 0 ? (total / gross) * 100 : 0,
    marginalRate: (fed.marginal + state.marginal) * 100,
    estimatedLiabilityAfterWithholding: afterWithholding,
    standardDeductionUsed: deduction,
    creditLines,
    notes,
    disclaimer:
      'Educational estimate only — not tax advice. Confirm with IRS tools, your state DOR, or a CPA before filing.',
  };
}

export function estimateCRATax(profile: TaxProfile, itemizedDeductions = 0): TaxEstimateResult {
  const gross = profile.annualGrossIncome + profile.otherIncome;
  // User-tracked deductions treated as above-the-line reductions (RRSP-style educational)
  const taxable = clampNonNegative(gross - itemizedDeductions);

  const region = getCaRegionModel(profile.provinceOrState);
  const fed = taxFromBrackets(taxable, CA_FEDERAL_BRACKETS);
  const prov = taxFromBrackets(taxable, region.brackets);

  // Non-refundable credits valued at lowest rate × credit amounts
  const fedBpaCredit = CA_FEDERAL_BPA * CA_FEDERAL_LOWEST_RATE;
  const fedDependentAmount = estimateCaDependentCredit(profile.dependents);
  const fedDependentCredit = fedDependentAmount * CA_FEDERAL_LOWEST_RATE;
  // Quebec abatement educational: reduce federal by ~16.5% of basic federal tax for QC residents
  const quebecAbatement =
    region.code === 'QC' ? fed.tax * 0.165 : 0;

  const federalCredits = fedBpaCredit + fedDependentCredit + quebecAbatement;
  const federalTax = clampNonNegative(fed.tax - federalCredits);

  const provBpaCredit = region.basicPersonalAmount * region.lowestRate;
  const regionalCredits = provBpaCredit;
  const regionalTax = clampNonNegative(prov.tax - regionalCredits);

  const total = federalTax + regionalTax;
  const afterWithholding = total - profile.estimatedWithholding;

  const creditLines: { label: string; amount: number }[] = [
    { label: 'Federal basic personal amount credit', amount: fedBpaCredit },
  ];
  if (fedDependentCredit > 0) {
    creditLines.push({ label: 'Federal dependent-style credit (simplified)', amount: fedDependentCredit });
  }
  if (quebecAbatement > 0) {
    creditLines.push({ label: 'Quebec abatement (simplified)', amount: quebecAbatement });
  }
  creditLines.push({
    label: `${region.name} basic personal amount credit`,
    amount: provBpaCredit,
  });

  const notes = [
    `Province/territory: ${region.name}.`,
    `Taxable income after user deductions: $${taxable.toLocaleString('en-CA')}.`,
    'Canadian non-refundable credits applied at lowest bracket rates (educational).',
    region.note ?? 'Provincial surtaxes / health premiums not fully modeled.',
    'Does not include GST/HST credit, CWB full rules, tuition, medical, or RRSP contribution room math.',
  ];

  return {
    country: 'CA',
    regionCode: region.code,
    regionName: region.name,
    filingLabel: filingLabel(profile),
    grossIncome: gross,
    taxableIncome: taxable,
    federalTaxGross: fed.tax,
    federalTax,
    regionalTaxGross: prov.tax,
    regionalTax,
    federalCredits,
    regionalCredits,
    totalCredits: federalCredits + regionalCredits,
    totalEstimatedTax: total,
    effectiveRate: gross > 0 ? (total / gross) * 100 : 0,
    marginalRate: (fed.marginal + prov.marginal) * 100,
    estimatedLiabilityAfterWithholding: afterWithholding,
    standardDeductionUsed: itemizedDeductions,
    creditLines,
    notes,
    disclaimer:
      'Educational estimate only — not tax advice. Confirm with CRA / Revenu Québec or a licensed tax professional.',
  };
}

export function estimateTax(profile: TaxProfile, deductionsTotal = 0): TaxEstimateResult {
  return profile.country === 'CA'
    ? estimateCRATax(profile, deductionsTotal)
    : estimateUSFederalTax(profile, deductionsTotal);
}

export function downPaymentPlan(params: {
  homePrice: number;
  targetPercent: number;
  currentSavings: number;
  monthlyContribution: number;
  monthlyExtra?: number;
}): {
  targetAmount: number;
  remaining: number;
  monthsToGoal: number | null;
  yearsToGoal: number | null;
  progress: number;
} {
  const { homePrice, targetPercent, currentSavings, monthlyContribution, monthlyExtra = 0 } = params;
  const targetAmount = homePrice * (targetPercent / 100);
  const remaining = Math.max(0, targetAmount - currentSavings);
  const monthly = monthlyContribution + monthlyExtra;
  const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const yearsToGoal = monthsToGoal != null ? monthsToGoal / 12 : null;
  const progress = targetAmount > 0 ? Math.min(100, (currentSavings / targetAmount) * 100) : 0;
  return { targetAmount, remaining, monthsToGoal, yearsToGoal, progress };
}

/** Helper for UI region pickers. */
export { getUsStateModel } from '@/src/lib/tax/usTables';
export { getCaRegionModel } from '@/src/lib/tax/caTables';
