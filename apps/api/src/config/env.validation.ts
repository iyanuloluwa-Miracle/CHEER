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

export function validateEnv(config: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...config };

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

  if (!normalized.NODE_ENV) {
    normalized.NODE_ENV = NodeEnv.Development;
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
