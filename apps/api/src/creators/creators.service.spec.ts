import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, SocialPlatform, TipStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatorsService } from './creators.service';

describe('CreatorsService', () => {
  let service: CreatorsService;
  let prisma: {
    creatorProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    tip: {
      aggregate: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    socialLink: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const userA = 'user_a';
  const userB = 'user_b';

  beforeEach(async () => {
    prisma = {
      creatorProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      tip: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      socialLink: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'APP_URL' ? 'http://localhost:3000' : undefined,
          },
        },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  describe('checkUsernameAvailability', () => {
    it('marks reserved usernames unavailable', async () => {
      const result = await service.checkUsernameAvailability('login');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('RESERVED');
    });

    it('marks invalid usernames unavailable', async () => {
      const result = await service.checkUsernameAvailability('X');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('TOO_SHORT');
    });

    it('marks taken usernames unavailable', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ userId: userB });
      const result = await service.checkUsernameAvailability('dina');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('TAKEN');
    });

    it('allows own username when excluded', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ userId: userA });
      const result = await service.checkUsernameAvailability('dina', {
        excludeUserId: userA,
      });
      expect(result.available).toBe(true);
    });
  });

  describe('create', () => {
    it('creates a profile with normalized username', async () => {
      prisma.creatorProfile.findUnique
        .mockResolvedValueOnce(null) // existing profile for user
        .mockResolvedValueOnce(null); // username lookup
      prisma.creatorProfile.create.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
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
      prisma.auditLog.create.mockResolvedValue({});

      const profile = await service.create(userA, {
        username: 'Dina',
        displayName: 'Dina',
      });

      expect(profile.username).toBe('dina');
      expect(profile.publicPath).toBe('/dina');
      const createCalls = prisma.creatorProfile.create.mock.calls as Array<
        [{ data: { username: string } }]
      >;
      expect(createCalls[0][0].data.username).toBe('dina');
    });

    it('rejects duplicate username race with P2002', async () => {
      prisma.creatorProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.creatorProfile.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create(userA, { username: 'dina', displayName: 'Dina' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects second profile for same user', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create(userA, { username: 'dina', displayName: 'Dina' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('ownership', () => {
    it('forbids updating another creator', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ userId: userB });
      await expect(
        service.assertOwnsCreator(userA, 'creator_b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows owner', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ userId: userA });
      await expect(
        service.assertOwnsCreator(userA, 'creator_a'),
      ).resolves.toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('updates display name for owner', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
      });
      prisma.creatorProfile.update.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
        username: 'dina',
        displayName: 'Dina O',
        bio: 'Hi',
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
      prisma.auditLog.create.mockResolvedValue({});

      const profile = await service.updateProfile(userA, {
        displayName: 'Dina O',
        bio: 'Hi',
      });
      expect(profile.displayName).toBe('Dina O');
    });

    it('returns not found when profile missing', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile(userA, { displayName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('social links', () => {
    it('rejects non-http social urls', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
      });

      await expect(
        service.replaceSocialLinks(userA, {
          links: [
            {
              platform: SocialPlatform.WEBSITE,
              url: 'ftp://example.com',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces social links for owner', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
      });
      const updated = {
        id: 'creator_1',
        userId: userA,
        username: 'dina',
        displayName: 'Dina',
        bio: null,
        avatarUrl: null,
        supportMessage: null,
        currency: 'NGN',
        suggestedTipAmounts: [],
        isActive: true,
        bachsAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        socialLinks: [
          {
            id: 'link_1',
            creatorId: 'creator_1',
            platform: SocialPlatform.GITHUB,
            url: 'https://github.com/dina',
            label: null,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
      );
      prisma.socialLink.deleteMany.mockResolvedValue({ count: 0 });
      prisma.socialLink.createMany.mockResolvedValue({ count: 1 });
      prisma.creatorProfile.findUniqueOrThrow.mockResolvedValue(updated);
      prisma.auditLog.create.mockResolvedValue({});

      const profile = await service.replaceSocialLinks(userA, {
        links: [
          {
            platform: SocialPlatform.GITHUB,
            url: 'https://github.com/dina',
          },
        ],
      });
      expect(profile.socialLinks).toHaveLength(1);
      expect(profile.socialLinks[0].platform).toBe('GITHUB');
    });
  });

  describe('getPublicByUsername', () => {
    it('returns public profile', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_1',
        userId: userA,
        username: 'dina',
        displayName: 'Dina',
        bio: 'Builder',
        avatarUrl: null,
        supportMessage: 'Thanks',
        currency: 'NGN',
        suggestedTipAmounts: ['1000.00'],
        isActive: true,
        bachsAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        socialLinks: [],
      });

      const profile = await service.getPublicByUsername('Dina');
      expect(profile.username).toBe('dina');
      expect(profile.suggestedTipAmounts).toEqual(['1000.00']);
    });

    it('hides inactive creators', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_1',
        isActive: false,
        username: 'dina',
      });
      await expect(service.getPublicByUsername('dina')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getDashboard', () => {
    it('requires an owned creator profile', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(service.getDashboard(userA)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sums only PAID tips and keeps anonymous names null', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_a',
        username: 'dina',
        displayName: 'Dina',
        currency: 'NGN',
        bachsAccountId: null,
      });
      prisma.tip.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal('5000.00') },
          _count: { _all: 2 },
        })
        .mockResolvedValueOnce({
          _sum: { amount: new Prisma.Decimal('2500.00') },
          _count: { _all: 1 },
        });
      prisma.tip.findMany
        .mockResolvedValueOnce([
          {
            id: 'tip_anon',
            creatorId: 'creator_a',
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            message: 'Nice',
            isAnonymous: true,
            supporterName: 'ShouldHide',
            supporterEmail: 'x@y.com',
            status: TipStatus.PAID,
            paymentTransactionId: 'pay_1',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            updatedAt: new Date(),
            paymentTransaction: { status: 'SUCCEEDED' },
          },
          {
            id: 'tip_fail',
            creatorId: 'creator_a',
            amount: new Prisma.Decimal('999.00'),
            currency: 'NGN',
            message: null,
            isAnonymous: false,
            supporterName: 'Failed',
            supporterEmail: null,
            status: TipStatus.FAILED,
            paymentTransactionId: null,
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date(),
            paymentTransaction: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'tip_anon',
            creatorId: 'creator_a',
            amount: new Prisma.Decimal('2500.00'),
            currency: 'NGN',
            message: 'Nice',
            isAnonymous: true,
            supporterName: null,
            supporterEmail: 'x@y.com',
            status: TipStatus.PAID,
            paymentTransactionId: 'pay_1',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            updatedAt: new Date(),
            paymentTransaction: { status: 'SUCCEEDED' },
          },
        ]);

      const dashboard = await service.getDashboard(userA);

      expect(dashboard.totals.successfulSupport).toBe('5000.00');
      expect(dashboard.totals.successfulTipCount).toBe(2);
      expect(dashboard.totals.periodSupport).toBe('2500.00');
      expect(dashboard.publicUrl).toBe('http://localhost:3000/dina');
      expect(dashboard.recentTips[0].supporterName).toBeNull();
      expect(dashboard.recentTips[0].isAnonymous).toBe(true);
      expect(dashboard.settlement.readiness).toBe('NOT_CONFIGURED');
      expect(dashboard.settlement.tippyHoldsWithdrawableBalance).toBe(false);
      expect(dashboard.settlement.tippyInitiatedPayoutAvailable).toBe(false);
      expect(dashboard.settlement.automatedFridayPayout).toBe(
        'FUTURE_CAPABILITY',
      );
      expect(prisma.tip.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            creatorId: 'creator_a',
            status: TipStatus.PAID,
          },
        }),
      );
    });
  });

  describe('listMyTips', () => {
    it('scopes queries to the owned creatorId (no IDOR via filters)', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_a',
        userId: userA,
      });
      prisma.tip.count.mockResolvedValue(0);
      prisma.tip.findMany.mockResolvedValue([]);

      await service.listMyTips(userA, {
        status: TipStatus.PAID,
        page: 1,
        pageSize: 10,
      });

      expect(prisma.tip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            creatorId: 'creator_a',
            status: TipStatus.PAID,
          },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('paginates results', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator_a',
        userId: userA,
      });
      prisma.tip.count.mockResolvedValue(25);
      prisma.tip.findMany.mockResolvedValue([]);

      const page = await service.listMyTips(userA, { page: 2, pageSize: 10 });
      expect(page.total).toBe(25);
      expect(page.totalPages).toBe(3);
      expect(prisma.tip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
