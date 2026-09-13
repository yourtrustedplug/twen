import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './geo';
import {
  PAYOUT_BY_COUNTRY,
  flagUrl,
  formatPayoutDestination,
  isoForCountry,
  isMethodForCountry,
  methodsForCountry,
  methodLabel,
  normalizePayoutNumber,
  payoutCountryCount,
  payoutCountryNames,
  payoutMethodCount,
  payoutRailsSummary,
  redactAccountNumber,
  validateWithdrawalAccount,
} from './payout-methods';

describe('payout methods', () => {
  it('uses geo country names so profile location can prefill', () => {
    const names = new Set(COUNTRIES.map((c) => c.name));
    for (const country of Object.keys(PAYOUT_BY_COUNTRY)) {
      expect(names.has(country), country).toBe(true);
    }
  });

  it('lists Zimbabwe EcoCash and Kenya M-Pesa', () => {
    expect(methodsForCountry('Zimbabwe')).toContain('ecocash');
    expect(methodsForCountry('Kenya')).toEqual(['mpesa', 'airtel_money']);
    expect(isMethodForCountry('Uganda', 'mtn_momo')).toBe(true);
    expect(isMethodForCountry('Uganda', 'mpesa')).toBe(false);
  });

  it('maps countries to ISO flags', () => {
    expect(isoForCountry('Zimbabwe')).toBe('ZW');
    expect(isoForCountry('Kenya')).toBe('KE');
    expect(flagUrl('ZW')).toBe('https://flagcdn.com/w80/zw.png');
    expect(Object.values(PAYOUT_BY_COUNTRY).every((c) => c.iso.length === 2)).toBe(true);
  });

  it('sorts payout countries and labels methods', () => {
    const names = payoutCountryNames();
    expect(names[0] < names[names.length - 1]).toBe(true);
    expect(methodLabel('ecocash')).toBe('EcoCash');
    expect(methodLabel('mtn_momo')).toBe('MTN MoMo');
    expect(methodLabel('unknown')).toBe('unknown');
  });

  it('counts real rails for marketing copy', () => {
    expect(payoutCountryCount()).toBeGreaterThanOrEqual(20);
    expect(payoutMethodCount()).toBeGreaterThanOrEqual(10);
    expect(payoutRailsSummary()).toMatch(/EcoCash/);
    expect(payoutRailsSummary()).toMatch(/M-Pesa/);
  });

  it('validates a complete withdrawal account', () => {
    expect(
      validateWithdrawalAccount({
        country: 'Zimbabwe',
        method: 'ecocash',
        accountNumber: '+263771234567',
      }),
    ).toBeNull();
    expect(
      validateWithdrawalAccount({
        country: 'France',
        method: 'ecocash',
        accountNumber: '+263771234567',
      }),
    ).toMatch(/country/i);
    expect(
      validateWithdrawalAccount({
        country: 'Kenya',
        method: 'ecocash',
        accountNumber: '+254700000000',
      }),
    ).toMatch(/payout method/i);
    expect(
      validateWithdrawalAccount({
        country: 'Kenya',
        method: 'mpesa',
        accountNumber: '123',
      }),
    ).toMatch(/number/i);
  });

  it('redacts account numbers like *****891', () => {
    expect(redactAccountNumber('+263771234891')).toBe('*****891');
    expect(redactAccountNumber('0771234891')).toBe('*****891');
  });

  it('normalizes numbers and formats destinations', () => {
    expect(normalizePayoutNumber('+263 77 123 4567')).toBe('+263771234567');
    expect(normalizePayoutNumber('077 123 4567')).toBe('0771234567');
    expect(
      formatPayoutDestination({
        country: 'Zimbabwe',
        method: 'ecocash',
        accountNumber: '+263771234567',
      }),
    ).toBe('Zimbabwe · EcoCash · +263771234567');
  });
});
