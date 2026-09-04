import type { CtaLink, FaqItem, HowItWorksStep } from '~/types/landing';

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
    illustration: '/Social%20media-bro.svg',
  },
  {
    title: 'Receive support instantly',
    description:
      'Fans pick an amount, leave a kind message, and you get paid. Simple, personal, and built for creators.',
    visual: 'receive',
    visualCaption: 'Preview of a fan sending a tip through Cheer',
    visualTheme: 'light',
    illustration: '/Online%20transactions-bro.svg',
  },
] as const;

export const faqSection = {
  id: 'faq',
  eyebrow: 'FAQ',
  title: 'Questions, answered',
  description:
    'How Cheer works for creators and the people who want to support them.',
} as const;

export const faqItems: readonly FaqItem[] = [
  {
    id: 'what-is-cheer',
    question: 'What is Cheer?',
    answer:
      'Cheer is one link for everyone who wants to support your work. African creators and builders share a personal page — like cheer.cash/you — so fans can send support without ever needing your bank details.',
  },
  {
    id: 'who-is-it-for',
    question: 'Who is Cheer for?',
    answer:
      'Creators, builders, and makers across Africa who want a simple way to receive personal support. If people already ask how to send you money, Cheer is for you.',
  },
  {
    id: 'supporter-account',
    question: 'Do supporters need an account?',
    answer:
      'No. Anyone with your link can choose an amount, leave an optional message, and pay — no signup required.',
  },
  {
    id: 'anonymous',
    question: 'Can someone support me anonymously?',
    answer:
      'Yes. Supporters can send a tip without showing their name, and still leave a kind message if they want.',
  },
  {
    id: 'how-paid',
    question: 'How do I get paid?',
    answer:
      'Payments are processed by Bachs. Cheer is the creator page, messages, and dashboard — Bachs moves the money to you.',
  },
  {
    id: 'share-link',
    question: 'How do I share my Cheer link?',
    answer:
      'Drop it in your bio, stories, newsletter, or DMs. Set up once, share everywhere, and let fans support you on their own terms.',
  },
];
