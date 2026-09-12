import { PrismaClient } from '@prisma/client';
import { getServerEnv } from './env';

const globalForPrisma = globalThis as unknown as {
  __tippyPrisma?: PrismaClient;
};

/**
 * Neon closes idle pooled connections; Prisma then logs `Error { kind: Closed }`.
 * Keep a small pool, prefer the -pooler URL, and avoid channel_binding on the pooler.
 */
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

/** One reconnect attempt — useful after Neon wakes from idle / closed pool sockets. */
export async function withPrismaRetry<T>(
  run: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  const prisma = usePrisma();
  try {
    return await run(prisma);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/closed|connection|P1001|P1017/i.test(message)) {
      throw err;
    }
    try {
      await prisma.$disconnect();
    } catch {
      /* ignore */
    }
    await prisma.$connect();
    return run(prisma);
  }
}
