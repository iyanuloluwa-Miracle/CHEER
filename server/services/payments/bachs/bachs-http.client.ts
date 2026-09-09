import { getServerEnv } from '../../../lib/env';
import {
  BACHS_API_VERSION_PREFIX,
  BACHS_REQUEST_TIMEOUT_MS,
  BACHS_SANDBOX_BASE_URL,
} from './bachs.constants';
import { BachsProviderError, mapHttpStatusToKind } from './bachs.errors';

export interface BachsCreateCheckoutSessionBody {
  pricing: { currency: string; amount: string };
  customer: { email: string; name: string };
  success_url: string;
  cancel_url: string;
  reference: string;
  metadata?: Record<string, string>;
}

/** Documented create-checkout response fields we rely on. */
export interface BachsCreateCheckoutSessionResponse {
  checkout_id: string;
  checkout_url: string;
  status: string;
  expires_at?: string;
  created_at?: string;
  reference?: string | null;
}

/** Subset of retrieve-checkout fields used for verification. */
export interface BachsCheckoutSessionResponse {
  checkout_id: string;
  status: string;
  payment_status?: string | null;
  amount?: string;
  currency?: string;
  reference?: string | null;
  charge?: {
    status?: string;
    amount?: string;
    currency?: string;
    payment_id?: string;
    charge_id?: string;
  } | null;
}

interface BachsErrorBody {
  detail?: string;
  error_code?: string;
}

/**
 * Thin HTTP client for official Bachs REST.
 * Never log Authorization headers or API keys.
 */
export class BachsHttpClient {
  get isConfigured(): boolean {
    return Boolean(getServerEnv().BACHS_API_KEY?.trim());
  }

  private baseUrl(): string {
    return (
      getServerEnv().BACHS_API_BASE_URL?.replace(/\/$/, '') ||
      BACHS_SANDBOX_BASE_URL
    );
  }

  private apiKey(): string {
    const key = getServerEnv().BACHS_API_KEY?.trim();
    if (!key) {
      throw new BachsProviderError('CONFIG', 'BACHS_API_KEY is not configured');
    }
    return key;
  }

  async createCheckoutSession(
    body: BachsCreateCheckoutSessionBody,
    idempotencyKey: string,
  ): Promise<BachsCreateCheckoutSessionResponse> {
    return this.request<BachsCreateCheckoutSessionResponse>(
      'POST',
      '/checkout-sessions',
      {
        body,
        idempotencyKey,
        expectedStatuses: [200, 201],
      },
    );
  }

  async getCheckoutSession(
    checkoutId: string,
  ): Promise<BachsCheckoutSessionResponse> {
    return this.request<BachsCheckoutSessionResponse>(
      'GET',
      `/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      { expectedStatuses: [200] },
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: {
      body?: unknown;
      idempotencyKey?: string;
      expectedStatuses: number[];
    },
  ): Promise<T> {
    const url = `${this.baseUrl()}${BACHS_API_VERSION_PREFIX}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey()}`,
      Accept: 'application/json',
    };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(BACHS_REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const isTimeout =
        err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError');
      console.error(
        `Bachs ${method} ${path} ${isTimeout ? 'timeout' : 'network_error'}`,
      );
      throw new BachsProviderError(
        isTimeout ? 'TIMEOUT' : 'NETWORK',
        isTimeout ? 'Bachs request timed out' : 'Bachs network error',
        { cause: err },
      );
    }

    if (!opts.expectedStatuses.includes(response.status)) {
      let providerErrorCode: string | undefined;
      try {
        const errBody = (await response.json()) as BachsErrorBody;
        providerErrorCode = errBody.error_code;
      } catch {
        // ignore parse errors
      }
      console.error(
        `Bachs ${method} ${path} status=${response.status} code=${providerErrorCode ?? 'none'}`,
      );
      throw new BachsProviderError(
        mapHttpStatusToKind(response.status),
        `Bachs API error (${response.status})`,
        { httpStatus: response.status, providerErrorCode },
      );
    }

    return (await response.json()) as T;
  }
}
