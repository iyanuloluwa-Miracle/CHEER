import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ enum: SocialPlatform, example: SocialPlatform.GITHUB })
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @ApiProperty({ example: 'https://github.com/dina' })
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ example: 'GitHub', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateCreatorDto {
  @ApiProperty({
    example: 'dina',
    description: 'Unique public username (lowercase a-z, 0-9, _)',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
  })
  @Transform(toLowerTrim)
  @IsString()
  @Matches(new RegExp(USERNAME_PATTERN))
  username!: string;

  @ApiProperty({
    example: 'Dina Okonkwo',
    minLength: DISPLAY_NAME_MIN,
    maxLength: DISPLAY_NAME_MAX,
  })
  @IsString()
  @MinLength(DISPLAY_NAME_MIN)
  @MaxLength(DISPLAY_NAME_MAX)
  displayName!: string;

  @ApiPropertyOptional({
    example: 'Building tools for African creators.',
    maxLength: BIO_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'Thanks for supporting my work.',
    maxLength: SUPPORT_MESSAGE_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(SUPPORT_MESSAGE_MAX)
  supportMessage?: string;

  @ApiPropertyOptional({
    enum: ALLOWED_CURRENCIES,
    example: 'NGN',
    default: 'NGN',
  })
  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  currency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['1000.00', '2500.00', '5000.00'],
    maxItems: MAX_SUGGESTED_TIPS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUGGESTED_TIPS)
  @IsString({ each: true })
  @Matches(DECIMAL_AMOUNT, { each: true })
  suggestedTipAmounts?: string[];

  @ApiPropertyOptional({
    type: [SocialLinkInputDto],
    maxItems: MAX_SOCIAL_LINKS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SOCIAL_LINKS)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  socialLinks?: SocialLinkInputDto[];
}

export class UpdateCreatorProfileDto {
  @ApiPropertyOptional({ example: 'dina' })
  @IsOptional()
  @Transform(toLowerTrim)
  @IsString()
  @Matches(new RegExp(USERNAME_PATTERN))
  username?: string;

  @ApiPropertyOptional({ example: 'Dina Okonkwo' })
  @IsOptional()
  @IsString()
  @MinLength(DISPLAY_NAME_MIN)
  @MaxLength(DISPLAY_NAME_MAX)
  displayName?: string;

  @ApiPropertyOptional({ nullable: true, example: 'Updated bio' })
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX)
  bio?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.com/a.jpg',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  avatarUrl?: string | null;
}

export class UpdateCreatorSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'Thanks for supporting my work.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SUPPORT_MESSAGE_MAX)
  supportMessage?: string | null;

  @ApiPropertyOptional({ enum: ALLOWED_CURRENCIES, example: 'NGN' })
  @IsOptional()
  @Matches(CURRENCY_PATTERN)
  currency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['1000.00', '2500.00', '5000.00'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_SUGGESTED_TIPS)
  @IsString({ each: true })
  @Matches(DECIMAL_AMOUNT, { each: true })
  suggestedTipAmounts?: string[];
}

export class ReplaceSocialLinksDto {
  @ApiProperty({ type: [SocialLinkInputDto] })
  @IsArray()
  @ArrayMaxSize(MAX_SOCIAL_LINKS)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  links!: SocialLinkInputDto[];
}
