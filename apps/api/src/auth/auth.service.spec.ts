import { BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SendByteService } from '../notifications/sendbyte.service';
import { AuthService } from './auth.service';
import { hashOtp } from './otp.crypto';
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS } from './otp.constants';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    otpChallenge: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    notification: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let sendByte: { sendEmail: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  const pepper = 'unit-test-pepper';
  const email = 'creator@example.com';

  beforeEach(async () => {
    prisma = {
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
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    sendByte = {
      sendEmail: jest.fn().mockResolvedValue({
        id: 'em_test',
        provider: 'SENDBYTE',
      }),
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: SendByteService, useValue: sendByte },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'OTP_HASH_PEPPER') return pepper;
              if (key === 'AUTH_SECRET') return 'unit-auth-secret';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('requestOtp', () => {
    it('creates user, stores hashed OTP, and sends via SendByte', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user_1',
        email,
        emailVerifiedAt: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpChallenge.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'chal_1',
          ...data,
          attemptCount: 0,
          createdAt: new Date(),
        }),
      );
      prisma.notification.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.requestOtp(email);

      expect(result.ok).toBe(true);
      expect(sendByte.sendEmail).toHaveBeenCalled();
      const createCalls = prisma.otpChallenge.create.mock.calls as Array<
        [{ data: { codeHash: string } }]
      >;
      const createArg = createCalls[0][0].data;
      expect(createArg.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createArg.codeHash).not.toMatch(/^\d{6}$/);
      expect(JSON.stringify(result)).not.toMatch(/\d{6}/);
    });

    it('enforces resend cooldown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal_recent',
        createdAt: new Date(),
      });

      await expect(service.requestOtp(email)).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(sendByte.sendEmail).not.toHaveBeenCalled();
    });

    it('rejects OTP request when account already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email,
        emailVerifiedAt: new Date(),
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.requestOtp(email)).rejects.toMatchObject({
        status: 409,
      });
      expect(sendByte.sendEmail).not.toHaveBeenCalled();
    });

    it('consumes challenge when SendByte fails', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email,
        emailVerifiedAt: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpChallenge.create.mockResolvedValue({
        id: 'chal_fail',
        email,
        codeHash: 'abc',
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attemptCount: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        consumedAt: null,
        userId: 'user_1',
        createdAt: new Date(),
      });
      sendByte.sendEmail.mockRejectedValue(
        new Error('Unable to send verification email'),
      );
      prisma.otpChallenge.update.mockResolvedValue({});

      await expect(service.requestOtp(email)).rejects.toThrow();
      expect(prisma.otpChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal_fail' },
        }),
      );
      const updateCalls = prisma.otpChallenge.update.mock.calls as Array<
        [{ data: { consumedAt: Date } }]
      >;
      expect(updateCalls[0][0].data.consumedAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyOtp', () => {
    const code = '424242';
    const codeHash = hashOtp(code, pepper);

    function baseChallenge(overrides: Record<string, unknown> = {}) {
      return {
        id: 'chal_1',
        email,
        codeHash,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attemptCount: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        consumedAt: null,
        userId: 'user_1',
        createdAt: new Date(),
        ...overrides,
      };
    }

    it('succeeds, consumes OTP, and returns access token', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(baseChallenge());
      const verifiedUser = {
        id: 'user_1',
        email,
        emailVerifiedAt: new Date(),
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorProfile: null,
      };

      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => {
          const tx = {
            ...prisma,
            otpChallenge: {
              ...prisma.otpChallenge,
              update: jest.fn().mockResolvedValue({}),
            },
            user: {
              ...prisma.user,
              update: jest.fn().mockResolvedValue(verifiedUser),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return fn(tx);
        },
      );

      const result = await service.verifyOtp(email, code, 'password123');

      expect(result.response.ok).toBe(true);
      expect(result.response.user.email).toBe(email);
      expect(result.response.user.emailVerifiedAt).toBeTruthy();
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(JSON.stringify(result.response)).not.toContain(code);
    });

    it('rejects incorrect OTP and increments attempts', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(baseChallenge());
      prisma.otpChallenge.update.mockResolvedValue({
        ...baseChallenge(),
        attemptCount: 1,
      });
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.verifyOtp(email, '000000', 'password123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal_1' },
        data: { attemptCount: { increment: 1 } },
      });
    });

    it('rejects expired OTP', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(
        baseChallenge({ expiresAt: new Date(Date.now() - 1000) }),
      );
      prisma.auditLog.create.mockResolvedValue({});

      const err: unknown = await service
        .verifyOtp(email, code, 'password123')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        error: 'EXPIRED_OTP',
      });
    });

    it('rejects reused OTP', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(
        baseChallenge({ consumedAt: new Date() }),
      );
      prisma.auditLog.create.mockResolvedValue({});

      const err: unknown = await service
        .verifyOtp(email, code, 'password123')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        error: 'OTP_CONSUMED',
      });
    });

    it('rejects when too many attempts', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(
        baseChallenge({ attemptCount: OTP_MAX_ATTEMPTS }),
      );
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.verifyOtp(email, code, 'password123'),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('tokens', () => {
    it('verifies access tokens', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user_1',
        email,
      });
      await expect(service.verifyAccessToken('tok')).resolves.toEqual({
        sub: 'user_1',
        email,
      });
    });

    it('rejects invalid tokens', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.verifyAccessToken('bad')).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
