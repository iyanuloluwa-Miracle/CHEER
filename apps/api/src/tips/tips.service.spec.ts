import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { BachsProviderError } from '../payments/bachs/bachs.errors';
import { PaymentsService } from '../payments/payments.service';
import { TipsService } from './tips.service';

describe('TipsService', () => {
  let service: TipsService;
  let prisma: {
    creatorProfile: { findUnique: jest.Mock };
    paymentTransaction: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    tip: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let payments: { initializePayment: jest.Mock; providerName: string };

  const creator = {
    id: 'creator_1',
    username: 'dina',
    displayName: 'Dina',
    avatarUrl: null,
    currency: 'NGN',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      creatorProfile: { findUnique: jest.fn() },
      paymentTransaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tip: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    payments = {
      providerName: 'DEV_STUB',
      initializePayment: jest.fn().mockResolvedValue({
        checkoutUrl: 'http://localhost:3000/support/checkout/tip_1',
        providerReference: 'stub_chk_tip_1',
        rawStatus: 'stub_initialized',
        metadata: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: payments },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'APP_URL' ? 'http://localhost:3000' : undefined,
          },
        },
      ],
    }).compile();

    service = module.get(TipsService);
  });

  function mockCreateTx(tipId = 'tip_1', paymentId = 'pay_1') {
    prisma.paymentTransaction.findUnique.mockResolvedValue(null);
    prisma.$transaction
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.create.mockResolvedValue({
            id: paymentId,
            internalReference: 'idem_testkey01',
            provider: PaymentProvider.DEV_SEED,
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            status: PaymentStatus.PENDING,
          });
          prisma.tip.create.mockResolvedValue({
            id: tipId,
            creatorId: creator.id,
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            message: null,
            isAnonymous: false,
            supporterName: 'Ada',
            status: TipStatus.CREATED,
            paymentTransactionId: paymentId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      )
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.update.mockResolvedValue({
            id: paymentId,
            status: PaymentStatus.PROCESSING,
          });
          prisma.tip.update.mockResolvedValue({
            id: tipId,
            creatorId: creator.id,
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            message: 'Thanks',
            isAnonymous: false,
            supporterName: 'Ada',
            status: TipStatus.CHECKOUT_PENDING,
            paymentTransactionId: paymentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              username: 'dina',
              displayName: 'Dina',
              avatarUrl: null,
            },
          });
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      );
  }

  it('creates tip for valid creator with CHECKOUT_PENDING', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    mockCreateTx();

    const result = await service.createTip({
      username: 'dina',
      amount: '2500.00',
      supporterEmail: 'supporter@example.com',
      message: 'Thanks',
      isAnonymous: false,
      supporterName: 'Ada',
      idempotencyKey: 'testkey01',
    });

    expect(result.tip.status).toBe(TipStatus.CHECKOUT_PENDING);
    expect(result.tip.amount).toBe('2500.00');
    expect(result.tip.currency).toBe('NGN');
    expect(result.tip.isAnonymous).toBe(false);
    expect(result.tip.supporterName).toBe('Ada');
    expect(result.checkoutUrl).toContain('/support/checkout/');
    expect(payments.initializePayment).toHaveBeenCalled();
  });

  it('rejects nonexistent creator', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.createTip({
        username: 'nobody',
        amount: '1000.00',
        supporterEmail: 'supporter@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects inactive creator', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue({
      ...creator,
      isActive: false,
    });
    await expect(
      service.createTip({
        username: 'dina',
        amount: '1000.00',
        supporterEmail: 'supporter@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid amount', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    await expect(
      service.createTip({
        username: 'dina',
        amount: '0',
        supporterEmail: 'supporter@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects below minimum amount', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    try {
      await service.createTip({
        username: 'dina',
        amount: '50.00',
        supporterEmail: 'supporter@example.com',
      });
      fail('expected BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        error: string;
      };
      expect(body.error).toBe('BELOW_MINIMUM');
    }
  });

  it('rejects above maximum amount', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    try {
      await service.createTip({
        username: 'dina',
        amount: '1000001.00',
        supporterEmail: 'supporter@example.com',
      });
      fail('expected BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        error: string;
      };
      expect(body.error).toBe('ABOVE_MAXIMUM');
    }
  });

  it('rejects currency mismatch (manipulation)', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    try {
      await service.createTip({
        username: 'dina',
        amount: '1000.00',
        currency: 'USD',
        supporterEmail: 'supporter@example.com',
      });
      fail('expected BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        error: string;
      };
      expect(body.error).toBe('CURRENCY_MISMATCH');
    }
  });

  it('creates anonymous tip without exposing name', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    prisma.paymentTransaction.findUnique.mockResolvedValue(null);
    prisma.$transaction
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.create.mockResolvedValue({ id: 'pay_a' });
          prisma.tip.create.mockResolvedValue({
            id: 'tip_a',
            status: TipStatus.CREATED,
          });
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      )
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.update.mockResolvedValue({ id: 'pay_a' });
          prisma.tip.update.mockResolvedValue({
            id: 'tip_a',
            creatorId: creator.id,
            amount: new Prisma.Decimal('1000.00'),
            currency: 'NGN',
            message: null,
            isAnonymous: true,
            supporterName: 'ShouldHide',
            status: TipStatus.CHECKOUT_PENDING,
            paymentTransactionId: 'pay_a',
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              username: 'dina',
              displayName: 'Dina',
              avatarUrl: null,
            },
          });
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      );

    const result = await service.createTip({
      username: 'dina',
      amount: '1000.00',
      supporterEmail: 'supporter@example.com',
      isAnonymous: true,
      supporterName: 'ShouldHide',
      idempotencyKey: 'anonkey01',
    });

    expect(result.tip.isAnonymous).toBe(true);
    expect(result.tip.supporterName).toBeNull();
  });

  it('sanitizes malicious messages', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    prisma.paymentTransaction.findUnique.mockResolvedValue(null);

    let capturedMessage: string | null | undefined;
    prisma.$transaction
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.create.mockResolvedValue({ id: 'pay_m' });
          prisma.tip.create.mockImplementation(
            (args: { data: { message: string | null } }) => {
              capturedMessage = args.data.message;
              return Promise.resolve({
                id: 'tip_m',
                status: TipStatus.CREATED,
              });
            },
          );
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      )
      .mockImplementationOnce(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          prisma.paymentTransaction.update.mockResolvedValue({ id: 'pay_m' });
          prisma.tip.update.mockResolvedValue({
            id: 'tip_m',
            creatorId: creator.id,
            amount: new Prisma.Decimal('1000.00'),
            currency: 'NGN',
            message: capturedMessage ?? null,
            isAnonymous: false,
            supporterName: null,
            status: TipStatus.CHECKOUT_PENDING,
            paymentTransactionId: 'pay_m',
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              username: 'dina',
              displayName: 'Dina',
              avatarUrl: null,
            },
          });
          prisma.auditLog.create.mockResolvedValue({});
          return fn(prisma);
        },
      );

    await service.createTip({
      username: 'dina',
      amount: '1000.00',
      supporterEmail: 'supporter@example.com',
      message: '<script>alert("xss")</script>Hi',
      idempotencyKey: 'msgkey001',
    });

    expect(capturedMessage).toBe('alert("xss")Hi');
  });

  it('replays duplicate idempotent submissions', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    prisma.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pay_1',
      metadata: {
        checkoutUrl: 'http://localhost:3000/support/checkout/tip_1',
      },
      tip: {
        id: 'tip_1',
        creatorId: creator.id,
        amount: new Prisma.Decimal('2500.00'),
        currency: 'NGN',
        message: null,
        isAnonymous: false,
        supporterName: null,
        status: TipStatus.CHECKOUT_PENDING,
        paymentTransactionId: 'pay_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          username: 'dina',
          displayName: 'Dina',
          avatarUrl: null,
        },
      },
    });

    const result = await service.createTip({
      username: 'dina',
      amount: '2500.00',
      supporterEmail: 'supporter@example.com',
      idempotencyKey: 'dupkey001',
    });

    expect(result.tip.id).toBe('tip_1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(payments.initializePayment).not.toHaveBeenCalled();
  });

  it('marks tip failed when payment init fails', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(creator);
    prisma.paymentTransaction.findUnique.mockResolvedValue(null);
    payments.initializePayment.mockRejectedValue(
      new BachsProviderError('TIMEOUT', 'Bachs request timed out'),
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.paymentTransaction.create.mockResolvedValue({ id: 'pay_1' });
        prisma.tip.create.mockResolvedValue({
          id: 'tip_1',
          status: TipStatus.CREATED,
        });
        prisma.paymentTransaction.update.mockResolvedValue({ id: 'pay_1' });
        prisma.tip.update.mockResolvedValue({
          id: 'tip_1',
          status: TipStatus.FAILED,
        });
        prisma.auditLog.create.mockResolvedValue({});
        return fn(prisma);
      },
    );

    await expect(
      service.createTip({
        username: 'dina',
        amount: '2500.00',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'failkey01',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('getPublicTip returns tip', async () => {
    prisma.tip.findUnique.mockResolvedValue({
      id: 'tip_1',
      creatorId: creator.id,
      amount: new Prisma.Decimal('1000.00'),
      currency: 'NGN',
      message: 'Hi',
      isAnonymous: false,
      supporterName: 'Ada',
      status: TipStatus.CHECKOUT_PENDING,
      paymentTransactionId: 'pay_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: {
        username: 'dina',
        displayName: 'Dina',
        avatarUrl: null,
      },
    });

    const tip = await service.getPublicTip('tip_1');
    expect(tip.id).toBe('tip_1');
    expect(tip.message).toBe('Hi');
  });

  it('getPublicTip 404s for missing tip', async () => {
    prisma.tip.findUnique.mockResolvedValue(null);
    await expect(service.getPublicTip('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
