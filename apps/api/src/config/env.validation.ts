import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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
  PORT = 3001;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  API_URL = 'http://localhost:3001';

  @IsString()
  @IsOptional()
  AUTH_SECRET?: string;

  @IsString()
  @IsOptional()
  OTP_HASH_PEPPER?: string;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

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

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

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
