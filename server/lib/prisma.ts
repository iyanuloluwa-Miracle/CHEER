import { PrismaClient } from '@prisma/client';
import { getServerEnv } from './env';

const globalForPrisma = globalThis as unknown as {
  __tippyPrisma?: PrismaClient;
};

export function usePrisma(): PrismaClient {
  if (!globalForPrisma.__tippyPrisma) {
    const { DATABASE_URL } = getServerEnv();
    // Ensure Prisma's env("DATABASE_URL") resolver also sees the value.
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = DATABASE_URL;
    }
    globalForPrisma.__tippyPrisma = new PrismaClient({
      datasources: {
        db: { url: DATABASE_URL },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });
  }
  return globalForPrisma.__tippyPrisma;
}
