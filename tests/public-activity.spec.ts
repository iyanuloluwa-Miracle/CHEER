import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  toPublicSupporterNoteDto,
  utcWeekBounds,
} from '../server/services/creators/dashboard.types';
import { buildSettlementStatus } from '../server/services/creators/settlement.types';

describe('utcWeekBounds', () => {
  it('returns a Monday–next-Monday UTC window containing the given instant', () => {
    // Wednesday 2026-09-09 UTC
    const now = new Date(Date.UTC(2026, 8, 9, 15, 30, 0));
    const { start, end, weekKey, weekStart, weekEnd } = utcWeekBounds(now);

    expect(start.toISOString()).toBe('2026-09-07T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2026-09-14T00:00:00.000Z');
    expect(weekStart).toBe(start.toISOString());
    expect(weekEnd).toBe(end.toISOString());
    expect(weekKey).toMatch(/^2026-W\d{2}$/);
    expect(now.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(now.getTime()).toBeLessThan(end.getTime());
  });

  it('treats Sunday as the end of the week that started the prior Monday', () => {
    const sunday = new Date(Date.UTC(2026, 8, 13, 12, 0, 0));
    const { start, end } = utcWeekBounds(sunday);
    expect(start.toISOString()).toBe('2026-09-07T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-14T00:00:00.000Z');
  });
});

describe('toPublicSupporterNoteDto', () => {
  const baseTip = {
    id: 'tip_1',
    creatorId: 'creator_1',
    amount: new Prisma.Decimal('5000.00'),
    currency: 'NGN',
    message: '  Thanks!  ',
    isAnonymous: false,
    supporterName: 'Tobi',
    supporterEmail: 'secret@example.com',
    status: 'PAID' as const,
    createdAt: new Date('2026-09-09T10:00:00.000Z'),
    updatedAt: new Date('2026-09-09T10:00:00.000Z'),
    idempotencyKey: null,
    expiresAt: null,
  };

  it('maps a paid tip with a message and never includes email', () => {
    const note = toPublicSupporterNoteDto(baseTip as never);
    expect(note).toEqual({
      amount: '5000.00',
      currency: 'NGN',
      message: 'Thanks!',
      displayName: 'Tobi',
      isAnonymous: false,
      createdAt: '2026-09-09T10:00:00.000Z',
    });
    expect(JSON.stringify(note)).not.toContain('secret@example.com');
  });

  it('nulls displayName for anonymous tips', () => {
    const note = toPublicSupporterNoteDto({
      ...baseTip,
      isAnonymous: true,
      supporterName: 'Hidden',
    } as never);
    expect(note?.displayName).toBeNull();
    expect(note?.isAnonymous).toBe(true);
  });

  it('returns null when message is empty', () => {
    expect(
      toPublicSupporterNoteDto({ ...baseTip, message: '   ' } as never),
    ).toBeNull();
    expect(
      toPublicSupporterNoteDto({ ...baseTip, message: null } as never),
    ).toBeNull();
  });
});

describe('buildSettlementStatus', () => {
  it('keeps Friday payout as FUTURE_CAPABILITY without a Tippy wallet', () => {
    const status = buildSettlementStatus(null);
    expect(status.readiness).toBe('NOT_CONFIGURED');
    expect(status.tippyHoldsWithdrawableBalance).toBe(false);
    expect(status.tippyInitiatedPayoutAvailable).toBe(false);
    expect(status.automatedFridayPayout).toBe('FUTURE_CAPABILITY');
    expect(status.message.toLowerCase()).toContain('bachs');
    expect(status.message.toLowerCase()).toContain('friday');
  });

  it('still refuses Tippy wallets when Connect id is present', () => {
    const status = buildSettlementStatus('acct_test');
    expect(status.readiness).toBe('CONNECTED');
    expect(status.bachsConnectAccountId).toBe('acct_test');
    expect(status.tippyHoldsWithdrawableBalance).toBe(false);
    expect(status.automatedFridayPayout).toBe('FUTURE_CAPABILITY');
  });
});
