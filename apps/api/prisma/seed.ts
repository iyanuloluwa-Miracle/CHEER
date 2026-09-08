import {
  PrismaClient,
  SocialPlatform,
  AuditAction,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Shared demo password — use POST /api/auth/login (no OTP). */
const DEMO_PASSWORD = 'password123';

type SeedCreator = {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  supportMessage: string;
};

const CREATORS: SeedCreator[] = [
  {
    email: 'dina@example.com',
    username: 'dina',
    displayName: 'Dina Okonkwo',
    bio: 'Building tools for African creators. Demo profile for local TippyMe development.',
    supportMessage: 'Thanks for supporting my work — every tip helps.',
  },
  {
    email: 'kai@example.com',
    username: 'kai',
    displayName: 'Kai Mensah',
    bio: 'Designer and storyteller. Second demo creator for UI walkthroughs.',
    supportMessage: 'Your support keeps the work going — thank you.',
  },
];

/**
 * Development seed only.
 * Two verified creators with passwords so you can skip OTP and use /login.
 * No tips or payment fixtures.
 * Matches existing rows by username (or email) so re-seeds stay stable.
 */
async function upsertCreator(seed: SeedCreator, passwordHash: string) {
  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { username: seed.username },
    include: { user: true },
  });

  if (existingProfile) {
    const user = await prisma.user.update({
      where: { id: existingProfile.userId },
      data: {
        email: seed.email,
        emailVerifiedAt: new Date(),
        passwordHash,
        creatorProfile: {
          update: {
            displayName: seed.displayName,
            bio: seed.bio,
            supportMessage: seed.supportMessage,
            suggestedTipAmounts: ['1000.00', '2500.00', '5000.00'],
            isActive: true,
          },
        },
      },
      include: { creatorProfile: true },
    });
    return user;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: seed.email },
    include: { creatorProfile: true },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        emailVerifiedAt: new Date(),
        passwordHash,
        creatorProfile: existingByEmail.creatorProfile
          ? {
              update: {
                username: seed.username,
                displayName: seed.displayName,
                bio: seed.bio,
                supportMessage: seed.supportMessage,
                suggestedTipAmounts: ['1000.00', '2500.00', '5000.00'],
                isActive: true,
              },
            }
          : {
              create: {
                username: seed.username,
                displayName: seed.displayName,
                bio: seed.bio,
                supportMessage: seed.supportMessage,
                currency: 'NGN',
                suggestedTipAmounts: ['1000.00', '2500.00', '5000.00'],
                isActive: true,
                socialLinks: {
                  create: [
                    {
                      platform: SocialPlatform.X,
                      url: `https://x.com/demo_${seed.username}_cheer`,
                      label: 'X',
                      sortOrder: 0,
                    },
                  ],
                },
              },
            },
      },
      include: { creatorProfile: true },
    });
  }

  const user = await prisma.user.create({
    data: {
      email: seed.email,
      emailVerifiedAt: new Date(),
      passwordHash,
      creatorProfile: {
        create: {
          username: seed.username,
          displayName: seed.displayName,
          bio: seed.bio,
          supportMessage: seed.supportMessage,
          currency: 'NGN',
          suggestedTipAmounts: ['1000.00', '2500.00', '5000.00'],
          isActive: true,
          socialLinks: {
            create: [
              {
                platform: SocialPlatform.X,
                url: `https://x.com/demo_${seed.username}_cheer`,
                label: 'X',
                sortOrder: 0,
              },
              {
                platform: SocialPlatform.WEBSITE,
                url: `https://example.com/${seed.username}`,
                label: 'Website',
                sortOrder: 1,
              },
            ],
          },
        },
      },
    },
    include: { creatorProfile: true },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      metadata: { source: 'prisma-seed', note: 'password login — no OTP' },
    },
  });

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.tip.deleteMany({
    where: { message: { startsWith: '[DEV SEED]' } },
  });
  await prisma.paymentTransaction.deleteMany({
    where: {
      provider: 'DEV_SEED',
      internalReference: { startsWith: 'seed_' },
    },
  });

  console.log('Seeding verified creators (password login, no OTP, no payments)…');

  for (const creator of CREATORS) {
    const user = await upsertCreator(creator, passwordHash);
    console.log(`  /${user.creatorProfile!.username}  ${creator.email}`);
  }

  console.log('');
  console.log('Seed complete. Log in at /login with:');
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('  emails:   dina@example.com  |  kai@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
