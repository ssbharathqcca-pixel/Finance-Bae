/**
 * Shared progressive-bracket math for educational tax estimates.
 */

export type TaxBracket = { upTo: number; rate: number };

export function taxFromBrackets(
  income: number,
  brackets: TaxBracket[]
): { tax: number; marginal: number } {
  if (!brackets.length) return { tax: 0, marginal: 0 };
  if (income <= 0) return { tax: 0, marginal: brackets[0].rate };

  let remaining = income;
  let lastCap = 0;
  let tax = 0;
  let marginal = brackets[0].rate;

  for (const bracket of brackets) {
    const width = bracket.upTo - lastCap;
    const slice = Math.min(remaining, width);
    if (slice <= 0) break;
    tax += slice * bracket.rate;
    remaining -= slice;
    marginal = bracket.rate;
    lastCap = bracket.upTo;
    if (remaining <= 0) break;
  }

  return { tax, marginal };
}

export function clampNonNegative(n: number): number {
  return Math.max(0, n);
}
