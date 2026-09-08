import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma, TipStatus } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { SendByteService } from './../src/notifications/sendbyte.service';
import { PAYMENT_PROVIDER } from './../src/payments/payment-provider.port';
import { StubPaymentProvider } from './../src/payments/providers/stub-payment.provider';

describe('Tips (e2e)', () => {
  let app: INestApplication<App>;

  const creator = {
    id: 'creator_1',
    username: 'dina',
    displayName: 'Dina',
    avatarUrl: null,
    currency: 'NGN',
    isActive: true,
  };

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    isConnected: jest.fn().mockReturnValue(true),
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
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public&connect_timeout=5';
    process.env.AUTH_SECRET ??= 'dev-only-change-me';
    process.env.OTP_HASH_PEPPER ??= 'dev-only-change-me';
    process.env.APP_URL ??= 'http://localhost:3000';
    // Force stub provider even if developer .env has a sandbox key
    delete process.env.BACHS_API_KEY;
    if (!process.env.PORT || Number.isNaN(Number(process.env.PORT))) {
      process.env.PORT = '3001';
    }

    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(SendByteService)
      .useValue({ sendEmail: jest.fn() })
      .overrideProvider(PAYMENT_PROVIDER)
      .useClass(StubPaymentProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  }, 30_000);

  afterEach(async () => {
    await app.close();
  });

  function mockSuccessfulCreate() {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);
    prismaMock.paymentTransaction.findUnique.mockResolvedValue(null);
    prismaMock.$transaction
      .mockImplementationOnce(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
          prismaMock.paymentTransaction.create.mockResolvedValue({
            id: 'pay_1',
          });
          prismaMock.tip.create.mockResolvedValue({
            id: 'tip_1',
            status: TipStatus.CREATED,
          });
          return fn(prismaMock);
        },
      )
      .mockImplementationOnce(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
          prismaMock.paymentTransaction.update.mockResolvedValue({
            id: 'pay_1',
          });
          prismaMock.tip.update.mockResolvedValue({
            id: 'tip_1',
            creatorId: creator.id,
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            message: 'Love it',
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
          return fn(prismaMock);
        },
      );
  }

  it('POST /api/tips creates tip for valid creator (no auth)', async () => {
    mockSuccessfulCreate();

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '2500.00',
        supporterEmail: 'supporter@example.com',
        message: 'Love it',
        isAnonymous: false,
        supporterName: 'Ada',
        idempotencyKey: 'e2ekey001',
      })
      .expect(201);

    const body = res.body as {
      tip: { status: string; amount: string; currency: string };
      checkoutUrl: string;
    };
    expect(body.tip.status).toBe(TipStatus.CHECKOUT_PENDING);
    expect(body.tip.amount).toBe('2500.00');
    expect(body.tip.currency).toBe('NGN');
    expect(body.checkoutUrl).toContain('/support/checkout/');
  });

  it('POST /api/tips 404 for nonexistent creator', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'ghost',
        amount: '1000.00',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'e2ekey002',
      })
      .expect(404);
  });

  it('POST /api/tips rejects invalid amount', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);

    await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: 'nope',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'e2ekey003',
      })
      .expect(400);
  });

  it('POST /api/tips rejects below minimum', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '50.00',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'e2ekey004',
      })
      .expect(400);

    expect((res.body as { error: string }).error).toBe('BELOW_MINIMUM');
  });

  it('POST /api/tips rejects above maximum', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '1000001.00',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'e2ekey005',
      })
      .expect(400);

    expect((res.body as { error: string }).error).toBe('ABOVE_MAXIMUM');
  });

  it('POST /api/tips anonymous tip hides name', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);
    prismaMock.paymentTransaction.findUnique.mockResolvedValue(null);
    prismaMock.$transaction
      .mockImplementationOnce(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
          prismaMock.paymentTransaction.create.mockResolvedValue({
            id: 'pay_a',
          });
          prismaMock.tip.create.mockResolvedValue({ id: 'tip_a' });
          return fn(prismaMock);
        },
      )
      .mockImplementationOnce(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
          prismaMock.paymentTransaction.update.mockResolvedValue({
            id: 'pay_a',
          });
          prismaMock.tip.update.mockResolvedValue({
            id: 'tip_a',
            creatorId: creator.id,
            amount: new Prisma.Decimal('1000.00'),
            currency: 'NGN',
            message: null,
            isAnonymous: true,
            supporterName: 'Hidden',
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
          return fn(prismaMock);
        },
      );

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '1000.00',
        supporterEmail: 'supporter@example.com',
        isAnonymous: true,
        supporterName: 'Hidden',
        idempotencyKey: 'e2ekey006',
      })
      .expect(201);

    const body = res.body as {
      tip: { isAnonymous: boolean; supporterName: string | null };
    };
    expect(body.tip.isAnonymous).toBe(true);
    expect(body.tip.supporterName).toBeNull();
  });

  it('POST /api/tips named tip keeps supporter name', async () => {
    mockSuccessfulCreate();

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '2500.00',
        supporterEmail: 'supporter@example.com',
        isAnonymous: false,
        supporterName: 'Ada',
        message: 'Love it',
        idempotencyKey: 'e2ekey007',
      })
      .expect(201);

    const body = res.body as {
      tip: { isAnonymous: boolean; supporterName: string | null };
    };
    expect(body.tip.isAnonymous).toBe(false);
    expect(body.tip.supporterName).toBe('Ada');
  });

  it('POST /api/tips rejects long message via validation', async () => {
    await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '1000.00',
        supporterEmail: 'supporter@example.com',
        message: 'x'.repeat(501),
        idempotencyKey: 'e2ekey008',
      })
      .expect(400);
  });

  it('POST /api/tips duplicate idempotency returns same tip', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue(creator);
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
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

    const res = await request(app.getHttpServer())
      .post('/api/tips')
      .send({
        username: 'dina',
        amount: '2500.00',
        supporterEmail: 'supporter@example.com',
        idempotencyKey: 'e2ekey009',
      })
      .expect(201);

    expect((res.body as { tip: { id: string } }).tip.id).toBe('tip_1');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('GET /api/tips/:id/public returns tip', async () => {
    prismaMock.tip.findUnique.mockResolvedValue({
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

    const res = await request(app.getHttpServer())
      .get('/api/tips/tip_1/public')
      .expect(200);

    expect((res.body as { tip: { id: string } }).tip.id).toBe('tip_1');
  });
});
