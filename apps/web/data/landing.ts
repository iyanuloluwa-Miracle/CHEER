import type { CtaLink, HowItWorksStep } from '~/types/landing';

export const heroContent = {
  title: 'One link for everyone who wants to support your work.',
  description:
    'Cheer helps African creators and builders receive personal support — without sending a bank account to every fan.',
  primaryCta: { label: 'Get started', to: '/signup' } satisfies CtaLink,
  secondaryCta: { label: 'How it works', to: '/#how-it-works' } satisfies CtaLink,
} as const;

export const howItWorksSection = {
  id: 'how-it-works',
  eyebrow: 'How it works',
  title: 'Three steps to start receiving support',
  description:
    'Set up once, share everywhere, and let fans support you on their own terms.',
} as const;

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    title: 'Create your Cheer link',
    description:
      'Sign up, add your name and photo, and get a personal link like cheer.cash/you — ready in minutes.',
    visual: 'create',
    visualCaption: 'Preview of creating a Cheer profile and personal link',
    visualTheme: 'light',
    illustration: '/cheer-step-one.svg',
  },
  {
    title: 'Share it anywhere',
    description:
      'Drop it in your bio, stories, newsletter, or DMs. Fans support you without ever needing your bank details.',
    visual: 'share',
    visualCaption: 'Preview of sharing a Cheer link across social platforms',
    visualTheme: 'light',
  },
  {
    title: 'Receive support instantly',
    description:
      'Fans pick an amount, leave a kind message, and you get paid. Simple, personal, and built for creators.',
    visual: 'receive',
    visualCaption: 'Preview of a fan sending a tip through Cheer',
    visualTheme: 'dark',
  },
] as const;
