import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipStatus } from '@prisma/client';

export class PublicTipCreatorDto {
  @ApiProperty({ example: 'dina' })
  username!: string;

  @ApiProperty({ example: 'Dina Okonkwo' })
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;
}

export class PublicTipDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TipStatus })
  status!: TipStatus;

  @ApiProperty({ example: '2500.00' })
  amount!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiPropertyOptional({ nullable: true })
  message!: string | null;

  @ApiProperty()
  isAnonymous!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null when anonymous',
  })
  supporterName!: string | null;

  @ApiProperty({ type: PublicTipCreatorDto })
  creator!: PublicTipCreatorDto;

  @ApiProperty()
  createdAt!: string;
}

export class CreateTipResponseDto {
  @ApiProperty({ type: PublicTipDto })
  tip!: PublicTipDto;

  @ApiProperty({
    example: 'http://localhost:3000/support/checkout/clx...',
    description: 'Redirect supporter here to complete payment (stub or Bachs)',
  })
  checkoutUrl!: string;
}

export class PublicTipEnvelopeDto {
  @ApiProperty({ type: PublicTipDto })
  tip!: PublicTipDto;
}
