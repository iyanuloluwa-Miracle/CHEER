import type {
  HealthResponse,
  PublicUser,
  ApiErrorBody,
  CreatorProfile,
  UsernameAvailability,
  CreatorSocialLink,
} from '~/types/api';

export class ApiClientError extends Error {
  statusCode: number;
  errorCode: string;
  retryAfterSeconds?: number;

  constructor(
    statusCode: number,
    message: string,
    errorCode: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Thin API client for NestJS. Public runtime config only — no secrets.
 * Credentials: include for httpOnly session cookies.
 */
export function createApiClient(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      let message = response.statusText;
      let errorCode = 'REQUEST_FAILED';
      let retryAfterSeconds: number | undefined;

      try {
        const body = (await response.json()) as ApiErrorBody;
        if (body.message) {
          message = Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message;
        }
        if (body.error) {
          errorCode = body.error;
        }
        if (typeof body.retryAfterSeconds === 'number') {
          retryAfterSeconds = body.retryAfterSeconds;
        }
      } catch {
        // ignore JSON parse errors
      }

      throw new ApiClientError(
        response.status,
        message,
        errorCode,
        retryAfterSeconds,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    getHealth: () => request<HealthResponse>('/api/health'),

    requestOtp: (email: string) =>
      request<{
        ok: true;
        expiresInSeconds: number;
        resendAvailableInSeconds: number;
      }>('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'LOGIN' }),
      }),

    verifyOtp: (email: string, code: string) =>
      request<{ ok: true; user: PublicUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code, purpose: 'LOGIN' }),
      }),

    getMe: () => request<{ user: PublicUser | null }>('/api/auth/me'),

    logout: () =>
      request<{ ok: true }>('/api/auth/logout', {
        method: 'POST',
      }),

    checkUsername: (username: string) =>
      request<UsernameAvailability>(
        `/api/creators/username-available?username=${encodeURIComponent(username)}`,
      ),

    getMyCreator: () =>
      request<{ profile: CreatorProfile | null }>('/api/creators/me'),

    createCreator: (payload: {
      username: string;
      displayName: string;
      bio?: string;
      avatarUrl?: string;
      supportMessage?: string;
      currency?: string;
      suggestedTipAmounts?: string[];
      socialLinks?: Omit<CreatorSocialLink, 'id'>[];
    }) =>
      request<{ profile: CreatorProfile }>('/api/creators', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    updateMyCreator: (payload: {
      username?: string;
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
    }) =>
      request<{ profile: CreatorProfile }>('/api/creators/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    updateMyCreatorSettings: (payload: {
      supportMessage?: string | null;
      currency?: string;
      suggestedTipAmounts?: string[];
    }) =>
      request<{ profile: CreatorProfile }>('/api/creators/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    replaceMySocialLinks: (links: Omit<CreatorSocialLink, 'id'>[]) =>
      request<{ profile: CreatorProfile }>('/api/creators/me/social-links', {
        method: 'PUT',
        body: JSON.stringify({ links }),
      }),

    getCreatorByUsername: (username: string) =>
      request<{ profile: CreatorProfile }>(
        `/api/creators/${encodeURIComponent(username)}`,
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
