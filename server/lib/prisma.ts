import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { getServerEnv } from './env';

// Node runtime: Neon serverless driver needs a WebSocket implementation.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  __tippyPrisma?: PrismaClient;
};

/**
 * Avoid Prisma's native TCP pool against Neon (logs `kind: Closed` when
 * compute suspends). Use the Neon serverless WebSocket adapter instead.
 */
function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  url.searchParams.delete('channel_binding');
  url.searchParams.delete('connection_limit');
  url.searchParams.delete('pool_timeout');
  url.searchParams.delete('pgbouncer');

  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
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
  const adapter = new PrismaNeon(
    {
      connectionString: databaseUrl,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 30_000,
    },
    {
      onPoolError: (err) => {
        // Neon idle disconnects are expected; don't flood Pxxl logs.
        if (/terminat|closed|Connection ended|ECONNRESET/i.test(err.message)) {
          return;
        }
        console.error(`neon pool error: ${err.message}`);
      },
      onConnectionError: (err) => {
        if (/terminat|closed|Connection ended|ECONNRESET/i.test(err.message)) {
          return;
        }
        console.error(`neon connection error: ${err.message}`);
      },
    },
  );

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
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

/** One reconnect/rebuild after a transient Neon wake/idle failure. */
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
