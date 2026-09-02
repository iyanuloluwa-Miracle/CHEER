import { createApiClient } from '~/services/api';

export function useApi() {
  const config = useRuntimeConfig();
  const client = createApiClient(config.public.apiUrl as string);
  return client;
}
