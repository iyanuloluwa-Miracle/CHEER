import { createApiClient } from '~/services/api';

function resolveBrowserBase(configured: string): string {
  const trimmed = configured.replace(/\/$/, '');

  // Prefer same-origin `/api` so the Nest session cookie stays first-party.
  // Recommended production: reverse-proxy `/api` → Nest (leave NUXT_PUBLIC_API_URL empty).
  if (!trimmed) return '';
  try {
    const apiOrigin = new URL(trimmed, window.location.origin).origin;
    if (apiOrigin !== window.location.origin) {
      return '';
    }
  } catch {
    return '';
  }
  return trimmed;
}

export function useApi() {
  const config = useRuntimeConfig();
  const publicUrl = String(config.public.apiUrl ?? '');
  const internalUrl = String(config.apiInternalUrl ?? '');

  let base: string;
  if (import.meta.server) {
    // SSR talks to Nest over the internal network (or absolute public API URL).
    base =
      publicUrl.replace(/\/$/, '') ||
      internalUrl.replace(/\/$/, '') ||
      'http://127.0.0.1:3001';
  } else {
    base = resolveBrowserBase(publicUrl);
  }

  return createApiClient(base);
}
