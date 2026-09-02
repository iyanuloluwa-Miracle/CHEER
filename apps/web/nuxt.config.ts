// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only secrets would go here — none for Phase 2
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  app: {
    head: {
      title: 'Cheer',
      meta: [
        {
          name: 'description',
          content: 'One link for everyone who wants to support your work.',
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      htmlAttrs: { lang: 'en' },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
});
