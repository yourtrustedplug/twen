export const PAYOUT_METHODS = {
  airtel_money: { id: 'airtel_money', label: 'Airtel Money' },
  airteltigo_money: { id: 'airteltigo_money', label: 'AirtelTigo Money' },
  ecocash: { id: 'ecocash', label: 'EcoCash' },
  emola: { id: 'emola', label: 'e-Mola' },
  innbucks: { id: 'innbucks', label: 'InnBucks' },
  mixx_yas: { id: 'mixx_yas', label: 'Mixx by Yas' },
  moov_money: { id: 'moov_money', label: 'Moov Money' },
  mpesa: { id: 'mpesa', label: 'M-Pesa' },
  mtn_momo: { id: 'mtn_momo', label: 'MTN MoMo' },
  onemoney: { id: 'onemoney', label: 'OneMoney' },
  opay: { id: 'opay', label: 'OPay' },
  orange_money: { id: 'orange_money', label: 'Orange Money' },
  palmpay: { id: 'palmpay', label: 'PalmPay' },
  telecel_cash: { id: 'telecel_cash', label: 'Telecel Cash' },
  tnm_mpamba: { id: 'tnm_mpamba', label: 'TNM Mpamba' },
  wave: { id: 'wave', label: 'Wave' },
} as const;

export type PayoutMethodId = keyof typeof PAYOUT_METHODS;

type PayoutCountry = {
  methods: readonly PayoutMethodId[];
  dial: string;
  iso: string;
};

/** Country names match `COUNTRIES` in geo.ts. */
export const PAYOUT_BY_COUNTRY: Record<string, PayoutCountry> = {
  Benin: { methods: ['mtn_momo', 'moov_money'], dial: '+229', iso: 'BJ' },
  'Burkina Faso': { methods: ['orange_money', 'moov_money'], dial: '+226', iso: 'BF' },
  Cameroon: { methods: ['mtn_momo', 'orange_money'], dial: '+237', iso: 'CM' },
  Chad: { methods: ['airtel_money'], dial: '+235', iso: 'TD' },
  Congo: { methods: ['mtn_momo', 'airtel_money'], dial: '+242', iso: 'CG' },
  'Côte d’Ivoire': { methods: ['orange_money', 'mtn_momo', 'moov_money', 'wave'], dial: '+225', iso: 'CI' },
  'DR Congo': { methods: ['mpesa', 'airtel_money', 'orange_money'], dial: '+243', iso: 'CD' },
  Eswatini: { methods: ['mtn_momo'], dial: '+268', iso: 'SZ' },
  Gabon: { methods: ['airtel_money', 'moov_money'], dial: '+241', iso: 'GA' },
  Ghana: { methods: ['mtn_momo', 'telecel_cash', 'airteltigo_money'], dial: '+233', iso: 'GH' },
  Guinea: { methods: ['orange_money', 'mtn_momo'], dial: '+224', iso: 'GN' },
  Kenya: { methods: ['mpesa', 'airtel_money'], dial: '+254', iso: 'KE' },
  Lesotho: { methods: ['mpesa', 'ecocash'], dial: '+266', iso: 'LS' },
  Liberia: { methods: ['mtn_momo', 'orange_money'], dial: '+231', iso: 'LR' },
  Madagascar: { methods: ['airtel_money', 'orange_money'], dial: '+261', iso: 'MG' },
  Malawi: { methods: ['airtel_money', 'tnm_mpamba'], dial: '+265', iso: 'MW' },
  Mali: { methods: ['orange_money', 'moov_money'], dial: '+223', iso: 'ML' },
  Mozambique: { methods: ['mpesa', 'emola'], dial: '+258', iso: 'MZ' },
  Niger: { methods: ['airtel_money', 'moov_money'], dial: '+227', iso: 'NE' },
  Nigeria: { methods: ['opay', 'palmpay'], dial: '+234', iso: 'NG' },
  Rwanda: { methods: ['mtn_momo', 'airtel_money'], dial: '+250', iso: 'RW' },
  Senegal: { methods: ['orange_money', 'wave'], dial: '+221', iso: 'SN' },
  'Sierra Leone': { methods: ['orange_money'], dial: '+232', iso: 'SL' },
  Tanzania: { methods: ['mpesa', 'airtel_money', 'mixx_yas'], dial: '+255', iso: 'TZ' },
  Togo: { methods: ['moov_money'], dial: '+228', iso: 'TG' },
  Uganda: { methods: ['mtn_momo', 'airtel_money'], dial: '+256', iso: 'UG' },
  Zambia: { methods: ['mtn_momo', 'airtel_money'], dial: '+260', iso: 'ZM' },
  Zimbabwe: { methods: ['ecocash', 'onemoney', 'innbucks'], dial: '+263', iso: 'ZW' },
};

export type WithdrawalAccountInput = {
  country: string;
  method: string;
  accountNumber: string;
  accountName?: string;
};

export const isPayoutMethodId = (value: string): value is PayoutMethodId =>
  value in PAYOUT_METHODS;

export const payoutCountryCount = () => Object.keys(PAYOUT_BY_COUNTRY).length;

export const payoutMethodCount = () => Object.keys(PAYOUT_METHODS).length;

/** Short list used on About / welcome copy. */
export const payoutRailsSummary = () => 'EcoCash, M-Pesa, MTN MoMo, Airtel Money, and more';

export const payoutCountryNames = () => Object.keys(PAYOUT_BY_COUNTRY).sort((a, b) => a.localeCompare(b));

export const isPayoutCountry = (country: string) => country in PAYOUT_BY_COUNTRY;

export const methodsForCountry = (country: string): PayoutMethodId[] =>
  PAYOUT_BY_COUNTRY[country]?.methods.slice() ?? [];

export const isMethodForCountry = (country: string, method: string) =>
  isPayoutMethodId(method) && methodsForCountry(country).includes(method);

export const methodLabel = (method: string | null | undefined) =>
  method && isPayoutMethodId(method) ? PAYOUT_METHODS[method].label : method || 'Payout';

export const dialCodeFor = (country: string) => PAYOUT_BY_COUNTRY[country]?.dial ?? '';

export const isoForCountry = (country: string) => PAYOUT_BY_COUNTRY[country]?.iso ?? '';

export const flagUrl = (iso: string, width = 80) =>
  `https://flagcdn.com/w${width}/${iso.toLowerCase()}.png`;

export const normalizePayoutNumber = (value: string) => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};

export const validateWithdrawalAccount = (input: WithdrawalAccountInput): string | null => {
  if (!isPayoutCountry(input.country)) return 'Choose a country we can pay out to.';
  if (!isMethodForCountry(input.country, input.method)) {
    return 'Choose a payout method for that country.';
  }
  if (normalizePayoutNumber(input.accountNumber).replace(/\D/g, '').length < 8) {
    return 'Enter a valid mobile money number.';
  }
  return null;
};

export const redactAccountNumber = (value: string | null | undefined, visible = 3) => {
  const digits = (value ?? '').replace(/\D/g, '');
  const tail = digits.slice(-visible);
  return `${'*'.repeat(5)}${tail}`;
};

export const formatPayoutDestination = (input: {
  country?: string | null;
  method?: string | null;
  accountNumber?: string | null;
  account_number?: string | null;
}) => {
  const parts = [
    input.country?.trim(),
    methodLabel(input.method),
    (input.accountNumber ?? input.account_number)?.trim(),
  ].filter(Boolean);
  return parts.join(' · ');
};
