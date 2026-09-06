import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, SocialPlatform } from '@prisma/client';
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
});
