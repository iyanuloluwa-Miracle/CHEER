/**
 * Injects the Sabilytics tracking snippet when public env is configured.
 * No-op when site ID or script URL is missing (local/dev safe).
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const siteId = String(config.public.sabilyticsSiteId || '').trim();
  const scriptUrl = String(config.public.sabilyticsScriptUrl || '').trim();
  const domain = String(config.public.sabilyticsDomain || '').trim();

  if (!siteId || !scriptUrl) {
    return;
  }

  useHead({
    script: [
      {
        key: 'sabilytics',
        src: scriptUrl,
        async: true,
        'data-site': siteId,
        ...(domain ? { 'data-domain': domain } : {}),
      },
    ],
  });
});
