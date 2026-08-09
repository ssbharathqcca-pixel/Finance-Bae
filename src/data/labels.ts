import {
  BudgetKind,
  DebtKind,
  ExpenseCategory,
  NoticeAuthority,
  PaymentMethod,
  SplitEventKind,
} from '@/src/types';

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  food: 'Groceries',
  transport: 'Transport',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  pets: 'Pets',
  travel: 'Travel',
  dining: 'Dining out',
  parties: 'Parties & events',
  tax: 'Tax & fees',
  other: 'Other',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  debit: 'Debit',
  credit: 'Credit',
  e_transfer: 'E-transfer / ACH',
  check: 'Check / cheque',
  mobile_wallet: 'Mobile wallet',
  other: 'Other',
  unknown: 'Unknown',
};

export const budgetKindLabels: Record<BudgetKind, string> = {
  house_party: 'House party',
  get_together: 'Get-together',
  trip: 'Trip',
  dinner_date: 'Dinner date',
  lunch_date: 'Lunch date',
  pet: 'Pet care',
  home_downpayment: 'Home down payment',
  custom: 'Custom',
};

export const budgetKindEmoji: Record<BudgetKind, string> = {
  house_party: '🎉',
  get_together: '🥂',
  trip: '✈️',
  dinner_date: '🍽️',
  lunch_date: '🥗',
  pet: '🐾',
  home_downpayment: '🏠',
  custom: '✨',
};

export const splitKindLabels: Record<SplitEventKind, string> = {
  house_party: 'House party',
  get_together: 'Get-together',
  trip: 'Trip',
  dinner_date: 'Dinner date',
  lunch_date: 'Lunch date',
  custom: 'Custom',
};

export const splitKindEmoji: Record<SplitEventKind, string> = {
  house_party: '🎉',
  get_together: '🥂',
  trip: '✈️',
  dinner_date: '🍽️',
  lunch_date: '🥗',
  custom: '🧾',
};

export const debtKindLabels: Record<DebtKind, string> = {
  home_loan: 'Home loan / mortgage',
  capex: 'Capex / large purchase',
  credit_card: 'Credit card',
  personal_loan: 'Personal loan',
  overdraft: 'Overdraft',
  hand_loan: 'Hand loan (friends/family)',
  auto_loan: 'Auto loan',
  student_loan: 'Student loan',
  other: 'Other debt',
};

export const debtKindEmoji: Record<DebtKind, string> = {
  home_loan: '🏠',
  capex: '🏗️',
  credit_card: '💳',
  personal_loan: '📄',
  overdraft: '🏦',
  hand_loan: '🤝',
  auto_loan: '🚗',
  student_loan: '🎓',
  other: '📋',
};

export const authorityLabels: Record<NoticeAuthority, string> = {
  IRS: 'IRS (United States)',
  CRA: 'CRA (Canada)',
  STATE: 'US State',
  PROVINCIAL: 'Canadian Province',
  OTHER: 'Other',
};

export const usStates = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

export const usStateNames: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

export const caProvinces = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
];

export const caProvinceNames: Record<string, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

export const filingStatusLabels: Record<
  'single' | 'married_joint' | 'married_separate' | 'head_of_household' | 'common_law',
  string
> = {
  single: 'Single',
  married_joint: 'Married jointly',
  married_separate: 'Married separately',
  head_of_household: 'Head of household',
  common_law: 'Common-law',
};
