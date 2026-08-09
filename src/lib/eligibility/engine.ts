/**
 * Educational eligibility heuristics inspired by common US & Canadian
 * underwriting themes (DTI, credit bands, down payment, utilization).
 *
 * NOT a bank decision engine. Real approvals depend on full credit files,
 * verification, product rules, and lender discretion.
 */

import {
  CheckResult,
  EligibilityBundle,
  EligibilityInputs,
  LikelihoodBand,
  ProductEstimate,
} from '@/src/lib/eligibility/types';
import { CountryCode } from '@/src/types';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function money(n: number, country: CountryCode) {
  return new Intl.NumberFormat(country === 'CA' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency: country === 'CA' ? 'CAD' : 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function pct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

function bandFromScore(score: number): LikelihoodBand {
  if (score >= 75) return 'strong';
  if (score >= 55) return 'fair';
  if (score >= 35) return 'stretch';
  return 'unlikely';
}

function headlineFor(band: LikelihoodBand, product: string): string {
  switch (band) {
    case 'strong':
      return `Looking reasonably solid for a typical ${product} — still not a guarantee.`;
    case 'fair':
      return `You may be in the ballpark for a ${product}, with some soft spots.`;
    case 'stretch':
      return `A ${product} looks tight today — small changes could help a lot.`;
    default:
      return `A typical ${product} looks hard right now based on these numbers.`;
  }
}

/** Payment-to-income style DTI using monthly debt payments. */
function dtiPercent(income: number, debtPayments: number) {
  if (income <= 0) return 100;
  return (debtPayments / income) * 100;
}

/**
 * Very rough principal affordable from a monthly payment capacity
 * using a flat factor (educational, not amortization software).
 */
function roughPrincipalFromPayment(monthlyPayment: number, annualRate: number, years: number) {
  if (monthlyPayment <= 0 || years <= 0) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r <= 0) return monthlyPayment * n;
  return monthlyPayment * ((1 - Math.pow(1 + r, -n)) / r);
}

function creditCheck(score: number, country: CountryCode, product: string): CheckResult {
  // US FICO-ish bands; CA uses similar numerical ranges in practice for education
  let status: CheckResult['status'] = 'risk';
  let detail = '';
  if (score >= 740) {
    status = 'good';
    detail = `Your score estimate (${score}) is in a stronger range many ${country === 'CA' ? 'Canadian' : 'US'} lenders like for ${product}.`;
  } else if (score >= 670) {
    status = 'ok';
    detail = `Your score estimate (${score}) is roughly “good” — often workable, sometimes with a higher rate.`;
  } else if (score >= 580) {
    status = 'watch';
    detail = `Your score estimate (${score}) is on the lower side. Approvals are harder and costs are usually higher.`;
  } else {
    status = 'risk';
    detail = `Your score estimate (${score}) is well below what most mainstream banks want for ${product}.`;
  }
  return {
    id: 'credit',
    title: 'Credit health (estimate)',
    status,
    detail,
    score: clamp(((score - 300) / 550) * 100, 0, 100),
  };
}

function incomeStabilityCheck(years: number, stable: boolean): CheckResult {
  if (stable && years >= 2) {
    return {
      id: 'job',
      title: 'Steady income story',
      status: 'good',
      detail: `About ${years.toFixed(1)} years with stable income — that usually helps lenders feel comfortable.`,
      score: 90,
    };
  }
  if (stable && years >= 1) {
    return {
      id: 'job',
      title: 'Steady income story',
      status: 'ok',
      detail: `Around ${years.toFixed(1)} year(s) of stable income — acceptable for many products, weaker for big mortgages.`,
      score: 70,
    };
  }
  if (years >= 0.5) {
    return {
      id: 'job',
      title: 'Steady income story',
      status: 'watch',
      detail: 'Income looks newer or less steady. Banks often want a clearer track record.',
      score: 45,
    };
  }
  return {
    id: 'job',
    title: 'Steady income story',
    status: 'risk',
    detail: 'Very short or unclear income history makes approvals much harder.',
    score: 20,
  };
}

function debtLoadCheck(dti: number, soft: number, hard: number): CheckResult {
  if (dti <= soft) {
    return {
      id: 'dti',
      title: 'How much of your pay already goes to debts',
      status: 'good',
      detail: `About ${pct(dti)} of monthly income is already committed to debts — under the softer comfort zone (~${pct(soft, 0)}).`,
      score: 90,
    };
  }
  if (dti <= hard) {
    return {
      id: 'dti',
      title: 'How much of your pay already goes to debts',
      status: 'ok',
      detail: `About ${pct(dti)} of income goes to debts — still within a common outer limit (~${pct(hard, 0)}), but room is tight.`,
      score: 60,
    };
  }
  if (dti <= hard + 10) {
    return {
      id: 'dti',
      title: 'How much of your pay already goes to debts',
      status: 'watch',
      detail: `About ${pct(dti)} of income is already spoken for by debts — above what many banks prefer.`,
      score: 35,
    };
  }
  return {
    id: 'dti',
    title: 'How much of your pay already goes to debts',
    status: 'risk',
    detail: `About ${pct(dti)} of income goes to debts — that usually blocks new credit until balances drop.`,
    score: 15,
  };
}

function cashFlowCheck(
  income: number,
  expenses: number,
  debts: number,
  country: CountryCode
): CheckResult {
  const free = income - expenses - debts;
  if (free >= income * 0.15) {
    return {
      id: 'cash',
      title: 'Money left after bills',
      status: 'good',
      detail: `Roughly ${money(free, country)} left each month after living costs and debt payments (before a new loan). That cushion helps.`,
      score: 88,
    };
  }
  if (free >= 0) {
    return {
      id: 'cash',
      title: 'Money left after bills',
      status: 'ok',
      detail: `You still have a little left after expenses and debts, but not a large cushion.`,
      score: 55,
    };
  }
  if (free >= -income * 0.1) {
    return {
      id: 'cash',
      title: 'Money left after bills',
      status: 'watch',
      detail: 'Spending and debts are eating almost all income — new payments would be hard to carry.',
      score: 30,
    };
  }
  return {
    id: 'cash',
    title: 'Money left after bills',
    status: 'risk',
    detail: 'Right now expenses and debts appear larger than income. New credit is very unlikely until that flips.',
    score: 10,
  };
}

function avgCheckScore(checks: CheckResult[]): number {
  if (!checks.length) return 0;
  const scored = checks.filter((c) => c.score != null);
  if (!scored.length) return 50;
  return scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length;
}

function disclaimer(country: CountryCode): string {
  return country === 'CA'
    ? 'Suggestion only — not a bank offer. Final yes/no, rates, and limits are decided by Canadian lenders/credit unions under their own rules, credit checks, and verification. Confirm with the institution and, if needed, a licensed mortgage professional.'
    : 'Suggestion only — not a bank offer. Final yes/no, rates, and limits are decided by US lenders under their own rules, credit checks, and verification. Confirm with the institution and, if needed, a licensed professional.';
}

export function estimateHomeLoan(input: EligibilityInputs): ProductEstimate {
  const country = input.country;
  const price = Math.max(0, input.homePrice || 0);
  const down = Math.max(0, input.downPayment || 0);
  const years = input.mortgageYears || 30;
  const loan = Math.max(0, price - down);
  const ltv = price > 0 ? (loan / price) * 100 : 100;
  const downPct = price > 0 ? (down / price) * 100 : 0;

  // Educational rates for capacity sketch
  const rate = country === 'CA' ? 5.5 : 6.8;
  const dtiSoft = country === 'CA' ? 35 : 36;
  const dtiHard = country === 'CA' ? 42 : 43;
  // Housing payment comfort often discussed near 28–32% of income (front-end)
  const frontSoft = country === 'CA' ? 32 : 28;
  const dti = dtiPercent(input.monthlyIncome, input.monthlyDebtPayments);

  // Room for new housing payment before hitting hard DTI
  const maxDebtPayment = (input.monthlyIncome * dtiHard) / 100;
  const roomForHousing = Math.max(0, maxDebtPayment - input.monthlyDebtPayments);
  const frontCap = (input.monthlyIncome * frontSoft) / 100;
  const paymentCapacity = Math.min(roomForHousing, frontCap);
  const affordablePrincipal = roughPrincipalFromPayment(paymentCapacity, rate, years);

  const checks: CheckResult[] = [
    creditCheck(input.creditScore, country, 'a home loan'),
    incomeStabilityCheck(input.employmentYears, input.incomeStable),
    debtLoadCheck(dti, dtiSoft, dtiHard),
    cashFlowCheck(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayments, country),
  ];

  // Down payment / equity
  const minDown =
    country === 'CA'
      ? price <= 500000
        ? 5
        : price <= 1000000
          ? // simplified step: 5% first 500k + 10% rest → show effective need ~5–10
            5
          : 20
      : 3; // US conventional often 3%+ with PMI; 20% avoids PMI

  if (downPct >= 20) {
    checks.push({
      id: 'down',
      title: 'Down payment strength',
      status: 'good',
      detail: `About ${pct(downPct)} down — at/above 20%, which often means no mortgage insurance and stronger lender comfort.`,
      score: 95,
    });
  } else if (downPct >= minDown) {
    checks.push({
      id: 'down',
      title: 'Down payment strength',
      status: 'ok',
      detail:
        country === 'CA'
          ? `About ${pct(downPct)} down meets a common minimum path in Canada (rules vary by price). Mortgage insurance may apply under 20%.`
          : `About ${pct(downPct)} down meets a low-down conventional/FHA-style path. Private mortgage insurance is common under 20%.`,
      score: 70,
    });
  } else {
    checks.push({
      id: 'down',
      title: 'Down payment strength',
      status: 'risk',
      detail: `About ${pct(downPct)} down is below common minimums for this price band. Saving more down usually unlocks better options.`,
      score: 25,
    });
  }

  if (ltv > 0 && ltv <= 80) {
    checks.push({
      id: 'ltv',
      title: 'Loan size vs home price',
      status: 'good',
      detail: `You would borrow about ${pct(ltv)} of the price (loan-to-value) — a comfortable zone for many banks.`,
      score: 90,
    });
  } else if (ltv <= 95) {
    checks.push({
      id: 'ltv',
      title: 'Loan size vs home price',
      status: 'ok',
      detail: `Borrowing about ${pct(ltv)} of the price is common with insurance, but leaves less cushion if values dip.`,
      score: 65,
    });
  } else {
    checks.push({
      id: 'ltv',
      title: 'Loan size vs home price',
      status: 'risk',
      detail: 'The loan would be almost as large as (or larger than) the home price — lenders rarely like that.',
      score: 20,
    });
  }

  if (input.primaryResidence !== false) {
    checks.push({
      id: 'use',
      title: 'How you’ll use the home',
      status: 'good',
      detail: 'Primary home use is usually easier to approve than investment property.',
      score: 85,
    });
  }

  // Capacity vs requested loan
  if (loan > 0) {
    if (loan <= affordablePrincipal * 0.9) {
      checks.push({
        id: 'capacity',
        title: 'Can the payment fit your budget?',
        status: 'good',
        detail: `A rough payment capacity sketch supports about ${money(affordablePrincipal, country)} of loan — your ask is lower.`,
        score: 90,
      });
    } else if (loan <= affordablePrincipal * 1.1) {
      checks.push({
        id: 'capacity',
        title: 'Can the payment fit your budget?',
        status: 'ok',
        detail: `Your loan ask is near a rough capacity of about ${money(affordablePrincipal, country)}. Rates and taxes can tip this either way.`,
        score: 55,
      });
    } else {
      checks.push({
        id: 'capacity',
        title: 'Can the payment fit your budget?',
        status: 'risk',
        detail: `Your loan ask (~${money(loan, country)}) is above a rough affordable sketch (~${money(affordablePrincipal, country)}) using common debt-ratio limits.`,
        score: 25,
      });
    }
  }

  const score = Math.round(avgCheckScore(checks));
  const band = bandFromScore(score);

  const tips = [
    'Try to keep total monthly debts (including the new mortgage) under roughly 36–43% of gross-style income, depending on the lender.',
    country === 'CA'
      ? 'In Canada, high-ratio mortgages (under 20% down) usually need mortgage default insurance and pass a “stress test” rate higher than your contract rate — we only sketch that idea here.'
      : 'In the US, under 20% down often means PMI; government-backed loans have their own rules (FHA, VA, USDA) we only summarize lightly.',
    'Lenders also verify taxes, job letters, and credit reports — numbers in this app are a classroom, not an underwriting file.',
  ];

  return {
    product: 'home_loan',
    title: 'Home loan (mortgage)',
    band,
    score,
    headline: headlineFor(band, 'home loan'),
    summary: `We looked at income, existing debts, credit band, down payment, and a simple payment-capacity sketch using ${country === 'CA' ? 'Canadian-style' : 'US-style'} debt-ratio themes.`,
    checks,
    suggestions: [
      { label: 'Home price entered', value: money(price, country) },
      { label: 'Down payment', value: `${money(down, country)} (${pct(downPct)})` },
      { label: 'Loan amount', value: money(loan, country) },
      { label: 'Rough max loan (sketch)', value: money(affordablePrincipal, country) },
      { label: 'Room for housing payment (sketch)', value: money(paymentCapacity, country) + '/mo' },
    ],
    tips,
    disclaimer: disclaimer(country),
  };
}

export function estimatePersonalLoan(input: EligibilityInputs): ProductEstimate {
  const country = input.country;
  const amount = Math.max(0, input.personalLoanAmount || 0);
  const months = Math.max(12, input.personalLoanMonths || 36);
  const dtiSoft = 30;
  const dtiHard = country === 'CA' ? 40 : 40;
  const dti = dtiPercent(input.monthlyIncome, input.monthlyDebtPayments);
  const rate = country === 'CA' ? 11 : 12; // educational mid unsecured
  const roughPayment =
    amount > 0 ? amount / months + (amount * (rate / 100)) / 12 / 2 : 0; // crude

  const maxDebtPayment = (input.monthlyIncome * dtiHard) / 100;
  const room = Math.max(0, maxDebtPayment - input.monthlyDebtPayments);
  const maxAmount = room * months * 0.85; // crude capacity

  const checks: CheckResult[] = [
    creditCheck(input.creditScore, country, 'a personal loan'),
    incomeStabilityCheck(input.employmentYears, input.incomeStable),
    debtLoadCheck(dti, dtiSoft, dtiHard),
    cashFlowCheck(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayments, country),
  ];

  if (amount <= 0) {
    checks.push({
      id: 'amount',
      title: 'Loan size requested',
      status: 'watch',
      detail: 'Enter how much you want to borrow to size the payment sketch.',
      score: 50,
    });
  } else if (amount <= maxAmount) {
    checks.push({
      id: 'amount',
      title: 'Loan size vs budget room',
      status: 'good',
      detail: `Your ask (${money(amount, country)}) fits under a rough affordable ceiling near ${money(maxAmount, country)}.`,
      score: 85,
    });
  } else if (amount <= maxAmount * 1.25) {
    checks.push({
      id: 'amount',
      title: 'Loan size vs budget room',
      status: 'watch',
      detail: `Your ask is a bit above a rough ceiling (~${money(maxAmount, country)}). A smaller amount or longer term may help.`,
      score: 45,
    });
  } else {
    checks.push({
      id: 'amount',
      title: 'Loan size vs budget room',
      status: 'risk',
      detail: `Your ask looks high versus leftover room for new payments (~${money(maxAmount, country)} sketch).`,
      score: 20,
    });
  }

  // Unsecured loans often capped vs annual income
  const incomeCap = input.monthlyIncome * 12 * (country === 'CA' ? 0.5 : 0.4);
  if (amount > 0 && amount > incomeCap) {
    checks.push({
      id: 'income_cap',
      title: 'Loan size vs yearly income',
      status: 'watch',
      detail: `Many banks dislike unsecured loans larger than a fraction of yearly pay. Your ask is high versus ~${money(incomeCap, country)} as a soft educational cap.`,
      score: 35,
    });
  } else if (amount > 0) {
    checks.push({
      id: 'income_cap',
      title: 'Loan size vs yearly income',
      status: 'good',
      detail: 'The amount is within a soft “share of yearly income” comfort band used for education only.',
      score: 80,
    });
  }

  const score = Math.round(avgCheckScore(checks));
  const band = bandFromScore(score);

  return {
    product: 'personal_loan',
    title: 'Personal loan',
    band,
    score,
    headline: headlineFor(band, 'personal loan'),
    summary:
      'Unsecured personal loans are judged mainly on credit, income stability, and whether the new payment still leaves you breathing room.',
    checks,
    suggestions: [
      { label: 'Amount requested', value: money(amount, country) },
      { label: 'Term', value: `${months} months` },
      { label: 'Rough new payment (sketch)', value: money(roughPayment, country) + '/mo' },
      { label: 'Soft max amount (sketch)', value: money(maxAmount, country) },
    ],
    tips: [
      'Shop APR and fees — a “yes” with a very high rate can still be a bad deal.',
      'Paying down credit cards first often improves both DTI and score before you apply.',
      'Multiple loan applications in a short window can ding your credit — apply thoughtfully.',
    ],
    disclaimer: disclaimer(country),
  };
}

export function estimateCreditCard(input: EligibilityInputs): ProductEstimate {
  const country = input.country;
  const req = Math.max(0, input.requestedCardLimit || 0);
  const existing = Math.max(0, input.existingCardLimits || 0);
  const balances = Math.max(0, input.cardBalances || 0);
  const util = existing > 0 ? (balances / existing) * 100 : balances > 0 ? 100 : 0;
  const dti = dtiPercent(input.monthlyIncome, input.monthlyDebtPayments);
  const annual = input.monthlyIncome * 12;

  // Educational suggested limit: portion of monthly income × multiplier by credit band
  let mult = 0.5;
  if (input.creditScore >= 740) mult = 2.5;
  else if (input.creditScore >= 670) mult = 1.5;
  else if (input.creditScore >= 620) mult = 0.8;
  else mult = 0.3;
  const suggested = input.monthlyIncome * mult * 1; // monthly income * mult as limit sketch
  // Also cap vs annual income
  const cap = annual * (country === 'CA' ? 0.2 : 0.25);
  const suggestedLimit = Math.min(suggested * 12 * 0.15, cap); // smooth educational

  const checks: CheckResult[] = [
    creditCheck(input.creditScore, country, 'a credit card'),
    incomeStabilityCheck(input.employmentYears, input.incomeStable),
    debtLoadCheck(dti, 30, 40),
    cashFlowCheck(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayments, country),
  ];

  if (util <= 30) {
    checks.push({
      id: 'util',
      title: 'How full your current cards are',
      status: 'good',
      detail: `You’re using about ${pct(util)} of existing card limits — under 30% is a healthy habit banks like to see.`,
      score: 92,
    });
  } else if (util <= 50) {
    checks.push({
      id: 'util',
      title: 'How full your current cards are',
      status: 'ok',
      detail: `About ${pct(util)} utilization — okay, but under 30% usually looks better.`,
      score: 60,
    });
  } else if (util <= 75) {
    checks.push({
      id: 'util',
      title: 'How full your current cards are',
      status: 'watch',
      detail: `About ${pct(util)} of your limits are used. High balances often block new cards or force low limits.`,
      score: 35,
    });
  } else {
    checks.push({
      id: 'util',
      title: 'How full your current cards are',
      status: 'risk',
      detail: `Very high utilization (~${pct(util)}). Paying this down is usually priority #1 before applying.`,
      score: 15,
    });
  }

  if (req > 0 && req <= suggestedLimit * 1.1) {
    checks.push({
      id: 'limit_ask',
      title: 'Limit you asked for',
      status: 'good',
      detail: `Your requested limit is near a soft educational suggestion of about ${money(suggestedLimit, country)}.`,
      score: 80,
    });
  } else if (req > suggestedLimit * 1.1) {
    checks.push({
      id: 'limit_ask',
      title: 'Limit you asked for',
      status: 'watch',
      detail: `Your requested limit is above a soft sketch (~${money(suggestedLimit, country)}). Banks may approve a smaller limit — or decline.`,
      score: 40,
    });
  }

  if (annual < (country === 'CA' ? 15000 : 12000)) {
    checks.push({
      id: 'income_floor',
      title: 'Income level',
      status: 'watch',
      detail: 'Income looks low for many mainstream rewards cards; secured or starter cards may fit better.',
      score: 40,
    });
  } else {
    checks.push({
      id: 'income_floor',
      title: 'Income level',
      status: 'good',
      detail: 'Income clears a soft floor used for everyday card products in this sketch.',
      score: 75,
    });
  }

  const score = Math.round(avgCheckScore(checks));
  const band = bandFromScore(score);

  return {
    product: 'credit_card',
    title: 'Credit card',
    band,
    score,
    headline: headlineFor(band, 'credit card'),
    summary:
      'Card decisions lean on credit history, income, existing balances, and whether you already look stretched.',
    checks,
    suggestions: [
      { label: 'Soft suggested limit', value: money(suggestedLimit, country) },
      { label: 'Limit you asked for', value: money(req, country) },
      { label: 'Current utilization', value: pct(util) },
      { label: 'Existing total limits', value: money(existing, country) },
    ],
    tips: [
      'Aim to keep card balances under ~30% of total limits most of the time.',
      'A secured card or credit-builder product can be a smarter first step than a high-limit ask.',
      country === 'CA'
        ? 'Canadian issuers also check your credit file and may pull Equifax/TransUnion — soft educational tools cannot see that file.'
        : 'US issuers hard-pull your credit report; pre-qualification tools at the bank may be softer than a full application.',
    ],
    disclaimer: disclaimer(country),
  };
}

export function estimateLimitIncrease(input: EligibilityInputs): ProductEstimate {
  const country = input.country;
  const current = Math.max(0, input.currentLimit || 0);
  const requested = Math.max(0, input.requestedNewLimit || current);
  const months = Math.max(0, input.monthsWithCard || 0);
  const onTime = Math.max(0, input.onTimePaymentMonths || 0);
  const lates = Math.max(0, input.recentLatePayments || 0);
  const existing = Math.max(current, input.existingCardLimits || current);
  const balances = Math.max(0, input.cardBalances || 0);
  const util = existing > 0 ? (balances / existing) * 100 : 0;
  const bump = current > 0 ? ((requested - current) / current) * 100 : 0;

  const checks: CheckResult[] = [
    creditCheck(input.creditScore, country, 'a higher limit'),
  ];

  if (months >= 12) {
    checks.push({
      id: 'tenure',
      title: 'How long you’ve had the card',
      status: 'good',
      detail: `About ${months} months with the card — many issuers like at least 6–12 months before big increases.`,
      score: 85,
    });
  } else if (months >= 6) {
    checks.push({
      id: 'tenure',
      title: 'How long you’ve had the card',
      status: 'ok',
      detail: `About ${months} months — some issuers will consider a small increase; others wait longer.`,
      score: 60,
    });
  } else {
    checks.push({
      id: 'tenure',
      title: 'How long you’ve had the card',
      status: 'watch',
      detail: 'Under 6 months is early for a large increase at many banks.',
      score: 35,
    });
  }

  if (lates === 0 && onTime >= 6) {
    checks.push({
      id: 'payments',
      title: 'On-time payments',
      status: 'good',
      detail: `Nice streak of on-time payments (${onTime} months noted) with no recent lates — this is the #1 thing issuers want.`,
      score: 95,
    });
  } else if (lates === 0) {
    checks.push({
      id: 'payments',
      title: 'On-time payments',
      status: 'ok',
      detail: 'No recent late payments listed — keep building a longer perfect streak.',
      score: 70,
    });
  } else {
    checks.push({
      id: 'payments',
      title: 'On-time payments',
      status: 'risk',
      detail: `${lates} recent late payment(s) noted. Issuers often pause increases until the history cools off.`,
      score: 20,
    });
  }

  if (util <= 30) {
    checks.push({
      id: 'util',
      title: 'Balance vs limit right now',
      status: 'good',
      detail: `Utilization around ${pct(util)} looks controlled — increases are easier when you’re not maxed out.`,
      score: 90,
    });
  } else if (util <= 50) {
    checks.push({
      id: 'util',
      title: 'Balance vs limit right now',
      status: 'ok',
      detail: `Utilization around ${pct(util)}. Paying down before asking can improve odds.`,
      score: 55,
    });
  } else {
    checks.push({
      id: 'util',
      title: 'Balance vs limit right now',
      status: 'watch',
      detail: `High utilization (~${pct(util)}) can look like stress. Issuers may refuse or only grant a tiny bump.`,
      score: 30,
    });
  }

  if (bump <= 25) {
    checks.push({
      id: 'bump',
      title: 'Size of increase asked',
      status: 'good',
      detail: `You asked for about ${pct(bump)} more limit — modest asks are approved more often than doubling overnight.`,
      score: 85,
    });
  } else if (bump <= 50) {
    checks.push({
      id: 'bump',
      title: 'Size of increase asked',
      status: 'ok',
      detail: `About ${pct(bump)} higher — possible with strong history, not automatic.`,
      score: 55,
    });
  } else {
    checks.push({
      id: 'bump',
      title: 'Size of increase asked',
      status: 'watch',
      detail: `About ${pct(bump)} higher is a large jump. Consider a smaller step-up first.`,
      score: 35,
    });
  }

  if (input.incomeIncreasedRecently) {
    checks.push({
      id: 'income_up',
      title: 'Income update',
      status: 'good',
      detail: 'A recent income increase is a classic good reason to request a higher limit.',
      score: 80,
    });
  } else {
    checks.push({
      id: 'income_up',
      title: 'Income update',
      status: 'ok',
      detail: 'No recent income jump noted — still fine if everything else looks healthy.',
      score: 60,
    });
  }

  checks.push(
    cashFlowCheck(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayments, country)
  );

  const score = Math.round(avgCheckScore(checks));
  const band = bandFromScore(score);
  const softTarget = current > 0 ? current * (score >= 70 ? 1.35 : score >= 50 ? 1.2 : 1.1) : 0;

  return {
    product: 'limit_increase',
    title: 'Credit limit increase',
    band,
    score,
    headline: headlineFor(band, 'limit increase'),
    summary:
      'Limit increases reward clean payment history, responsible usage, enough time on the card, and room in your budget.',
    checks,
    suggestions: [
      { label: 'Current limit', value: money(current, country) },
      { label: 'You asked for', value: money(requested, country) },
      { label: 'Softer target (sketch)', value: money(softTarget, country) },
      { label: 'Current utilization', value: pct(util) },
    ],
    tips: [
      'Update income in the issuer app before requesting — many decisions are automated.',
      'Avoid asking every month; space requests (often 6+ months) unless the bank invites you.',
      'A higher limit helps your score only if balances stay low relative to the new limit.',
    ],
    disclaimer: disclaimer(country),
  };
}

export function runEligibilitySuite(input: EligibilityInputs): EligibilityBundle {
  const free = input.monthlyIncome - input.monthlyExpenses - input.monthlyDebtPayments;
  const dti = dtiPercent(input.monthlyIncome, input.monthlyDebtPayments);
  return {
    country: input.country,
    generatedAt: new Date().toISOString(),
    moneySnapshot: {
      monthlyIncome: money(input.monthlyIncome, input.country),
      monthlyExpenses: money(input.monthlyExpenses, input.country),
      monthlyDebtPayments: money(input.monthlyDebtPayments, input.country),
      freeCashAfterDebts: money(free, input.country),
      debtLoadPercent: pct(dti),
    },
    products: [
      estimateHomeLoan(input),
      estimatePersonalLoan(input),
      estimateCreditCard(input),
      estimateLimitIncrease(input),
    ],
  };
}
