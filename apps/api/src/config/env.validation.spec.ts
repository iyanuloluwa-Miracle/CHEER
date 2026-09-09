import 'reflect-metadata';
import { validateEnv } from './env.validation';

const strong = (label: string) =>
  `${label}-abcdefghijklmnopqrstuvwxyz0123456789`;

describe('validateEnv', () => {
  it('allows weak defaults outside production', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
    });
    expect(env.AUTH_SECRET).toBe('dev-only-change-me');
    expect(env.OTP_HASH_PEPPER).toBe('dev-only-change-me');
    expect(env.BACHS_API_KEY).toBeUndefined();
  });

  it('rejects missing AUTH_SECRET in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
        APP_URL: 'https://tippy.me',
        BACHS_API_KEY: 'sk_live_test',
        BACHS_WEBHOOK_SECRET: 'whsec_test',
        SENDBYTE_API_KEY: 'sk_live_send',
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it('rejects placeholder AUTH_SECRET in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AUTH_SECRET: 'dev-only-change-me',
        OTP_HASH_PEPPER: strong('pepper'),
        DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
        APP_URL: 'https://tippy.me',
        BACHS_API_KEY: 'sk_live_test',
        BACHS_WEBHOOK_SECRET: 'whsec_test',
        SENDBYTE_API_KEY: 'sk_live_send',
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it('rejects identical AUTH_SECRET and OTP_HASH_PEPPER in production', () => {
    const shared = strong('shared');
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AUTH_SECRET: shared,
        OTP_HASH_PEPPER: shared,
        DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
        APP_URL: 'https://tippy.me',
        BACHS_API_KEY: 'sk_live_test',
        BACHS_WEBHOOK_SECRET: 'whsec_test',
        SENDBYTE_API_KEY: 'sk_live_send',
      }),
    ).toThrow(/distinct/);
  });

  it('rejects missing BACHS_API_KEY in production (no stub payments)', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AUTH_SECRET: strong('auth'),
        OTP_HASH_PEPPER: strong('pepper'),
        DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
        APP_URL: 'https://tippy.me',
        BACHS_WEBHOOK_SECRET: 'whsec_test',
        SENDBYTE_API_KEY: 'sk_live_send',
      }),
    ).toThrow(/BACHS_API_KEY/);
  });

  it('rejects http APP_URL in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        AUTH_SECRET: strong('auth'),
        OTP_HASH_PEPPER: strong('pepper'),
        DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
        APP_URL: 'http://tippy.me',
        BACHS_API_KEY: 'sk_live_test',
        BACHS_WEBHOOK_SECRET: 'whsec_test',
        SENDBYTE_API_KEY: 'sk_live_send',
      }),
    ).toThrow(/APP_URL/);
  });

  it('accepts a complete production configuration', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      AUTH_SECRET: strong('auth'),
      OTP_HASH_PEPPER: strong('pepper'),
      DATABASE_URL: 'postgresql://u:p@db:5432/cheer',
      APP_URL: 'https://tippy.me',
      BACHS_API_KEY: 'sk_live_test',
      BACHS_WEBHOOK_SECRET: 'whsec_test',
      SENDBYTE_API_KEY: 'sk_live_send',
    });
    expect(env.NODE_ENV).toBe('production');
    expect(env.BACHS_API_KEY).toBe('sk_live_test');
  });
});
