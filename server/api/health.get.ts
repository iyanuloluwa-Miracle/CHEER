import { defineApiHandler } from '../lib/define-api';

/**
 * Process liveness only — do not touch Postgres here.
 * Pxxl/Docker healthchecks would otherwise wake Neon and spam
 * connection errors when the compute is idle.
 */
export default defineApiHandler(async () => {
  return {
    status: 'ok' as const,
    service: 'cheer-web',
    database: 'skipped' as const,
    timestamp: new Date().toISOString(),
  };
});
