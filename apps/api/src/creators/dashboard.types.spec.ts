import { utcMonthBounds, toCreatorTipDto } from './dashboard.types';
import { TipStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('dashboard.types', () => {
  it('computes UTC month bounds', () => {
    const { start, end, periodKey } = utcMonthBounds(
      new Date('2026-09-15T12:00:00.000Z'),
    );
    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(periodKey).toBe('2026-09');
  });

  it('nulls supporterName when anonymous', () => {
    const dto = toCreatorTipDto({
      id: 't1',
      creatorId: 'c1',
      amount: new Prisma.Decimal('10.00'),
      currency: 'NGN',
      message: 'hi',
      isAnonymous: true,
      supporterName: 'Secret',
      supporterEmail: 'a@b.com',
      status: TipStatus.PAID,
      paymentTransactionId: 'p1',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      paymentTransaction: { status: 'SUCCEEDED' as const },
    });
    expect(dto.supporterName).toBeNull();
    expect(dto.paymentStatus).toBe('SUCCEEDED');
  });
});
