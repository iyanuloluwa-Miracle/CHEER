import { createHmac } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { TransactionalNotificationsService } from '../notifications/transactional-notifications.service';
import { BachsProviderError } from '../payments/bachs/bachs.errors';
import { PaymentsService } from '../payments/payments.service';
import { WebhookFulfilmentService } from './webhook-fulfilment.service';

describe('WebhookFulfilmentService', () => {
  let service: WebhookFulfilmentService;
  let prisma: {
    webhookEvent: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    tip: { findUnique: jest.Mock; update: jest.Mock };
    paymentTransaction: { findFirst: jest.Mock; update: jest.Mock };
    auditLog: { create: jest.Mock };
    notification: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let payments: { verifyPayment: jest.Mock };
  let notifications: { notifyTipReceived: jest.Mock };

  const tipBase = {
    id: 'tip_1',
    status: TipStatus.CHECKOUT_PENDING,
    amount: new Prisma.Decimal('2500.00'),
    currency: 'NGN',
    isAnonymous: true,
    supporterName: null,
    paymentTransactionId: 'pay_1',
    paymentTransaction: {
      id: 'pay_1',
      provider: PaymentProvider.BACHS,
      amount: new Prisma.Decimal('2500.00'),
      currency: 'NGN',
      internalReference: 'idem_1',
      providerReference: 'chk_1',
      status: PaymentStatus.PROCESSING,
    },
    creator: {
      user: { id: 'user_1', email: 'dina@example.com' },
    },
  };

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tip: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      paymentTransaction: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(),
    };
    payments = {
      verifyPayment: jest.fn().mockResolvedValue({
        status: 'succeeded',
        providerReference: 'chk_1',
        amount: '2500.00',
        currency: 'NGN',
        rawStatus: 'completed|succeeded',
        metadata: { reference: 'tip_1' },
      }),
    };
    notifications = {
      notifyTipReceived: jest.fn().mockResolvedValue({ status: 'sent' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookFulfilmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: payments },
        {
          provide: TransactionalNotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    service = module.get(WebhookFulfilmentService);
  });

  it('ignores duplicate webhook events', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'we_1',
      processedAt: new Date(),
    });

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_1',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('ignored_duplicate');
    expect(payments.verifyPayment).not.toHaveBeenCalled();
  });

  it('ignores unknown transactions', async () => {
    prisma.tip.findUnique.mockResolvedValue(null);
    prisma.paymentTransaction.findFirst.mockResolvedValue(null);

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_unknown',
      eventType: 'collection.succeeded',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_missing',
      },
    });

    expect(result.outcome).toBe('ignored_unknown');
  });

  it('ignores already-successful (terminal) tips', async () => {
    prisma.tip.findUnique.mockResolvedValue({
      ...tipBase,
      status: TipStatus.PAID,
    });

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_paid',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('ignored_terminal');
    expect(payments.verifyPayment).not.toHaveBeenCalled();
  });

  it('rejects amount mismatch after server verify', async () => {
    prisma.tip.findUnique.mockResolvedValue(tipBase);
    payments.verifyPayment.mockResolvedValue({
      status: 'succeeded',
      providerReference: 'chk_1',
      amount: '999.00',
      currency: 'NGN',
      metadata: { reference: 'tip_1' },
    });

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_amt',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
        amount: '999.00',
      },
    });

    expect(result.outcome).toBe('ignored_mismatch');
  });

  it('rejects currency mismatch after server verify', async () => {
    prisma.tip.findUnique.mockResolvedValue(tipBase);
    payments.verifyPayment.mockResolvedValue({
      status: 'succeeded',
      providerReference: 'chk_1',
      amount: '2500.00',
      currency: 'USD',
      metadata: { reference: 'tip_1' },
    });

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_cur',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('ignored_mismatch');
  });

  it('returns retryable on provider timeout during verify', async () => {
    prisma.tip.findUnique.mockResolvedValue(tipBase);
    payments.verifyPayment.mockRejectedValue(
      new BachsProviderError('TIMEOUT', 'Bachs request timed out'),
    );

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_to',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('verify_failed');
    expect(result.retryable).toBe(true);
  });

  it('updates tip to PAID on valid verified webhook', async () => {
    prisma.tip.findUnique.mockResolvedValue(tipBase);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.tip.findUnique.mockResolvedValueOnce({
          status: TipStatus.CHECKOUT_PENDING,
        });
        return fn(prisma);
      },
    );

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_ok',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('updated');
    expect(notifications.notifyTipReceived).toHaveBeenCalledWith(
      expect.objectContaining({ tipId: 'tip_1' }),
    );
  });

  it('does not notify on duplicate webhook (already processed)', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'we_1',
      processedAt: new Date(),
    });

    const result = await service.processSignedBachsEvent({
      providerEventId: 'evt_dup',
      eventType: 'collection.succeeded',
      tipId: 'tip_1',
      verification: {
        status: 'succeeded',
        providerReference: 'chk_1',
      },
    });

    expect(result.outcome).toBe('ignored_duplicate');
    expect(notifications.notifyTipReceived).not.toHaveBeenCalled();
  });
});

describe('Bachs webhook signature (Phase 8)', () => {
  it('builds a valid signed payload for e2e-style tests', () => {
    const secret = 'whsec_test';
    const rawBody = JSON.stringify({
      id: 'evt_1',
      type: 'collection.succeeded',
      data: { checkout_id: 'chk_1', status: 'succeeded' },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    expect(signature).toHaveLength(64);
  });
});
