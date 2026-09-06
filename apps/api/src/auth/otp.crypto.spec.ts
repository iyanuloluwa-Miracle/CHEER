import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  normalizeOtp,
  verifyOtpHash,
} from './otp.crypto';

describe('otp.crypto', () => {
  const pepper = 'test-pepper-do-not-use-in-prod';

  it('generates a cryptographically sized numeric OTP', () => {
    const code = generateOtpCode(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('hashes OTP with HMAC and never equals plaintext', () => {
    const code = '123456';
    const digest = hashOtp(code, pepper);
    expect(digest).not.toBe(code);
    expect(digest).toHaveLength(64);
    expect(digest).toBe(hashOtp(code, pepper));
  });

  it('verifies matching OTP hashes', () => {
    const code = '654321';
    const digest = hashOtp(code, pepper);
    expect(verifyOtpHash(code, digest, pepper)).toBe(true);
    expect(verifyOtpHash('000000', digest, pepper)).toBe(false);
  });

  it('normalizes email and OTP input', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(normalizeOtp(' 12 34 56 ')).toBe('123456');
  });

  it('rejects empty pepper', () => {
    expect(() => hashOtp('123456', '')).toThrow(/pepper/i);
  });
});
