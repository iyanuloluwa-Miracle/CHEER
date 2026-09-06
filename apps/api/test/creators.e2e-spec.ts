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
import { AUTH_COOKIE_NAME } from './../src/auth/otp.constants';
import { SocialPlatform } from '@prisma/client';

describe('Creators (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

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
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    creatorProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    socialLink: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public&connect_timeout=5';
    process.env.AUTH_SECRET ??= 'dev-only-change-me';
    process.env.OTP_HASH_PEPPER ??= 'dev-only-change-me';
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

  it('GET username-available rejects reserved names', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/creators/username-available')
      .query({ username: 'dashboard' })
      .expect(200);

    const body = res.body as { available: boolean; reason?: string };
    expect(body.available).toBe(false);
    expect(body.reason).toBe('RESERVED');
  });

  it('POST /api/creators requires auth', async () => {
    await request(app.getHttpServer())
      .post('/api/creators')
      .send({ username: 'dina', displayName: 'Dina' })
      .expect(401);
  });

  it('POST /api/creators creates profile for authenticated user', async () => {
    prismaMock.creatorProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.creatorProfile.create.mockResolvedValue({
      id: 'c1',
      userId: 'user_a',
      username: 'dina',
      displayName: 'Dina',
      bio: null,
      avatarUrl: null,
      supportMessage: null,
      currency: 'NGN',
      suggestedTipAmounts: ['1000.00', '2500.00', '5000.00'],
      isActive: true,
      bachsAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      socialLinks: [],
    });

    const res = await request(app.getHttpServer())
      .post('/api/creators')
      .set('Cookie', await authCookie('user_a'))
      .send({ username: 'dina', displayName: 'Dina' })
      .expect(201);

    const body = res.body as { profile: { username: string } };
    expect(body.profile.username).toBe('dina');
  });

  it('PATCH /api/creators/me is ownership-scoped', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'c1',
      userId: 'user_a',
    });
    prismaMock.creatorProfile.update.mockResolvedValue({
      id: 'c1',
      userId: 'user_a',
      username: 'dina',
      displayName: 'Updated',
      bio: null,
      avatarUrl: null,
      supportMessage: null,
      currency: 'NGN',
      suggestedTipAmounts: [],
      isActive: true,
      bachsAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      socialLinks: [],
    });

    const res = await request(app.getHttpServer())
      .patch('/api/creators/me')
      .set('Cookie', await authCookie('user_a'))
      .send({ displayName: 'Updated' })
      .expect(200);

    const body = res.body as { profile: { displayName: string } };
    expect(body.profile.displayName).toBe('Updated');
    expect(prismaMock.creatorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });

  it('PUT social-links validates urls', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'c1',
      userId: 'user_a',
    });

    await request(app.getHttpServer())
      .put('/api/creators/me/social-links')
      .set('Cookie', await authCookie('user_a'))
      .send({
        links: [{ platform: SocialPlatform.X, url: 'not-a-url' }],
      })
      .expect(400);
  });

  it('GET /api/creators/:username returns public profile', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: 'c1',
      userId: 'user_a',
      username: 'dina',
      displayName: 'Dina',
      bio: 'Hello',
      avatarUrl: null,
      supportMessage: 'Support me',
      currency: 'NGN',
      suggestedTipAmounts: ['1000.00'],
      isActive: true,
      bachsAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      socialLinks: [],
    });

    const res = await request(app.getHttpServer())
      .get('/api/creators/dina')
      .expect(200);

    const body = res.body as {
      profile: { username: string; publicPath: string };
    };
    expect(body.profile.username).toBe('dina');
    expect(body.profile.publicPath).toBe('/dina');
  });
});
