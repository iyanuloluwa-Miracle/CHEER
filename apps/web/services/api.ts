import type { HealthResponse } from '~/types/api';

/**
 * Thin API client for NestJS. Public runtime config only — no secrets.
 */
export function createApiClient(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = (await response.json()) as { message?: string | string[] };
        if (body.message) {
          detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        }
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(`API ${response.status}: ${detail}`);
    }

    return (await response.json()) as T;
  }

  return {
    getHealth: () => request<HealthResponse>('/api/health'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
