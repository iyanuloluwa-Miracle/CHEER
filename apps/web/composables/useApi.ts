import { createApiClient } from '~/services/api';

function resolveApiBase(configured: string): string {
  const trimmed = configured.replace(/\/$/, '');

  // Browser: prefer same-origin so the Nest session cookie is first-party.
  // localhost and 127.0.0.1 are different sites — cross-origin cookies fail.
  if (import.meta.client) {
    if (!trimmed) return '';
    try {
      const apiOrigin = new URL(trimmed, window.location.origin).origin;
      if (apiOrigin !== window.location.origin) {
        return '';
      }
    } catch {
      return '';
    }
  }

  return trimmed || 'http://localhost:3001';
}

export function useApi() {
  const config = useRuntimeConfig();
  const client = createApiClient(
    resolveApiBase(String(config.public.apiUrl ?? '')),
  );
  return client;
}
