import { describe, expect, it } from 'vitest';
import { createApiClient } from '../services/api';

describe('createApiClient', () => {
  it('builds health path against api base', async () => {
    const originalFetch = globalThis.fetch;
    let calledUrl = '';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calledUrl = String(input);
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'cheer-api',
          timestamp: '2026-09-02T00:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const client = createApiClient('http://localhost:3001');
      const health = await client.getHealth();
      expect(calledUrl).toBe('http://localhost:3001/api/health');
      expect(health.status).toBe('ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
