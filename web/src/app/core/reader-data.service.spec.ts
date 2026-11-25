import { describe, expect, it } from 'vitest';
import {
  canApprovePayment,
  detectReceiptImageMime,
  hasCurrentAdultConsent,
  normalizeBrazilianPhone,
} from './reader-data.service';

describe('normalizeBrazilianPhone', () => {
  it('adds the Brazil country code to numbers entered with a DDD', () => {
    expect(normalizeBrazilianPhone('(11) 98765-4321')).toBe('+5511987654321');
  });

  it('preserves an existing Brazil country code', () => {
    expect(normalizeBrazilianPhone('+55 21 2345-6789')).toBe('+552123456789');
  });

  it('rejects incomplete and international numbers from other countries', () => {
    expect(normalizeBrazilianPhone('98765-4321')).toBe('');
    expect(normalizeBrazilianPhone('+1 415 555 2671')).toBe('');
  });
});

describe('hasCurrentAdultConsent', () => {
  it('requires an explicit confirmation and its attestation timestamp', () => {
    expect(hasCurrentAdultConsent({ adult_confirmed: true, adult_attested_at: '2026-11-25T12:00:00Z' })).toBe(true);
    expect(hasCurrentAdultConsent({ adult_confirmed: true, adult_attested_at: null })).toBe(false);
    expect(hasCurrentAdultConsent({ adult_confirmed: false, adult_attested_at: '2026-11-25T12:00:00Z' })).toBe(false);
    expect(hasCurrentAdultConsent(null)).toBe(false);
  });
});

describe('detectReceiptImageMime', () => {
  it('recognizes supported image signatures and rejects non-images', () => {
    expect(detectReceiptImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectReceiptImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectReceiptImageMime(new TextEncoder().encode('RIFFxxxxWEBP'))).toBe('image/webp');
    expect(detectReceiptImageMime(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
    expect(detectReceiptImageMime(new TextEncoder().encode('<script>'))).toBeNull();
  });
});

describe('canApprovePayment', () => {
  it('requires all independent payment checks before approval', () => {
    expect(canApprovePayment({ amountVerified: true, recipientVerified: true, transferSettled: true })).toBe(true);
    expect(canApprovePayment({ amountVerified: true, recipientVerified: true, transferSettled: false })).toBe(false);
    expect(canApprovePayment(undefined)).toBe(false);
  });
});
