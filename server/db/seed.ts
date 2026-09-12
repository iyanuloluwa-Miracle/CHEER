import * as bcrypt from 'bcryptjs';
import {
  AuditLogModel,
  CreatorProfileModel,
  PaymentTransactionModel,
  SocialLinkModel,
  TipModel,
  UserModel,
  connectMongo,
  resetDb,
  toPlain,
} from './index';
import { insertedId, type LeanDoc } from './lean';
import { AuditAction, PaymentProvider, SocialPlatform } from './enums';
import type { CreatorProfile } from './types';

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

async function upsertCreator(seed: SeedCreator, passwordHash: string) {
  const existingProfile = toPlain<CreatorProfile>(
    await CreatorProfileModel.findOne({ username: seed.username }).lean<LeanDoc | null>(),
  );

  if (existingProfile) {
    await UserModel.updateOne(
      { _id: existingProfile.userId },
      {
        $set: {
          email: seed.email,
          emailVerifiedAt: new Date(),
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );
    await CreatorProfileModel.updateOne(
      { _id: existingProfile.id },
      {
        $set: {
          displayName: seed.displayName,
          bio: seed.bio,
          supportMessage: seed.supportMessage,
          suggestedTipAmounts: SUGGESTED,
          isActive: true,
          updatedAt: new Date(),
        },
      },
    );
    return { username: seed.username, email: seed.email };
  }

  const existingByEmail = await UserModel.findOne({ email: seed.email }).lean<LeanDoc | null>();

  if (existingByEmail) {
    const userId = String(existingByEmail._id);
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerifiedAt: new Date(),
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );

    const profileForUser = toPlain<CreatorProfile>(
      await CreatorProfileModel.findOne({ userId }).lean<LeanDoc | null>(),
    );

    if (profileForUser) {
      await CreatorProfileModel.updateOne(
        { _id: profileForUser.id },
        {
          $set: {
            username: seed.username,
            displayName: seed.displayName,
            bio: seed.bio,
            supportMessage: seed.supportMessage,
            suggestedTipAmounts: SUGGESTED,
            isActive: true,
            updatedAt: new Date(),
          },
        },
      );
    } else {
      const [profile] = await CreatorProfileModel.create([
        {
          userId,
          username: seed.username,
          displayName: seed.displayName,
          bio: seed.bio,
          supportMessage: seed.supportMessage,
          currency: 'NGN',
          suggestedTipAmounts: SUGGESTED,
          isActive: true,
        },
      ]);
      await SocialLinkModel.create([
        {
          creatorId: insertedId(profile),
          platform: SocialPlatform.X,
          url: `https://x.com/demo_${seed.username}_cheer`,
          label: 'X',
          sortOrder: 0,
        },
      ]);
    }
    return { username: seed.username, email: seed.email };
  }

  const [user] = await UserModel.create([
    {
      email: seed.email,
      emailVerifiedAt: new Date(),
      passwordHash,
    },
  ]);
  const userId = insertedId(user);

  const [profile] = await CreatorProfileModel.create([
    {
      userId,
      username: seed.username,
      displayName: seed.displayName,
      bio: seed.bio,
      supportMessage: seed.supportMessage,
      currency: 'NGN',
      suggestedTipAmounts: SUGGESTED,
      isActive: true,
    },
  ]);
  const profileId = insertedId(profile);

  await SocialLinkModel.create([
    {
      creatorId: profileId,
      platform: SocialPlatform.X,
      url: `https://x.com/demo_${seed.username}_cheer`,
      label: 'X',
      sortOrder: 0,
    },
    {
      creatorId: profileId,
      platform: SocialPlatform.WEBSITE,
      url: `https://example.com/${seed.username}`,
      label: 'Website',
      sortOrder: 1,
    },
  ]);

  await AuditLogModel.create([
    {
      actorUserId: userId,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: userId,
      metadata: { source: 'mongodb-seed', note: 'password login — no OTP' },
    },
  ]);

  return { username: seed.username, email: seed.email };
}

async function main() {
  const url = process.env.MONGODB_URI;
  if (!url) {
    throw new Error('MONGODB_URI is required for seed');
  }

  await connectMongo(url);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await TipModel.deleteMany({ message: { $regex: /^\[DEV SEED\]/ } });
  await PaymentTransactionModel.deleteMany({
    provider: PaymentProvider.DEV_SEED,
    internalReference: { $regex: /^seed_/ },
  });

  console.log('Seeding verified creators (password login, no OTP, no payments)…');

  for (const creator of CREATORS) {
    const user = await upsertCreator(creator, passwordHash);
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
