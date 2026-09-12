import { and, eq, like } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { createDbFromUrl, resetDb } from './index';
import { AuditAction, PaymentProvider, SocialPlatform } from './enums';
import {
  auditLogs,
  creatorProfiles,
  paymentTransactions,
  socialLinks,
  tips,
  users,
} from './schema';

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

const SUGGESTED = ['1000.00', '2500.00', '5000.00'];

/**
 * Development seed only.
 * Two verified creators with passwords so you can skip OTP and use /login.
 */
async function upsertCreator(
  db: ReturnType<typeof createDbFromUrl>,
  seed: SeedCreator,
  passwordHash: string,
) {
  const existingProfile = await db.query.creatorProfiles.findFirst({
    where: eq(creatorProfiles.username, seed.username),
    with: { user: true },
  });

  if (existingProfile) {
    await db
      .update(users)
      .set({
        email: seed.email,
        emailVerifiedAt: new Date(),
        passwordHash,
      })
      .where(eq(users.id, existingProfile.userId));
    await db
      .update(creatorProfiles)
      .set({
        displayName: seed.displayName,
        bio: seed.bio,
        supportMessage: seed.supportMessage,
        suggestedTipAmounts: SUGGESTED,
        isActive: true,
      })
      .where(eq(creatorProfiles.id, existingProfile.id));
    return { username: seed.username, email: seed.email };
  }

  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, seed.email),
    with: { creatorProfile: true },
  });

  if (existingByEmail) {
    await db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        passwordHash,
      })
      .where(eq(users.id, existingByEmail.id));

    if (existingByEmail.creatorProfile) {
      await db
        .update(creatorProfiles)
        .set({
          username: seed.username,
          displayName: seed.displayName,
          bio: seed.bio,
          supportMessage: seed.supportMessage,
          suggestedTipAmounts: SUGGESTED,
          isActive: true,
        })
        .where(eq(creatorProfiles.id, existingByEmail.creatorProfile.id));
    } else {
      const [profile] = await db
        .insert(creatorProfiles)
        .values({
          userId: existingByEmail.id,
          username: seed.username,
          displayName: seed.displayName,
          bio: seed.bio,
          supportMessage: seed.supportMessage,
          currency: 'NGN',
          suggestedTipAmounts: SUGGESTED,
          isActive: true,
        })
        .returning();
      await db.insert(socialLinks).values({
        creatorId: profile.id,
        platform: SocialPlatform.X,
        url: `https://x.com/demo_${seed.username}_cheer`,
        label: 'X',
        sortOrder: 0,
      });
    }
    return { username: seed.username, email: seed.email };
  }

  const [user] = await db
    .insert(users)
    .values({
      email: seed.email,
      emailVerifiedAt: new Date(),
      passwordHash,
    })
    .returning();

  const [profile] = await db
    .insert(creatorProfiles)
    .values({
      userId: user.id,
      username: seed.username,
      displayName: seed.displayName,
      bio: seed.bio,
      supportMessage: seed.supportMessage,
      currency: 'NGN',
      suggestedTipAmounts: SUGGESTED,
      isActive: true,
    })
    .returning();

  await db.insert(socialLinks).values([
    {
      creatorId: profile.id,
      platform: SocialPlatform.X,
      url: `https://x.com/demo_${seed.username}_cheer`,
      label: 'X',
      sortOrder: 0,
    },
    {
      creatorId: profile.id,
      platform: SocialPlatform.WEBSITE,
      url: `https://example.com/${seed.username}`,
      label: 'Website',
      sortOrder: 1,
    },
  ]);

  await db.insert(auditLogs).values({
    actorUserId: user.id,
    action: AuditAction.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    metadata: { source: 'drizzle-seed', note: 'password login — no OTP' },
  });

  return { username: seed.username, email: seed.email };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for seed');
  }

  const db = createDbFromUrl(url);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await db.delete(tips).where(like(tips.message, '[DEV SEED]%'));
  await db
    .delete(paymentTransactions)
    .where(
      and(
        eq(paymentTransactions.provider, PaymentProvider.DEV_SEED),
        like(paymentTransactions.internalReference, 'seed_%'),
      ),
    );

  console.log('Seeding verified creators (password login, no OTP, no payments)…');

  for (const creator of CREATORS) {
    const user = await upsertCreator(db, creator, passwordHash);
    console.log(`  /${user.username}  ${user.email}`);
  }

  console.log('');
  console.log('Seed complete. Log in at /login with:');
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('  emails:   dina@example.com  |  kai@example.com');

  await resetDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
