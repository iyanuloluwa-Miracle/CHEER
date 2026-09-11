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
  /** Destination charge — seller Connect account receives sale minus platform_fee. */
  transfer_data?: { destination: string; amount?: string };
  /** Platform cut as decimal string (same currency precision as amount). */
  platform_fee?: string;
}

/** Documented create-checkout response fields we rely on. */
export interface BachsCreateCheckoutSessionResponse {
  checkout_id: string;
  checkout_url: string;
  status: string;
  expires_at?: string;
  created_at?: string;
  reference?: string | null;
  platform_fee?: string;
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

export interface BachsCreateConnectedAccountBody {
  contact_email: string;
  display_name: string;
  country: string;
  entity_type?: 'individual' | 'company';
  first_name?: string;
  last_name?: string;
  configuration?: {
    recipient?: {
      capabilities?: {
        payouts?: { requested: boolean };
        transfers?: { requested: boolean };
      };
    };
  };
  responsibilities?: {
    fees?: { collector: 'bachs' | 'platform' };
  };
  metadata?: Record<string, string>;
}

export interface BachsConnectedAccountResponse {
  id: string;
  name?: string;
  country?: string;
  enabled_capabilities?: string[];
  capabilities?: Record<
    string,
    { status?: string; requested?: boolean } | undefined
  >;
  is_active?: boolean;
}

export interface BachsCreateAccountLinkBody {
  type: 'onboarding' | 'update';
  refresh_url: string;
  return_url: string;
}

export interface BachsAccountLinkResponse {
  id: string;
  account: string;
  type: string;
  url: string;
  expires_at?: string;
  previous_link_superseded?: boolean;
}

export interface BachsBalanceSettingsBody {
  payout_schedule?: {
    interval: 'manual' | 'instant' | 'daily' | 'weekly' | 'monthly';
    weekly_payout_days?: string[];
  };
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

  async createConnectedAccount(
    body: BachsCreateConnectedAccountBody,
    idempotencyKey: string,
  ): Promise<BachsConnectedAccountResponse> {
    return this.request<BachsConnectedAccountResponse>('POST', '/accounts', {
      body,
      idempotencyKey,
      expectedStatuses: [200, 201],
    });
  }

  async getConnectedAccount(
    accountId: string,
  ): Promise<BachsConnectedAccountResponse> {
    return this.request<BachsConnectedAccountResponse>(
      'GET',
      `/accounts/${encodeURIComponent(accountId)}`,
      { expectedStatuses: [200] },
    );
  }

  async createAccountLink(
    accountId: string,
    body: BachsCreateAccountLinkBody,
  ): Promise<BachsAccountLinkResponse> {
    return this.request<BachsAccountLinkResponse>(
      'POST',
      `/accounts/${encodeURIComponent(accountId)}/account-links`,
      {
        body,
        expectedStatuses: [200, 201],
      },
    );
  }

  /**
   * Best-effort Friday weekly payout schedule on a Connect balance.
   * Failures are non-fatal — TippyMe still records fridayPayoutEnabled locally
   * when the caller chooses to.
   */
  async updateBalanceSettings(
    accountId: string,
    body: BachsBalanceSettingsBody,
  ): Promise<unknown> {
    return this.request('POST', '/balance_settings', {
      body,
      expectedStatuses: [200, 201],
      accountId,
    });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: {
      body?: unknown;
      idempotencyKey?: string;
      expectedStatuses: number[];
      accountId?: string;
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
    if (opts.accountId) {
      headers['X-Account-Id'] = opts.accountId;
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
