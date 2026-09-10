/**
 * Injects the Sabilytics tracking snippet when public env is configured.
 * Loads after idle so it does not compete with tip-page first paint.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const siteId = String(config.public.sabilyticsSiteId || '').trim();
  const scriptUrl = String(config.public.sabilyticsScriptUrl || '').trim();
  const domain = String(config.public.sabilyticsDomain || '').trim();

  if (!siteId || !scriptUrl || !import.meta.client) {
    return;
  }

  const inject = () => {
    useHead({
      script: [
        {
          key: 'sabilytics',
          src: scriptUrl,
          defer: true,
          async: true,
          'data-site': siteId,
          ...(domain ? { 'data-domain': domain } : {}),
        },
      ],
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => inject(), { timeout: 2500 });
  } else {
    window.setTimeout(inject, 1200);
  }
});
