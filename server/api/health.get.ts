import { withPrismaRetry } from '../lib/prisma';
import { defineApiHandler } from '../lib/define-api';

export default defineApiHandler(async () => {
  let database: 'up' | 'down' = 'down';

  try {
    await withPrismaRetry((prisma) => prisma.$queryRaw`SELECT 1`);
    database = 'up';
  } catch {
    database = 'down';
  }

  return {
    status: database === 'up' ? ('ok' as const) : ('degraded' as const),
    service: 'cheer-web',
    database,
    timestamp: new Date().toISOString(),
  };
});
