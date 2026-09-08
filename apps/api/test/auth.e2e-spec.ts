import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { SendByteService } from './../src/notifications/sendbyte.service';
import { AuthService } from './../src/auth/auth.service';
import { AUTH_COOKIE_NAME } from './../src/auth/otp.constants';
import { hashOtp } from './../src/auth/otp.crypto';
import { OtpPurpose } from '@prisma/client';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let jwt: JwtService;

  const pepper = 'dev-only-change-me';
  const email = 'e2e-creator@example.com';

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    isConnected: jest.fn().mockReturnValue(true),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    otpChallenge: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'n_e2e' }),
      update: jest.fn().mockResolvedValue({ id: 'n_e2e' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit_e2e' }) },
    $transaction: jest.fn(),
  };

  const sendByteMock = {
    sendEmail: jest.fn().mockResolvedValue({
      id: 'em_e2e',
      provider: 'DEV_LOG',
    }),
  };

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public&connect_timeout=5';
    process.env.AUTH_SECRET ??= 'dev-only-change-me';
    process.env.OTP_HASH_PEPPER ??= pepper;
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
      .useValue(sendByteMock)
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

    authService = moduleFixture.get(AuthService);
    jwt = moduleFixture.get(JwtService);
  }, 30_000);

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/auth/request-otp succeeds without returning OTP', async () => {
    prismaMock.otpChallenge.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_e2e',
      email,
      emailVerifiedAt: null,
      passwordHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.otpChallenge.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.otpChallenge.create.mockResolvedValue({
      id: 'chal_e2e',
      email,
      codeHash: 'hash',
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 600_000),
      attemptCount: 0,
      maxAttempts: 5,
      consumedAt: null,
      userId: 'user_e2e',
      createdAt: new Date(),
    });
    prismaMock.notification.create.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/api/auth/request-otp')
      .send({ email })
      .expect(200);

    const body = res.body as { ok?: boolean };
    expect(body.ok).toBe(true);
    expect(res.body).not.toHaveProperty('code');
    expect(res.body).not.toHaveProperty('otp');
    expect(sendByteMock.sendEmail).toHaveBeenCalled();
  });

  it('POST /api/auth/verify-otp sets session cookie on success', async () => {
    const code = '112233';
    prismaMock.otpChallenge.findFirst.mockResolvedValue({
      id: 'chal_e2e',
      email,
      codeHash: hashOtp(code, pepper),
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 600_000),
      attemptCount: 0,
      maxAttempts: 5,
      consumedAt: null,
      userId: 'user_e2e',
      createdAt: new Date(),
    });

    const verifiedUser = {
      id: 'user_e2e',
      email,
      emailVerifiedAt: new Date(),
      passwordHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorProfile: null,
    };

    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
        const tx = {
          otpChallenge: {
            update: jest.fn().mockResolvedValue({}),
          },
          user: {
            update: jest.fn().mockResolvedValue(verifiedUser),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as never);
      },
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ email, code, password: 'password123' })
      .expect(200);

    const body = res.body as { ok?: boolean; user?: { email?: string } };
    expect(body.ok).toBe(true);
    expect(body.user?.email).toBe(email);
    const setCookie = res.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join(';')
      : String(setCookie ?? '');
    expect(cookieHeader).toContain(AUTH_COOKIE_NAME);
  });

  it('GET /api/auth/me rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me allows authenticated access', async () => {
    const token = await jwt.signAsync({
      sub: 'user_e2e',
      email,
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_e2e',
      email,
      emailVerifiedAt: new Date(),
      passwordHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorProfile: null,
    });

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .expect(200);

    const body = res.body as { user?: { email?: string } };
    expect(body.user?.email).toBe(email);
  });

  it('AuthService helpers remain available for guard wiring', () => {
    expect(authService).toBeDefined();
  });
});
