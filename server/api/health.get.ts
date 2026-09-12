import { withPrismaRetry } from '../lib/prisma';
import { defineApiHandler } from '../lib/define-api';

/**
 * Liveness for Docker/Pxxl healthchecks. DB is probed at most every 2 minutes
 * so Neon scale-to-zero does not flood logs with Closed connection errors.
 */
const DB_PROBE_TTL_MS = 120_000;

let lastDbProbeAt = 0;
let lastDbStatus: 'up' | 'down' | 'unknown' = 'unknown';

export default defineApiHandler(async () => {
  const now = Date.now();
  const shouldProbeDb = now - lastDbProbeAt >= DB_PROBE_TTL_MS;

  if (shouldProbeDb) {
    lastDbProbeAt = now;
    try {
      await withPrismaRetry((prisma) => prisma.$queryRaw`SELECT 1`);
      lastDbStatus = 'up';
    } catch {
      lastDbStatus = 'down';
    }
  }

  const database = lastDbStatus === 'unknown' ? 'down' : lastDbStatus;

  return {
    // Process is up — do not fail the probe just because Neon is waking/idle.
    status: 'ok' as const,
    service: 'cheer-web',
    database,
    timestamp: new Date().toISOString(),
  };
});
