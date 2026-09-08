import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, TipStatus } from '@prisma/client';

export class CreatorTipResponseDto {
  @ApiProperty({ example: 'cltip...' })
  id!: string;

  @ApiProperty({ example: '2500.00' })
  amount!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Love your work!' })
  message!: string | null;

  @ApiProperty({ example: false })
  isAnonymous!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Ada',
    description: 'Null when isAnonymous is true',
  })
  supporterName!: string | null;

  @ApiProperty({ enum: TipStatus })
  status!: TipStatus;

  @ApiPropertyOptional({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ example: '2026-09-07T12:00:00.000Z' })
  createdAt!: string;
}

export class DashboardTotalsResponseDto {
  @ApiProperty({
    example: '7500.00',
    description: 'Sum of successful (PAID) tip amounts',
  })
  successfulSupport!: string;

  @ApiProperty({ example: 3 })
  successfulTipCount!: number;

  @ApiProperty({
    example: '5000.00',
    description: 'Successful support in the current UTC calendar month',
  })
  periodSupport!: string;

  @ApiProperty({ example: 2 })
  periodTipCount!: number;

  @ApiProperty({ example: '2026-09' })
  periodKey!: string;

  @ApiProperty({ example: 'September 2026' })
  periodLabel!: string;
}

export class CreatorSettlementStatusResponseDto {
  @ApiProperty({ enum: ['NOT_CONFIGURED', 'CONNECTED'] })
  readiness!: 'NOT_CONFIGURED' | 'CONNECTED';

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description: 'Bachs Connect acct_ id when linked',
  })
  bachsConnectAccountId!: string | null;

  @ApiProperty({
    example: false,
    description: 'Always false until Connect settlement is live',
  })
  tippyHoldsWithdrawableBalance!: false;

  @ApiProperty({
    example: false,
    description: 'TippyMe-initiated payout is not available in MVP',
  })
  tippyInitiatedPayoutAvailable!: false;

  @ApiProperty({
    example: 'FUTURE_CAPABILITY',
    description: 'Automatic scheduled payout — future capability',
  })
  automatedFridayPayout!: 'FUTURE_CAPABILITY';

  @ApiProperty({
    example:
      'Payout setup is not available yet. Successful tips are recorded in TippyMe; creator settlement via Bachs Connect is a future capability.',
  })
  message!: string;
}

export class CreatorDashboardResponseDto {
  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: 'dina' })
  username!: string;

  @ApiProperty({ example: 'Dina Okonkwo' })
  displayName!: string;

  @ApiProperty({ example: '/dina' })
  publicPath!: string;

  @ApiProperty({ example: 'http://localhost:3000/dina' })
  publicUrl!: string;

  @ApiProperty({ type: DashboardTotalsResponseDto })
  totals!: DashboardTotalsResponseDto;

  @ApiProperty({ type: [CreatorTipResponseDto] })
  recentTips!: CreatorTipResponseDto[];

  @ApiProperty({
    type: [CreatorTipResponseDto],
    description: 'Recent PAID tips that include a supporter message',
  })
  recentMessages!: CreatorTipResponseDto[];

  @ApiProperty({
    type: CreatorSettlementStatusResponseDto,
    description:
      'Bachs Connect / payout readiness. TippyMe never exposes a fake wallet.',
  })
  settlement!: CreatorSettlementStatusResponseDto;
}

export class CreatorDashboardEnvelopeDto {
  @ApiProperty({ type: CreatorDashboardResponseDto })
  dashboard!: CreatorDashboardResponseDto;
}

export class CreatorTipsPageResponseDto {
  @ApiProperty({ type: [CreatorTipResponseDto] })
  tips!: CreatorTipResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
