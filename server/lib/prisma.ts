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

  // Serverless driver talks over WebSocket; strip Prisma/pgbouncer knobs
  // that only apply to the native engine.
  url.searchParams.delete('channel_binding');
  url.searchParams.delete('connection_limit');
  url.searchParams.delete('pool_timeout');
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('connect_timeout');

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

function isBenignDisconnect(message: string): boolean {
  return /terminat|closed|Connection ended|ECONNRESET|kind:\s*Closed/i.test(
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
        if (isBenignDisconnect(err.message)) return;
        console.error(`neon pool error: ${err.message}`);
      },
      onConnectionError: (err) => {
        if (isBenignDisconnect(err.message)) return;
        console.error(`neon connection error: ${err.message}`);
      },
    },
  );

  const client = new PrismaClient({
    adapter,
    // Event sink so idle Neon disconnects never hit Pxxl as prisma:error spam.
    log: [{ emit: 'event', level: 'error' }],
  });

  client.$on('error', (e) => {
    if (isBenignDisconnect(e.message)) return;
    console.error(`prisma:error ${e.message}`);
  });

  console.info('[prisma] neon serverless WebSocket adapter ready');
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
