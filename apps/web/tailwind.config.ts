import type { Config } from 'tailwindcss';

export default {
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
        },
      },
    },
  },
} satisfies Config;
