import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TIP_AMOUNT_PATTERN } from '../../tips/tips.constants';

function emptyToUndefined({ value }: { value: unknown }) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

/**
 * MVP tip list filters for the authenticated creator.
 * Creator scope always comes from the session — never from query params.
 */
export class ListTipsQueryDto {
  @ApiPropertyOptional({ enum: TipStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(TipStatus)
  status?: TipStatus;

  @ApiPropertyOptional({
    description: 'Inclusive start (ISO-8601 date or datetime)',
    example: '2026-09-01',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end (ISO-8601 date or datetime)',
    example: '2026-09-30',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: '1000.00' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(TIP_AMOUNT_PATTERN)
  minAmount?: string;

  @ApiPropertyOptional({ example: '10000.00' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(TIP_AMOUNT_PATTERN)
  maxAmount?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
