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
    // Empty default so Docker/build does not bake http://localhost into the image.
    // Runtime: set API_URL or NUXT_API_URL (https in production).
    apiUrl: process.env.API_URL || process.env.APP_URL || process.env.NUXT_API_URL || '',
    bachsApiKey: process.env.BACHS_API_KEY || '',
    bachsApiBaseUrl:
      process.env.BACHS_API_BASE_URL || 'https://sandbox-api.bachs.io',
    bachsWebhookSecret: process.env.BACHS_WEBHOOK_SECRET || '',
    bachsPlatformFeePercent: process.env.BACHS_PLATFORM_FEE_PERCENT || '5',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail:
      process.env.RESEND_FROM_EMAIL || 'TippyMe <noreply@example.com>',
    byteshipApiKey: process.env.BYTESHIP_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterApiBaseUrl:
      process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
    openrouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    logFormat: process.env.LOG_FORMAT || '',
    errorMonitoringDsn: process.env.ERROR_MONITORING_DSN || '',
    public: {
      // Empty → browser uses same-origin `/api` (Nitro handlers).
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
      sabilyticsSiteId: process.env.NUXT_PUBLIC_SABILYTICS_SITE_ID || '',
      sabilyticsDomain: process.env.NUXT_PUBLIC_SABILYTICS_DOMAIN || '',
      sabilyticsScriptUrl: process.env.NUXT_PUBLIC_SABILYTICS_SCRIPT_URL || '',
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
        { name: 'theme-color', content: '#9362ff' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        { rel: 'preconnect', href: 'https://api.dicebear.com', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://api.dicebear.com' },
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

  // Keep Prisma + Neon driver out of the Rollup bundle so the Docker
  // runner's node_modules copies are what actually load at runtime.
  nitro: {
    rollupConfig: {
      external: [
        '@prisma/client',
        '@prisma/adapter-neon',
        '@prisma/driver-adapter-utils',
        '@neondatabase/serverless',
        'postgres-array',
        'ws',
      ],
    },
  },
});
