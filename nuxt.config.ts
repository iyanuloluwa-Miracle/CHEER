// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Disable heavy DevTools UI in production builds
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only secrets / config (Nitro owns /api — no Nest proxy).
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    authSecret: process.env.AUTH_SECRET || '',
    otpHashPepper: process.env.OTP_HASH_PEPPER || '',
    apiUrl: process.env.API_URL || process.env.APP_URL || 'http://localhost:3000',
    bachsApiKey: process.env.BACHS_API_KEY || '',
    bachsApiBaseUrl:
      process.env.BACHS_API_BASE_URL || 'https://sandbox-api.bachs.io',
    bachsWebhookSecret: process.env.BACHS_WEBHOOK_SECRET || '',
    sendbyteApiKey: process.env.SENDBYTE_API_KEY || '',
    sendbyteWebhookSecret: process.env.SENDBYTE_WEBHOOK_SECRET || '',
    sendbyteFromEmail:
      process.env.SENDBYTE_FROM_EMAIL || 'TippyMe <noreply@example.com>',
    logFormat: process.env.LOG_FORMAT || '',
    errorMonitoringDsn: process.env.ERROR_MONITORING_DSN || '',
    public: {
      // Empty → browser uses same-origin `/api` (Nitro handlers).
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
    },
  },

  app: {
    head: {
      title: 'TippyMe',
      meta: [
        {
          name: 'description',
          content:
            'One link for everyone who wants to support your work. TippyMe gives you a simple page to receive support and messages.',
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1f6b4a' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800&display=swap',
        },
      ],
      htmlAttrs: { lang: 'en' },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
});
