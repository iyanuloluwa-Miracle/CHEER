import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALLOWED_CURRENCIES } from '../../creators/username';
import {
  TIP_AMOUNT_PATTERN,
  TIP_IDEMPOTENCY_KEY_MAX,
  TIP_MESSAGE_MAX_LENGTH,
  TIP_SUPPORTER_NAME_MAX_LENGTH,
} from '../tips.constants';

const CURRENCY_PATTERN = new RegExp(`^(${ALLOWED_CURRENCIES.join('|')})$`, 'i');

function toLowerTrim({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function toUpperTrim({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

/**
 * Public tip create body.
 * Creator is resolved by username — never trust a client-supplied creatorId.
 * Currency is validated against the creator; server amount/currency are authoritative.
 * supporterEmail is required for Bachs NewCustomerRequest.
 */
export class CreateTipDto {
  @ApiProperty({
    example: 'dina',
    description: 'Public creator username (not creatorId)',
  })
  @Transform(toLowerTrim)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/)
  username!: string;

  @ApiProperty({
    example: '2500.00',
    description: 'Decimal string amount (server re-validates min/max)',
  })
  @IsString()
  @Matches(TIP_AMOUNT_PATTERN)
  amount!: string;

  @ApiPropertyOptional({
    example: 'NGN',
    description:
      'Optional; must match creator currency when provided. Server uses creator currency.',
    enum: ALLOWED_CURRENCIES,
  })
  @IsOptional()
  @Transform(toUpperTrim)
  @Matches(CURRENCY_PATTERN)
  currency?: string;

  @ApiPropertyOptional({
    example: 'Love your work!',
    maxLength: TIP_MESSAGE_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TIP_MESSAGE_MAX_LENGTH)
  message?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    example: 'Ada',
    description: 'Shown only when isAnonymous is false',
    maxLength: TIP_SUPPORTER_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TIP_SUPPORTER_NAME_MAX_LENGTH)
  supporterName?: string;

  @ApiProperty({
    example: 'supporter@example.com',
    description:
      'Required for Bachs checkout customer (never shown publicly when anonymous)',
  })
  @Transform(toLowerTrim)
  @IsEmail()
  @MaxLength(254)
  supporterEmail!: string;

  @ApiPropertyOptional({
    example: 'client-req-abc123',
    description: 'Client idempotency key to prevent duplicate tips on retry',
    maxLength: TIP_IDEMPOTENCY_KEY_MAX,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(TIP_IDEMPOTENCY_KEY_MAX)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  idempotencyKey?: string;
}
