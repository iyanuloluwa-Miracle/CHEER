import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Darker Grotesque"', 'sans-serif'],
      },
      colors: {
        cheer: {
          ink: 'var(--cheer-ink)',
          leaf: 'var(--cheer-leaf)',
          mint: 'var(--cheer-mint)',
          sand: 'var(--cheer-sand)',
          glow: 'var(--cheer-glow)',
          panel: 'var(--cheer-panel)',
          'panel-deep': 'var(--cheer-panel-deep)',
          'panel-mid': 'var(--cheer-panel-mid)',
        },
      },
    },
  },
} satisfies Config;
