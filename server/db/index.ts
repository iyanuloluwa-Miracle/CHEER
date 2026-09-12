import mongoose from 'mongoose';
import { getServerEnv } from '../lib/env';
import './models';

export type DbSession = mongoose.ClientSession;

const globalForMongo = globalThis as unknown as {
  __tippyMongoReady?: Promise<typeof mongoose>;
};

export async function connectMongo(uri?: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!globalForMongo.__tippyMongoReady) {
    const connectionUri = uri || getServerEnv().MONGODB_URI;
    globalForMongo.__tippyMongoReady = mongoose.connect(connectionUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15_000,
    });
    globalForMongo.__tippyMongoReady
      .then(() => {
        console.info('[db] mongodb connected');
      })
      .catch((err: Error) => {
        globalForMongo.__tippyMongoReady = undefined;
        console.error(`[db] mongodb connect failed: ${err.message}`);
      });
  }
  return globalForMongo.__tippyMongoReady;
}

/** Ensure a connection exists (call from request handlers / services). */
export async function useDb(): Promise<typeof mongoose> {
  return connectMongo();
}

export async function withTransaction<T>(
  fn: (session: DbSession) => Promise<T>,
): Promise<T> {
  await connectMongo();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function resetDb(): Promise<void> {
  globalForMongo.__tippyMongoReady = undefined;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number | string }).code === 11000
  );
}

export {
  UserModel,
  CreatorProfileModel,
  TipPageViewModel,
  SocialLinkModel,
  PaymentTransactionModel,
  TipModel,
  WebhookEventModel,
  OtpChallengeModel,
  NotificationModel,
  AuditLogModel,
  toPlain,
  toPlainList,
} from './models';

export type * from './types';
