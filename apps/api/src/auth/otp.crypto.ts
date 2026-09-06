import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { OTP_LENGTH } from './otp.constants';

/**
 * Cryptographically secure numeric OTP.
 * Uses rejection sampling via randomInt to avoid modulo bias.
 */
export function generateOtpCode(length = OTP_LENGTH): string {
  if (length < 4 || length > 10) {
    throw new Error('OTP length must be between 4 and 10');
  }
  const max = 10 ** length;
  const value = randomInt(0, max);
  return value.toString().padStart(length, '0');
}

/** HMAC-SHA256 of the OTP with server pepper — never store plaintext. */
export function hashOtp(code: string, pepper: string): string {
  if (!pepper) {
    throw new Error('OTP hash pepper is required');
  }
  return createHmac('sha256', pepper).update(normalizeOtp(code)).digest('hex');
}

export function verifyOtpHash(
  code: string,
  codeHash: string,
  pepper: string,
): boolean {
  const computed = hashOtp(code, pepper);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(codeHash, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeOtp(code: string): string {
  return code.replace(/\s+/g, '').trim();
}
