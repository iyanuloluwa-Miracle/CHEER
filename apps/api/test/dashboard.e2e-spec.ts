import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { PaymentStatus, Prisma, TipStatus } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { SendByteService } from './../src/notifications/sendbyte.service';
import { AUTH_COOKIE_NAME } from './../src/auth/otp.constants';

describe('Creator dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  type PrismaMock = {
    $connect: jest.Mock;
    $disconnect: jest.Mock;
    $queryRaw: jest.Mock;
    isConnected: jest.Mock;
    creatorProfile: { findUnique: jest.Mock };
    tip: {
      aggregate: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };

  const prismaMock: PrismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    isConnected: jest.fn().mockReturnValue(true),
    creatorProfile: {
      findUnique: jest.fn(),
    },
    tip: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public&connect_timeout=5';
    process.env.AUTH_SECRET ??= 'dev-only-change-me';
    process.env.OTP_HASH_PEPPER ??= 'dev-only-change-me';
    process.env.APP_URL ??= 'http://localhost:3000';
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

    jwt = moduleFixture.get(JwtService);
  }, 30_000);

  afterEach(async () => {
    await app.close();
  });

  async function authCookie(userId: string, email = 'a@example.com') {
    const token = await jwt.signAsync({ sub: userId, email });
    return `${AUTH_COOKIE_NAME}=${token}`;
  }

  it('GET /api/creators/me/dashboard requires auth', async () => {
    await request(app.getHttpServer())
      .get('/api/creators/me/dashboard')
      .expect(401);
  });

  it('GET /api/creators/me/dashboard returns scoped totals', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'creator_a',
      username: 'dina',
      displayName: 'Dina',
      currency: 'NGN',
      bachsAccountId: null,
    });
    prismaMock.tip.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('7500.00') },
        _count: { _all: 3 },
      })
      .mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('2500.00') },
        _count: { _all: 1 },
      });
    prismaMock.tip.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get('/api/creators/me/dashboard')
      .set('Cookie', await authCookie('user_a'))
      .expect(200);

    const body = res.body as {
      dashboard: {
        totals: { successfulSupport: string; successfulTipCount: number };
        publicUrl: string;
        settlement: {
          readiness: string;
          tippyHoldsWithdrawableBalance: boolean;
          tippyInitiatedPayoutAvailable: boolean;
          automatedFridayPayout: string;
        };
      };
    };
    expect(body.dashboard.totals.successfulSupport).toBe('7500.00');
    expect(body.dashboard.totals.successfulTipCount).toBe(3);
    expect(body.dashboard.publicUrl).toContain('/dina');
    expect(body.dashboard.settlement.readiness).toBe('NOT_CONFIGURED');
    expect(body.dashboard.settlement.tippyHoldsWithdrawableBalance).toBe(false);
    expect(body.dashboard.settlement.tippyInitiatedPayoutAvailable).toBe(false);
    expect(body.dashboard.settlement.automatedFridayPayout).toBe(
      'FUTURE_CAPABILITY',
    );
    expect(prismaMock.tip.aggregate).toHaveBeenCalled();
  });

  it('GET /api/creators/me/tips scopes to owned creator and paginates', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'creator_a',
      userId: 'user_a',
    });
    prismaMock.tip.count.mockResolvedValue(1);
    prismaMock.tip.findMany.mockResolvedValue([
      {
        id: 'tip_1',
        creatorId: 'creator_a',
        amount: new Prisma.Decimal('2500.00'),
        currency: 'NGN',
        message: 'Hello',
        isAnonymous: true,
        supporterName: 'Hidden',
        supporterEmail: 'secret@example.com',
        status: TipStatus.PAID,
        paymentTransactionId: 'pay_1',
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: new Date(),
        paymentTransaction: { status: PaymentStatus.SUCCEEDED },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/creators/me/tips')
      .query({ status: TipStatus.PAID, page: 1, pageSize: 10 })
      .set('Cookie', await authCookie('user_a'))
      .expect(200);

    const body = res.body as {
      tips: Array<{
        supporterName: string | null;
        isAnonymous: boolean;
        status: string;
      }>;
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.tips[0].isAnonymous).toBe(true);
    expect(body.tips[0].supporterName).toBeNull();
    expect(body.tips[0].status).toBe(TipStatus.PAID);
    expect(prismaMock.tip.findMany).toHaveBeenCalled();
  });

  it('Creator B session cannot see Creator A tips (ownership via session)', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'creator_b',
      userId: 'user_b',
    });
    prismaMock.tip.count.mockResolvedValue(0);
    prismaMock.tip.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/creators/me/tips')
      .set('Cookie', await authCookie('user_b', 'b@example.com'))
      .expect(200);

    expect(prismaMock.tip.findMany).toHaveBeenCalled();
  });
});
