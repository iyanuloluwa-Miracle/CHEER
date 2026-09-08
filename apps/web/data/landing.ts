import type {
  CtaLink,
  FaqItem,
  FeatureItem,
  HowItWorksStep,
  StackTool,
  Testimonial,
  TrustItem,
} from '~/types/landing';

export const heroContent = {
  title: 'One link for everyone who wants to support your work.',
  description:
    'TippyMe helps African creators and builders receive personal support — without sending a bank account to every fan.',
  primaryCta: { label: 'Get started', to: '/signup' } satisfies CtaLink,
  secondaryCta: { label: 'How it works', to: '/#how-it-works' } satisfies CtaLink,
} as const;

export const problemSection = {
  id: 'problem',
  eyebrow: 'The problem',
  title: 'Support shouldn’t mean sharing your bank details',
  description:
    'When someone wants to thank you for your work, the options are awkward transfers, scattered payment apps, or pasting account numbers in DMs.',
  points: [
    {
      id: 'bank-dms',
      title: 'Bank details in chats',
      description:
        'Account numbers get copied into WhatsApp, X, and email — then sit around forever.',
      illustration: '/problem/bank-chats.png',
      illustrationAlt: 'Phone chat showing bank account details shared in a message',
    },
    {
      id: 'scattered-tools',
      title: 'Too many tools',
      description:
        'Different platforms for tips, invoices, and messages make it hard for supporters to help.',
      illustration: '/problem/too-many-tools.png',
      illustrationAlt: 'Person surrounded by scattered payment apps and tools',
    },
    {
      id: 'not-just-influencers',
      title: 'Not only for influencers',
      description:
        'Builders, writers, researchers, and community organizers deserve a simple support page too.',
      illustration: '/problem/makers.png',
      illustrationAlt: 'Diverse makers including a developer, writer, and researcher',
    },
  ],
} as const;

export const howItWorksSection = {
  id: 'how-it-works',
  eyebrow: 'How it works',
  title: 'Three steps to start receiving support',
  description:
    'Set up once, share everywhere, and let people support you on their own terms.',
} as const;

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    title: 'Create your TippyMe link',
    description:
      'Sign up, add your name and photo, and get a personal link like tippy.me/you — ready in minutes.',
    visual: 'create',
    visualCaption: 'Preview of creating a TippyMe profile and personal link',
    visualTheme: 'light',
    illustration: '/cheer-step-one.svg',
  },
  {
    title: 'Share it anywhere',
    description:
      'Drop it in your bio, WhatsApp status, newsletter, or DMs. Supporters never need your bank details.',
    visual: 'share',
    visualCaption: 'Preview of sharing a TippyMe link across social platforms',
    visualTheme: 'light',
    illustration: '/Social%20media-bro.svg',
  },
  {
    title: 'Receive support and messages',
    description:
      'People pick an amount, leave a kind note, and pay securely. You see support and messages in your dashboard.',
    visual: 'receive',
    visualCaption: 'Preview of someone sending support through TippyMe',
    visualTheme: 'light',
    illustration: '/Online%20transactions-bro.svg',
  },
] as const;

export const featuresSection = {
  id: 'features',
  eyebrow: 'Features',
  title: 'Built for people who make things',
  description:
    'A personal page for support — not a marketplace, not a payment app for influencers only.',
} as const;

export const featureItems: readonly FeatureItem[] = [
  {
    id: 'one-link',
    title: 'One link, everywhere',
    description:
      'Share a single Tippy page across WhatsApp, X, Instagram, TikTok, LinkedIn, and your site.',
    illustration: '/features/one-link.png',
    illustrationAlt: 'One personal link shared across social platforms',
  },
  {
    id: 'messages',
    title: 'Support with a message',
    description:
      'Supporters can leave a note with their tip so gratitude stays personal.',
    illustration: '/features/message.png',
    illustrationAlt: 'Tip with a personal thank-you message',
  },
  {
    id: 'no-account',
    title: 'No account for supporters',
    description:
      'Anyone with your link can choose an amount and continue to secure checkout.',
    illustration: '/features/no-account.png',
    illustrationAlt: 'Supporter sending support without creating an account',
  },
  {
    id: 'dashboard',
    title: 'Clear creator dashboard',
    description:
      'See successful support, recent messages, and settlement status in one place.',
    illustration: '/features/dashboard.png',
    illustrationAlt: 'Creator dashboard showing support totals and messages',
  },
  {
    id: 'your-amounts',
    title: 'Your suggested amounts',
    description:
      'Set tip presets that fit your audience — plus room for custom amounts.',
    illustration: '/features/amounts.png',
    illustrationAlt: 'Suggested tip amount buttons and custom amount option',
  },
  {
    id: 'for-builders',
    title: 'For every kind of maker',
    description:
      'Developers, designers, writers, artists, researchers, podcasters, and African builders.',
    illustration: '/features/makers.png',
    illustrationAlt: 'Diverse makers including developers, writers, and creators',
  },
] as const;

