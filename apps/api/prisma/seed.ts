import {
  PrismaClient,
  SocialPlatform,
  TipStatus,
  PaymentProvider,
  PaymentStatus,
  AuditAction,
  Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Development seed only.
 * Tips are NEVER marked as successful Bachs payments.
 */
async function main() {
  const email = 'dina@demo.cheer.local';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      emailVerifiedAt: new Date(),
      creatorProfile: {
        create: {
          username: 'dina',
          displayName: 'Dina Okonkwo',
          bio: 'Building tools for African creators. Demo profile for local TippyMe development.',
          supportMessage: 'Thanks for supporting my work — every tip helps.',
          currency: 'NGN',
          isActive: true,
          socialLinks: {
            create: [
              {
                platform: SocialPlatform.X,
                url: 'https://x.com/demo_dina_cheer',
                label: 'X',
                sortOrder: 0,
              },
              {
                platform: SocialPlatform.GITHUB,
                url: 'https://github.com/demo-dina-cheer',
                label: 'GitHub',
                sortOrder: 1,
              },
              {
                platform: SocialPlatform.WEBSITE,
                url: 'https://example.com/dina',
                label: 'Website',
                sortOrder: 2,
              },
            ],
          },
        },
      },
    },
    include: { creatorProfile: true },
  });

  const creatorId = user.creatorProfile!.id;

  // Clear prior seed tips for this creator (idempotent re-seed)
  await prisma.tip.deleteMany({
    where: {
      creatorId,
      message: { startsWith: '[DEV SEED]' },
    },
  });
  await prisma.paymentTransaction.deleteMany({
    where: {
      provider: PaymentProvider.DEV_SEED,
      internalReference: { startsWith: 'seed_' },
    },
  });

  const seedPayment = await prisma.paymentTransaction.create({
    data: {
      internalReference: 'seed_tip_draft_001',
      provider: PaymentProvider.DEV_SEED,
      providerReference: 'dev_seed_not_bachs_001',
      amount: new Prisma.Decimal('2500.00'),
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      metadata: {
        source: 'prisma-seed',
        note: 'Not a Bachs payment — local development fixture only',
      },
      rawProviderStatus: 'DEV_SEED_PENDING',
    },
  });

  await prisma.tip.create({
    data: {
      creatorId,
      amount: new Prisma.Decimal('2500.00'),
      currency: 'NGN',
      message:
        '[DEV SEED] Sample supporter note — fixture only, not a Bachs-verified tip.',
      isAnonymous: false,
      supporterName: 'Seed Supporter',
      supporterEmail: 'seed-supporter@demo.cheer.local',
      status: TipStatus.CREATED,
      paymentTransactionId: seedPayment.id,
    },
  });

  await prisma.tip.create({
    data: {
      creatorId,
      amount: new Prisma.Decimal('1000.00'),
      currency: 'NGN',
      message: '[DEV SEED] Anonymous draft tip — unpaid development data.',
      isAnonymous: true,
      status: TipStatus.CREATED,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      metadata: { source: 'prisma-seed' },
    },
  });

  console.log('Seed complete:');
  console.log(`  creator: cheer.cash/${user.creatorProfile!.username}`);
  console.log(`  email:   ${email}`);
  console.log('  tips:    2 CREATED fixtures (DEV_SEED — not Bachs PAID)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
