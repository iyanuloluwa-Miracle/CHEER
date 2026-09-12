export type ServerEnv = {
  NODE_ENV: string;
  APP_URL: string;
  API_URL: string;
  AUTH_SECRET: string;
  OTP_HASH_PEPPER: string;
  DATABASE_URL: string;
  BACHS_API_KEY?: string;
  BACHS_API_BASE_URL?: string;
  BACHS_WEBHOOK_SECRET?: string;
  BACHS_PLATFORM_FEE_PERCENT?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  BYTESHIP_API_KEY?: string;
  CENCORI_API_KEY?: string;
  CENCORI_API_BASE_URL?: string;
  CENCORI_MODEL?: string;
  LOG_FORMAT?: string;
  ERROR_MONITORING_DSN?: string;
};

const WEAK_SECRET_VALUES = new Set([
  'dev-only-change-me',
  'change-me-to-a-long-random-string',
  'change-me',
  'secret',
  'password',
]);

const MIN_SECRET_LENGTH = 32;

function isProduction(nodeEnv: string): boolean {
  return nodeEnv === 'production';
}

function isWeakSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < MIN_SECRET_LENGTH) return true;
  return WEAK_SECRET_VALUES.has(trimmed);
}

function requireStrongSecret(name: string, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Environment validation failed: ${name} is required in production.`,
    );
  }
  const trimmed = value.trim();
  if (isWeakSecret(trimmed)) {
    throw new Error(
      `Environment validation failed: ${name} must be a strong secret ` +
        `(≥${MIN_SECRET_LENGTH} chars, not a documented placeholder).`,
    );
  }
  return trimmed;
}

function requireNonEmpty(name: string, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Environment validation failed: ${name} is required in production.`,
    );
  }
  return value.trim();
}

let cached: ServerEnv | null = null;

function readConfig(): Record<string, unknown> {
  try {
    // Available when running inside Nuxt/Nitro.
    return useRuntimeConfig() as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Validated server env from Nuxt runtimeConfig + process.env.
 * Dev defaults for weak secrets / local DB; production refuses placeholders.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const config = readConfig();
  const publicConfig =
    (config.public as Record<string, unknown> | undefined) ?? {};
  const nodeEnv =
    (config.nodeEnv as string) || process.env.NODE_ENV || 'development';
  const production = isProduction(nodeEnv);

  let databaseUrl =
    (config.databaseUrl as string) || process.env.DATABASE_URL || '';
  let authSecret =
    (config.authSecret as string) || process.env.AUTH_SECRET || '';
  let otpHashPepper =
    (config.otpHashPepper as string) || process.env.OTP_HASH_PEPPER || '';
  // Prefer process.env over baked runtimeConfig. Docker builds often embed
  // `http://localhost:3000` into config.apiUrl; Nuxt only overrides that key
  // via NUXT_API_URL, so a plain API_URL at runtime was ignored.
  let appUrl =
    process.env.APP_URL ||
    process.env.NUXT_PUBLIC_APP_URL ||
    (publicConfig.appUrl as string) ||
    '';
  let apiUrl =
    process.env.API_URL ||
    process.env.NUXT_API_URL ||
    (config.apiUrl as string) ||
    '';

  if (!production) {
    if (!databaseUrl) {
      databaseUrl =
        'postgresql://cheer:cheer@localhost:5432/cheer?schema=public';
    }
    if (!authSecret) authSecret = 'dev-only-change-me';
    if (!otpHashPepper) otpHashPepper = 'dev-only-change-me';
    if (!appUrl) appUrl = 'http://localhost:3000';
    if (!apiUrl) apiUrl = appUrl;
  }

  if (production) {
    authSecret = requireStrongSecret('AUTH_SECRET', authSecret);
    otpHashPepper = requireStrongSecret('OTP_HASH_PEPPER', otpHashPepper);
    if (authSecret === otpHashPepper) {
      throw new Error(
        'Environment validation failed: AUTH_SECRET and OTP_HASH_PEPPER must be distinct.',
      );
    }
    databaseUrl = requireNonEmpty('DATABASE_URL', databaseUrl);
    requireNonEmpty(
      'BACHS_API_KEY',
      (config.bachsApiKey as string) || process.env.BACHS_API_KEY,
    );
    requireNonEmpty(
      'BACHS_WEBHOOK_SECRET',
      (config.bachsWebhookSecret as string) || process.env.BACHS_WEBHOOK_SECRET,
    );
    requireNonEmpty(
      'RESEND_API_KEY',
      (config.resendApiKey as string) || process.env.RESEND_API_KEY,
    );
    appUrl = requireNonEmpty('APP_URL', appUrl);
    if (!appUrl.startsWith('https://')) {
      throw new Error(
        'Environment validation failed: APP_URL must use https:// in production.',
      );
    }
    // Drop build-time http://localhost defaults so we fall back to APP_URL.
    if (apiUrl && !apiUrl.startsWith('https://')) {
      apiUrl = '';
    }
    apiUrl = requireNonEmpty('API_URL', apiUrl || appUrl);
    if (!apiUrl.startsWith('https://')) {
      throw new Error(
        'Environment validation failed: API_URL must use https:// in production (Bachs webhooks).',
      );
    }
  }

  cached = {
    NODE_ENV: nodeEnv,
    APP_URL: appUrl || 'http://localhost:3000',
    API_URL: apiUrl || appUrl || 'http://localhost:3000',
    AUTH_SECRET: authSecret,
    OTP_HASH_PEPPER: otpHashPepper,
    DATABASE_URL: databaseUrl,
    BACHS_API_KEY:
      ((config.bachsApiKey as string) || process.env.BACHS_API_KEY)?.trim() ||
      undefined,
    BACHS_API_BASE_URL:
      ((config.bachsApiBaseUrl as string) || process.env.BACHS_API_BASE_URL)
        ?.trim() || undefined,
    BACHS_WEBHOOK_SECRET:
      (
        (config.bachsWebhookSecret as string) ||
        process.env.BACHS_WEBHOOK_SECRET
      )?.trim() || undefined,
    BACHS_PLATFORM_FEE_PERCENT:
      (
        (config.bachsPlatformFeePercent as string) ||
        process.env.BACHS_PLATFORM_FEE_PERCENT
      )?.trim() || '5',
    RESEND_API_KEY:
      ((config.resendApiKey as string) || process.env.RESEND_API_KEY)?.trim() ||
      undefined,
    RESEND_FROM_EMAIL:
      (
        (config.resendFromEmail as string) || process.env.RESEND_FROM_EMAIL
      )?.trim() || 'TippyMe <noreply@example.com>',
    BYTESHIP_API_KEY:
      (
        (config.byteshipApiKey as string) || process.env.BYTESHIP_API_KEY
      )?.trim() || undefined,
    CENCORI_API_KEY:
      (
        (config.cencoriApiKey as string) || process.env.CENCORI_API_KEY
      )?.trim() || undefined,
    CENCORI_API_BASE_URL:
      (
        (config.cencoriApiBaseUrl as string) || process.env.CENCORI_API_BASE_URL
      )?.trim() || undefined,
    CENCORI_MODEL:
      ((config.cencoriModel as string) || process.env.CENCORI_MODEL)?.trim() ||
      undefined,
    LOG_FORMAT:
      ((config.logFormat as string) || process.env.LOG_FORMAT)?.trim() ||
      undefined,
    ERROR_MONITORING_DSN:
      (
        (config.errorMonitoringDsn as string) ||
        process.env.ERROR_MONITORING_DSN
      )?.trim() || undefined,
  };

  return cached;
}