export const audienceLabels: readonly string[] = [
  'Developers',
  'Creators',
  'Designers',
  'Writers',
  'Artists',
  'Open-source contributors',
  'Researchers',
  'Podcasters',
  'Community builders',
  'Indie hackers',
  'African builders',
] as const;

export const trustSection = {
  id: 'trust',
  eyebrow: 'Trust & security',
  title: 'Payments handled carefully',
  description:
    'TippyMe is your page and dashboard. Card and payout flows are processed through Bachs — we do not store full card numbers on TippyMe.',
} as const;

export const trustItems: readonly TrustItem[] = [
  {
    id: 'secure-payments',
    title: 'Secure payments',
    description:
      'Supporters complete payment on Bachs checkout. TippyMe confirms support only after payment is verified.',
  },
  {
    id: 'bachs',
    title: 'Processed through Bachs',
    description:
      'Checkout and settlement run on Bachs infrastructure. TippyMe is not a bank and does not hold balances for you.',
  },
  {
    id: 'privacy',
    title: 'Privacy by design',
    description:
      'Supporter email is used for checkout. Anonymous tips keep names off your public page and recent messages.',
  },
  {
    id: 'responsible',
    title: 'Responsible handling',
    description:
      'We limit access to payment data and rely on Bachs for sensitive financial processing. See Terms and Privacy for details.',
  },
] as const;

export const finalCtaSection = {
  id: 'get-started',
  title: 'Ready for one link that represents your work?',
  description:
    'Create your Tippy, share it anywhere people already follow you, and receive support without pasting bank details.',
  primaryCta: { label: 'Create your Tippy', to: '/signup' } satisfies CtaLink,
  secondaryCta: { label: 'Log in', to: '/login' } satisfies CtaLink,
} as const;

export const faqSection = {
  id: 'faq',
  eyebrow: 'FAQ',
  title: 'Questions, answered',
  description:
    'How TippyMe works for makers and the people who want to support them.',
} as const;

export const faqItems: readonly FaqItem[] = [
  {
    id: 'what-is-tippyme',
    question: 'What is TippyMe?',
    answer:
      'TippyMe is one link for everyone who wants to support your work. Share a personal page — like tippy.me/you — so people can send support and messages without needing your bank details.',
  },
  {
    id: 'who-is-it-for',
    question: 'Who is TippyMe for?',
    answer:
      'Developers, creators, designers, writers, artists, open-source contributors, researchers, podcasters, community builders, indie hackers, and African builders — anyone people already want to support.',
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
      'Yes. Supporters can tip without showing their name, and still leave a kind message if they want.',
  },
  {
    id: 'how-paid',
    question: 'How do I get paid?',
    answer:
      'Payments are processed by Bachs. TippyMe is the creator page, messages, and dashboard — Bachs moves the money to you.',
  },
  {
    id: 'share-link',
    question: 'How do I share my TippyMe link?',
    answer:
      'Drop it in WhatsApp, X, Instagram, TikTok, LinkedIn, your newsletter, or DMs. Set up once and share everywhere.',
  },
];

export const testimonialsSection = {
  id: 'stories',
  eyebrow: 'Voices',
  title: 'Support that feels personal',
  description:
    'Makers share one link — and hear from the people who believe in their work.',
} as const;

export const testimonials: readonly Testimonial[] = [
  {
    id: 'amara',
    quote:
      'I used to paste my account number in DMs. Now I drop one link in my bio and support just shows up.',
    name: 'Amara Okonkwo',
    role: 'Writer',
    location: 'Lagos',
    photo: '/testimonials/amara.jpg',
  },
  {
    id: 'kofi',
    quote:
      'My newsletter readers finally had a way to say thanks without the awkward transfer.',
    name: 'Kofi Mensah',
    role: 'Designer',
    location: 'Accra',
    photo: '/testimonials/kofi.jpg',
  },
  {
    id: 'naledi',
    quote:
      'Fans leave the kindest messages with their tips. It feels personal, not like a payment app.',
    name: 'Naledi Moyo',
    role: 'Musician',
    location: 'Johannesburg',
    photo: '/testimonials/naledi.jpg',
  },
];

export const stackSection = {
  id: 'stack',
  eyebrow: 'Built with',
  title: 'The AIB Ship partners behind TippyMe',
  description:
    'African infrastructure for payments, messaging, local webhooks, and deployment.',
} as const;

/** Africa Is Building partner services — front and center for hackathon demos. */
export const stackPartners: readonly StackTool[] = [
  {
    id: 'bachs',
    name: 'Bachs',
    role: 'Payments, checkout, and creator payouts',
    href: 'https://docs.bachs.io',
  },
  {
    id: 'sendbyte',
    name: 'SendByte',
    role: 'Email OTP and transactional messages',
    href: 'https://docs.sendbyte.africa',
  },
  {
    id: 'outray',
    name: 'OutRay',
    role: 'Local HTTPS tunnel for Bachs webhooks',
    href: 'https://outray.dev/docs',
  },
  {
    id: 'pxxl',
    name: 'Pxxl',
    role: 'Cloud deployment for web, API, and databases',
    href: 'https://docs.pxxl.app',
  },
] as const;
