import { defineApiHandler } from '../lib/define-api';

/**
 * Process liveness only — do not probe MongoDB here.
 * Keeps Docker/platform healthchecks cheap and independent of Atlas.
 */
export default defineApiHandler(async () => {
  return {
    status: 'ok' as const,
    service: 'cheer-web',
    database: 'skipped' as const,
    timestamp: new Date().toISOString(),
  };
});
