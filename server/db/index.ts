import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { getServerEnv } from '../lib/env';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;

export type Db = NeonDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __tippyDb?: Db;
  __tippyPool?: Pool;
};

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
  url.searchParams.delete('connect_timeout');

  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}

function isBenignDisconnect(message: string): boolean {
  return /terminat|closed|Connection ended|ECONNRESET|kind:\s*Closed/i.test(
    message,
  );
}

export function createDbFromUrl(databaseUrl: string): Db {
  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 30_000,
  });

  pool.on('error', (err: Error) => {
    if (isBenignDisconnect(err.message)) return;
    console.error(`neon pool error: ${err.message}`);
  });

  globalForDb.__tippyPool = pool;
  console.info('[db] neon serverless WebSocket pool ready');
  return drizzle(pool, { schema });
}

export function useDb(): Db {
  if (!globalForDb.__tippyDb) {
    const { DATABASE_URL } = getServerEnv();
    process.env.DATABASE_URL = normalizeDatabaseUrl(DATABASE_URL);
    globalForDb.__tippyDb = createDbFromUrl(DATABASE_URL);
  }
  return globalForDb.__tippyDb;
}

export async function resetDb(): Promise<void> {
  globalForDb.__tippyDb = undefined;
  const pool = globalForDb.__tippyPool;
  globalForDb.__tippyPool = undefined;
  if (!pool) return;
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}
