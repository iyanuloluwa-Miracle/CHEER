import { SocialPlatform } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ALLOWED_CURRENCIES,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  MAX_SOCIAL_LINKS,
  MAX_SUGGESTED_TIPS,
  SUPPORT_MESSAGE_MAX,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../username';

const USERNAME_PATTERN = `^[a-z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`;
const DECIMAL_AMOUNT = /^\d+(\.\d{1,2})?$/;
const CURRENCY_PATTERN = new RegExp(`^(${ALLOWED_CURRENCIES.join('|')})$`);

function toLowerTrim({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class SocialLinkInputDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsUrl({ require_tld: false })
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateCreatorDto {
  @Transform(toLowerTrim)
  @IsString()
  @Matches(new RegExp(USERNAME_PATTERN))
  username!: string;

  @IsString()
  @MinLength(DISPLAY_NAME_MIN)
  @MaxLength(DISPLAY_NAME_MAX)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SUPPORT_MESSAGE_MAX)
  supportMessage?: string;

  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUGGESTED_TIPS)
  @IsString({ each: true })
  @Matches(DECIMAL_AMOUNT, { each: true })
  suggestedTipAmounts?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SOCIAL_LINKS)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  socialLinks?: SocialLinkInputDto[];
}

export class UpdateCreatorProfileDto {
  @IsOptional()
  @Transform(toLowerTrim)
  @IsString()
  @Matches(new RegExp(USERNAME_PATTERN))
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(DISPLAY_NAME_MIN)
  @MaxLength(DISPLAY_NAME_MAX)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX)
  bio?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  avatarUrl?: string | null;
}

export class UpdateCreatorSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(SUPPORT_MESSAGE_MAX)
  supportMessage?: string | null;

  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_SUGGESTED_TIPS)
  @IsString({ each: true })
  @Matches(DECIMAL_AMOUNT, { each: true })
  suggestedTipAmounts?: string[];
}

export class ReplaceSocialLinksDto {
  @IsArray()
  @ArrayMaxSize(MAX_SOCIAL_LINKS)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  links!: SocialLinkInputDto[];
}
