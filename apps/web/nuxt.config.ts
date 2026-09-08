// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only secrets would go here — none for Phase 2
    public: {
      // Dev default is empty → browser calls same-origin `/api` (see routeRules proxy).
      // Cross-origin localhost↔127.0.0.1 drops the httpOnly session cookie.
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  // Local Nest API. Same-origin `/api` keeps tippyme_session cookies working in the browser.
  routeRules: {
    '/api/**': { proxy: `${process.env.NUXT_PUBLIC_API_PROXY_TARGET || 'http://localhost:3001'}/api/**` },
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
