import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHmac } from 'crypto';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  TipStatus,
} from '@prisma/client';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { SendByteService } from './../src/notifications/sendbyte.service';
import { PAYMENT_PROVIDER } from './../src/payments/payment-provider.port';
import { BachsHttpClient } from './../src/payments/bachs/bachs-http.client';
import { verifyBachsWebhookSignature } from './../src/payments/bachs/bachs.webhook';

describe('Webhooks Bachs (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'whsec_e2e_test';

  const tipRow = {
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

  type PrismaMock = {
    $connect: jest.Mock;
    $disconnect: jest.Mock;
    $queryRaw: jest.Mock;
    isConnected: jest.Mock;
    webhookEvent: { findUnique: jest.Mock; create: jest.Mock };
    tip: { findUnique: jest.Mock; update: jest.Mock };
    paymentTransaction: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    notification: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const prismaMock: PrismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    isConnected: jest.fn().mockReturnValue(true),
    webhookEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    tip: {
      findUnique: jest.fn().mockResolvedValue(tipRow),
      update: jest.fn().mockResolvedValue({}),
    },
    paymentTransaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };

  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: PrismaMock) => Promise<unknown>) => {
      prismaMock.tip.findUnique.mockResolvedValueOnce({
        status: TipStatus.CHECKOUT_PENDING,
      });
      return fn(prismaMock);
    },
  );

  const bachsHttp = {
    getCheckoutSession: jest.fn().mockResolvedValue({
      checkout_id: 'chk_1',
      status: 'completed',
      payment_status: 'succeeded',
      amount: '2500.00',
      currency: 'NGN',
      reference: 'tip_1',
    }),
    createCheckoutSession: jest.fn(),
    isConfigured: true,
  };

  const paymentProvider = {
    name: 'BACHS' as const,
    initializePayment: jest.fn(),
    verifyPayment: jest.fn().mockResolvedValue({
      status: 'succeeded',
      providerReference: 'chk_1',
      amount: '2500.00',
      currency: 'NGN',
      rawStatus: 'completed|succeeded',
      metadata: { reference: 'tip_1' },
    }),
    handleWebhook: jest.fn(),
  };

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public&connect_timeout=5';
    process.env.AUTH_SECRET ??= 'dev-only-change-me';
    process.env.OTP_HASH_PEPPER ??= 'dev-only-change-me';
    process.env.BACHS_WEBHOOK_SECRET = secret;
    process.env.APP_URL ??= 'http://localhost:3000';
    if (!process.env.PORT || Number.isNaN(Number(process.env.PORT))) {
      process.env.PORT = '3001';
    }

    jest.clearAllMocks();
    prismaMock.webhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.tip.findUnique.mockResolvedValue(tipRow);

    paymentProvider.handleWebhook.mockImplementation(
      (input: {
        rawBody: Buffer | string;
        headers: Record<string, string | string[] | undefined>;
      }) => {
        const ts = String(
          Array.isArray(input.headers['x-bachs-timestamp'])
            ? input.headers['x-bachs-timestamp'][0]
            : input.headers['x-bachs-timestamp'],
        );
        const sig = String(
          Array.isArray(input.headers['x-bachs-signature'])
            ? input.headers['x-bachs-signature'][0]
            : input.headers['x-bachs-signature'],
        );
        const ok = verifyBachsWebhookSignature({
          rawBody: input.rawBody,
          secret,
          timestampHeader: ts,
          signatureHeader: sig,
        });
        if (!ok) return Promise.resolve({ acknowledged: false });

        let envelope: {
          id?: string;
          type?: string;
          data?: Record<string, unknown>;
        };
        try {
          const raw =
            typeof input.rawBody === 'string'
              ? input.rawBody
              : input.rawBody.toString('utf8');
          envelope = JSON.parse(raw) as typeof envelope;
        } catch {
          return Promise.resolve({ acknowledged: false });
        }

        const data = envelope.data ?? {};
        return Promise.resolve({
          acknowledged: true,
          providerEventId: envelope.id,
          eventType: envelope.type,
          tipId:
            typeof data.reference === 'string' ? data.reference : undefined,
          verification: {
            status: 'succeeded' as const,
            providerReference:
              typeof data.checkout_id === 'string' ? data.checkout_id : 'chk_1',
            amount: typeof data.amount === 'string' ? data.amount : undefined,
            currency:
              typeof data.currency === 'string' ? data.currency : undefined,
            metadata: {
              reference:
                typeof data.reference === 'string' ? data.reference : undefined,
            },
          },
        });
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(SendByteService)
      .useValue({
        sendEmail: jest
          .fn()
          .mockResolvedValue({ id: 'm1', provider: 'DEV_LOG' }),
      })
      .overrideProvider(PAYMENT_PROVIDER)
      .useValue(paymentProvider)
      .overrideProvider(BachsHttpClient)
      .useValue(bachsHttp)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
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

  function signedHeaders(rawBody: string) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    return {
      'Content-Type': 'application/json',
      'X-Bachs-Timestamp': timestamp,
      'X-Bachs-Signature': signature,
    };
  }

  it('accepts a valid signed webhook and updates tip', async () => {
    const rawBody = JSON.stringify({
      id: 'evt_valid_1',
      type: 'collection.succeeded',
      data: {
        checkout_id: 'chk_1',
        status: 'succeeded',
        amount: '2500.00',
        currency: 'NGN',
        reference: 'tip_1',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/webhooks/bachs')
      .set(signedHeaders(rawBody))
      .send(JSON.parse(rawBody) as object)
      .expect(200);

    expect((res.body as { ok: boolean }).ok).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const rawBody = JSON.stringify({
      id: 'evt_bad_sig',
      type: 'collection.succeeded',
      data: { checkout_id: 'chk_1' },
    });

    await request(app.getHttpServer())
      .post('/api/webhooks/bachs')
      .set({
        'Content-Type': 'application/json',
        'X-Bachs-Timestamp': String(Math.floor(Date.now() / 1000)),
        'X-Bachs-Signature': 'deadbeef',
      })
      .send(JSON.parse(rawBody) as object)
      .expect(401);
  });

  it('rejects malformed JSON with valid-looking headers shape', async () => {
    const rawBody = '{not-json';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    // supertest always JSON-encodes .send(object); send raw string buffer via request
    await request(app.getHttpServer())
      .post('/api/webhooks/bachs')
      .set({
        'Content-Type': 'application/json',
        'X-Bachs-Timestamp': timestamp,
        'X-Bachs-Signature': signature,
      })
      .send(rawBody)
      .expect(400);
  });

  it('returns 200 for duplicate webhook without re-processing', async () => {
    prismaMock.webhookEvent.findUnique.mockResolvedValue({
      id: 'we_1',
      processedAt: new Date(),
    });

    const rawBody = JSON.stringify({
      id: 'evt_dup',
      type: 'collection.succeeded',
      data: {
        checkout_id: 'chk_1',
        reference: 'tip_1',
        status: 'succeeded',
      },
    });

    await request(app.getHttpServer())
      .post('/api/webhooks/bachs')
      .set(signedHeaders(rawBody))
      .send(JSON.parse(rawBody) as object)
      .expect(200);

    expect(paymentProvider.verifyPayment).not.toHaveBeenCalled();
  });

  it('GET /api/payments/:id/status returns public status', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pay_1',
      status: PaymentStatus.PROCESSING,
      amount: new Prisma.Decimal('2500.00'),
      currency: 'NGN',
      tip: {
        id: 'tip_1',
        status: TipStatus.CHECKOUT_PENDING,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/payments/pay_1/status')
      .expect(200);

    const body = res.body as { paid: boolean; tipStatus: string };
    expect(body.paid).toBe(false);
    expect(body.tipStatus).toBe(TipStatus.CHECKOUT_PENDING);
  });
});
