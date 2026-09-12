import { PrismaClient } from '@prisma/client';
import { getServerEnv } from './env';

const globalForPrisma = globalThis as unknown as {
  __tippyPrisma?: PrismaClient;
};

/**
 * Neon pooler + scale-to-zero closes idle sockets. Normalize the URL and
 * rebuild the client after Closed errors instead of reusing a dead pool.
 */
function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  // channel_binding breaks many PgBouncer / Prisma combinations.
  url.searchParams.delete('channel_binding');

  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set('connect_timeout', '30');
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30');
  }
  // Small pool for a single long-lived Node process on Neon.
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '3');
  }

  return url.toString();
}

function isTransientDbError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /closed|connection|P1001|P1017|Can't reach database|ECONNRESET|ETIMEDOUT/i.test(
    message,
  );
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  // Neon idle closes flood production logs; keep real errors only.
  client.$on('error', (event) => {
    if (/kind:\s*Closed/i.test(event.message)) return;
    console.error(`prisma:error ${event.message}`);
  });
  client.$on('warn', (event) => {
    console.warn(`prisma:warn ${event.message}`);
  });

  return client;
}

export function usePrisma(): PrismaClient {
  if (!globalForPrisma.__tippyPrisma) {
    const { DATABASE_URL } = getServerEnv();
    const databaseUrl = normalizeDatabaseUrl(DATABASE_URL);
    process.env.DATABASE_URL = databaseUrl;
    globalForPrisma.__tippyPrisma = createPrismaClient(databaseUrl);
  }
  return globalForPrisma.__tippyPrisma;
}

export async function resetPrisma(): Promise<void> {
  const existing = globalForPrisma.__tippyPrisma;
  globalForPrisma.__tippyPrisma = undefined;
  if (!existing) return;
  try {
    await existing.$disconnect();
  } catch {
    /* ignore */
  }
}

/** Rebuild client once after Neon/pooler drops idle connections. */
export async function withPrismaRetry<T>(
  run: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  try {
    return await run(usePrisma());
  } catch (err) {
    if (!isTransientDbError(err)) throw err;
    await resetPrisma();
    return run(usePrisma());
  }
}
