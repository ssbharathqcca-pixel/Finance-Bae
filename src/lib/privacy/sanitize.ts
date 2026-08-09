/**
 * Privacy sanitization for expense imports.
 *
 * Strips financial identifiers and personal data that must never be retained
 * under our local-only import contract (US/CA consumer privacy posture):
 * - Bank account / routing numbers
 * - Payment card PANs (and common masked forms)
 * - SSN / SIN style numbers
 * - Email addresses & phone numbers
 * - IBAN / SWIFT-like tokens
 *
 * We only keep human-readable expense names after redaction.
 */

const REDACT = '[redacted]';

/** Sequences that look like account, routing, card, SSN/SIN, or long IDs. */
const SENSITIVE_NUMBER_PATTERNS: RegExp[] = [
  // US routing (9 digits) near keywords
  /\b(?:routing|rtn|aba)[:\s#-]*\d{9}\b/gi,
  // Account labels + 6–17 digits
  /\b(?:acct|account|a\/c|acc(?:ount)?\s*(?:no|num|number|#)?)[:\s#-]*\d{6,17}\b/gi,
  // Card PAN 13–19 digits (with optional spaces/dashes)
  /\b(?:\d[ -]*?){13,19}\b/g,
  // Masked card ****1234 style kept only as last4 is still semi-sensitive — redact whole token
  /\*{2,}\d{3,6}\b/g,
  /\bx{2,}\d{3,6}\b/gi,
  // SSN / SIN
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g, // Canadian SIN style
  // IBAN-ish
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi,
  // SWIFT / BIC
  /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
];

const CONTACT_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
];

const BANK_META_PATTERNS: RegExp[] = [
  /\b(?:check|cheque)\s*(?:no|num|number|#)?[:\s-]*\d{3,}\b/gi,
  /\b(?:trace|ref(?:erence)?|confirmation|auth(?:orization)?)\s*(?:no|num|number|#|id)?[:\s-]*[A-Z0-9-]{6,}\b/gi,
  /\b(?:card\s*ending|ending\s*in)\s*\d{3,6}\b/gi,
];

/**
 * Redact sensitive tokens from free text (expense names / raw description cells).
 */
export function sanitizeExpenseLabel(raw: string): string {
  let text = String(raw ?? '');

  // Normalize whitespace early
  text = text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();

  for (const re of [...SENSITIVE_NUMBER_PATTERNS, ...CONTACT_PATTERNS, ...BANK_META_PATTERNS]) {
    text = text.replace(re, REDACT);
  }

  // Bare long digit runs (6+) that often encode accounts — keep short amounts like "2"
  text = text.replace(/\b\d{6,}\b/g, REDACT);

  // Collapse leftover redaction noise
  text = text
    .replace(new RegExp(`(?:\\s*${escapeRegExp(REDACT)}\\s*)+`, 'g'), ` ${REDACT} `)
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:/|-]+|[\s,;:/|-]+$/g, '')
    .trim();

  // If everything was redacted, provide a safe placeholder
  if (!text || text === REDACT || /^(\[redacted\]\s*)+$/i.test(text)) {
    return 'Imported expense';
  }

  // Cap length — long bank memos often embed extra PII
  if (text.length > 80) {
    text = `${text.slice(0, 77).trim()}…`;
  }

  return text;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Headers that must never be mapped / imported (privacy deny-list).
 * Matched case-insensitively as whole-header or substring for known sensitive labels.
 */
export const DENIED_HEADER_PATTERNS: RegExp[] = [
  /\baccount\b/i,
  /\bacct\b/i,
  /\brouting\b/i,
  /\baba\b/i,
  /\biban\b/i,
  /\bswift\b/i,
  /\bbic\b/i,
  /\bbalance\b/i,
  /\bavailable\b/i,
  /\bssn\b/i,
  /\bsin\b/i,
  /\bsocial\s*security\b/i,
  /\bcard\s*number\b/i,
  /\bpan\b/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /\baddress\b/i,
  /\bstreet\b/i,
  /\bzip\b/i,
  /\bpostal\b/i,
  /\bphone\b/i,
  /\bemail\b/i,
  /\bmember\s*id\b/i,
  /\bcustomer\s*id\b/i,
  /\binstitution\b/i,
  /\btransit\b/i, // Canadian transit number
  /\bbank\s*id\b/i,
];

export function isDeniedHeader(header: string): boolean {
  const h = header.trim();
  if (!h) return false;
  return DENIED_HEADER_PATTERNS.some((re) => re.test(h));
}

/** Columns allowed for mapping — only these fields may be retained. */
export const ALLOWED_FIELD_HELP = {
  title: 'Personalized expense name (sanitized — numbers/IDs stripped)',
  amount: 'Transaction amount only',
  category: 'Expense category (or inferred safely)',
  paymentMethod: 'Mode of payment (cash, debit, credit…) — never card numbers',
  date: 'Optional transaction date (not account data)',
} as const;
