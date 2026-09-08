import { describe, expect, it } from 'vitest';
import { createApiClient } from '../services/api';
import type { ApiClientError } from '../services/api';

describe('createApiClient', () => {
  it('builds health path against api base with credentials', async () => {
    const originalFetch = globalThis.fetch;
    let calledUrl = '';
    let calledInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = String(input);
      calledInit = init;
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
      expect(calledInit?.credentials).toBe('include');
      expect(health.status).toBe('ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps auth error bodies to ApiClientError', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: 'Invalid or expired verification code.',
          error: 'INVALID_OTP',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    try {
      const client = createApiClient('http://localhost:3001');
      await expect(client.verifyOtp('a@b.com', '000000', 'password123')).rejects.toMatchObject({
        name: 'ApiClientError',
        errorCode: 'INVALID_OTP',
        statusCode: 400,
      } satisfies Partial<ApiClientError>);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('requests creator dashboard with credentials', async () => {
    const originalFetch = globalThis.fetch;
    let calledUrl = '';
    let calledInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = String(input);
      calledInit = init;
      return new Response(
        JSON.stringify({
          dashboard: {
            currency: 'NGN',
            username: 'dina',
            displayName: 'Dina',
            publicPath: '/dina',
            publicUrl: 'http://localhost:3000/dina',
            totals: {
              successfulSupport: '0.00',
              successfulTipCount: 0,
              periodSupport: '0.00',
              periodTipCount: 0,
              periodKey: '2026-09',
              periodLabel: 'September 2026',
            },
            recentTips: [],
            recentMessages: [],
            settlement: {
              readiness: 'NOT_CONFIGURED',
              bachsConnectAccountId: null,
              tippyHoldsWithdrawableBalance: false,
              tippyInitiatedPayoutAvailable: false,
              automatedFridayPayout: 'FUTURE_CAPABILITY',
              message: 'Payout setup is not available yet.',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const client = createApiClient('http://localhost:3001');
      const result = await client.getMyDashboard();
      expect(calledUrl).toBe('http://localhost:3001/api/creators/me/dashboard');
      expect(calledInit?.credentials).toBe('include');
      expect(result.dashboard.totals.successfulTipCount).toBe(0);
      expect(result.dashboard.settlement.tippyHoldsWithdrawableBalance).toBe(
        false,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
