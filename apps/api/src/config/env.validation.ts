import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Placeholders that must never be used outside local/dev. */
const WEAK_SECRET_VALUES = new Set([
  'dev-only-change-me',
  'change-me-to-a-long-random-string',
  'change-me',
  'secret',
  'password',
]);

const MIN_SECRET_LENGTH = 32;

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT!: number;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  API_URL = 'http://localhost:3001';

  /** JWT signing secret — required for authenticated sessions */
  @IsString()
  @IsNotEmpty()
  AUTH_SECRET!: string;

  /** Pepper for HMAC OTP hashes — never reuse as AUTH_SECRET */
  @IsString()
  @IsNotEmpty()
  OTP_HASH_PEPPER!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  BACHS_API_KEY?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  BACHS_API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  BACHS_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  SENDBYTE_API_KEY?: string;

  @IsString()
  @IsOptional()
  SENDBYTE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  SENDBYTE_FROM_EMAIL?: string;
}

function resolvePort(raw: unknown): number {
  const portNum = Number(raw);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return 3001;
  }
  return portNum;
}

function isProduction(nodeEnv: unknown): boolean {
  return nodeEnv === NodeEnv.Production || nodeEnv === 'production';
}

function isWeakSecret(value: unknown): boolean {
  if (typeof value !== 'string') return true;
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

export function validateEnv(config: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...config };
  const nodeEnv = normalized.NODE_ENV ?? NodeEnv.Development;
  const production = isProduction(nodeEnv);

  if (!normalized.NODE_ENV) {
    normalized.NODE_ENV = NodeEnv.Development;
  }

  // Dev/test convenience defaults — never applied in production.
  if (!production) {
    if (!normalized.DATABASE_URL) {
      normalized.DATABASE_URL =
        'postgresql://cheer:cheer@localhost:5432/cheer?schema=public';
    }

    if (!normalized.AUTH_SECRET) {
      normalized.AUTH_SECRET = 'dev-only-change-me';
    }

    if (!normalized.OTP_HASH_PEPPER) {
      normalized.OTP_HASH_PEPPER = 'dev-only-change-me';
    }
  }

  normalized.PORT = resolvePort(normalized.PORT);

  if (!normalized.API_PREFIX) {
    normalized.API_PREFIX = 'api';
  }

  if (!normalized.APP_URL) {
    normalized.APP_URL = 'http://localhost:3000';
  }

  if (!normalized.API_URL) {
    normalized.API_URL = 'http://localhost:3001';
  }

  if (production) {
    normalized.AUTH_SECRET = requireStrongSecret(
      'AUTH_SECRET',
      normalized.AUTH_SECRET,
    );
    normalized.OTP_HASH_PEPPER = requireStrongSecret(
      'OTP_HASH_PEPPER',
      normalized.OTP_HASH_PEPPER,
    );

    if (normalized.AUTH_SECRET === normalized.OTP_HASH_PEPPER) {
      throw new Error(
        'Environment validation failed: AUTH_SECRET and OTP_HASH_PEPPER must be distinct.',
      );
    }

    normalized.DATABASE_URL = requireNonEmpty(
      'DATABASE_URL',
      normalized.DATABASE_URL,
    );
    normalized.BACHS_API_KEY = requireNonEmpty(
      'BACHS_API_KEY',
      normalized.BACHS_API_KEY,
    );
    normalized.BACHS_WEBHOOK_SECRET = requireNonEmpty(
      'BACHS_WEBHOOK_SECRET',
      normalized.BACHS_WEBHOOK_SECRET,
    );
    normalized.SENDBYTE_API_KEY = requireNonEmpty(
      'SENDBYTE_API_KEY',
      normalized.SENDBYTE_API_KEY,
    );

    const appUrl =
      typeof normalized.APP_URL === 'string' ? normalized.APP_URL : '';
    if (!appUrl.startsWith('https://')) {
      throw new Error(
        'Environment validation failed: APP_URL must use https:// in production.',
      );
    }
  }

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  // Ensure PORT is a number after conversion (env vars are strings).
  validated.PORT = resolvePort(validated.PORT);

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
