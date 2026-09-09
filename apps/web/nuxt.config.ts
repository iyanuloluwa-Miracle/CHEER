// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Disable heavy DevTools UI in production builds
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only: SSR / Nitro → Nest (never sent to the browser).
    apiInternalUrl:
      process.env.API_INTERNAL_URL ||
      process.env.NUXT_PUBLIC_API_PROXY_TARGET ||
      'http://127.0.0.1:3001',
    public: {
      // Empty → browser uses same-origin `/api` (cookie-safe with reverse proxy).
      // Set only when intentionally calling a same-origin absolute API base.
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  // Proxy `/api` → Nest. In production set NUXT_PUBLIC_API_PROXY_TARGET / API_INTERNAL_URL
  // to the internal Nest service (e.g. http://api:3001). OutRay is never used here.
  routeRules: {
    '/api/**': {
      proxy: `${process.env.NUXT_PUBLIC_API_PROXY_TARGET || process.env.API_INTERNAL_URL || 'http://127.0.0.1:3001'}/api/**`,
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
          rel: 'preconnect', href: 'https://fonts.gstatic.com',
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
