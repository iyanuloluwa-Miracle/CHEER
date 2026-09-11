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
  primaryCta: { label: 'Claim your link', to: '/signup' } satisfies CtaLink,
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
      illustration: '/illustrations/problem-bank.png',
      illustrationAlt: 'Phone chat showing bank account details shared in a message',
    },
    {
      id: 'scattered-tools',
      title: 'Too many tools',
      description:
        'Different platforms for tips, invoices, and messages make it hard for supporters to help.',
      illustration: '/illustrations/problem-tools.png',
      illustrationAlt: 'Person surrounded by scattered payment apps and tools',
    },
    {
      id: 'not-just-influencers',
      title: 'Not only for influencers',
      description:
        'Builders, writers, researchers, and community organizers deserve a simple support page too.',
      illustration: '/illustrations/problem-makers.png',
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
    illustration: '/illustrations/hero.png',
  },
  {
    title: 'Share it anywhere',
    description:
      'Drop it in your bio, WhatsApp status, newsletter, or DMs. Supporters never need your bank details.',
    visual: 'share',
    visualCaption: 'Preview of sharing a TippyMe link across social platforms',
    visualTheme: 'light',
    illustration: '/illustrations/problem-tools.png',
  },
  {
    title: 'Receive support and messages',
    description:
      'People pick an amount, leave a kind note, and pay securely. You see support and messages in your dashboard.',
    visual: 'receive',
    visualCaption: 'Preview of someone sending support through TippyMe',
    visualTheme: 'light',
    illustration: '/illustrations/feature-dashboard.png',
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
    illustration: '/illustrations/feature-one-link.png',
    illustrationAlt: 'One personal link shared across social platforms',
  },
  {
    id: 'messages',
    title: 'Support with a message',
    description:
      'Supporters can leave a note with their tip so gratitude stays personal.',
    illustration: '/illustrations/feature-message.png',
    illustrationAlt: 'Tip with a personal thank-you message',
  },
  {
    id: 'no-account',
    title: 'No account for supporters',
    description:
      'Anyone with your link can choose an amount and continue to secure checkout.',
    illustration: '/illustrations/feature-no-account.png',
    illustrationAlt: 'Supporter sending support without creating an account',
  },
  {
    id: 'dashboard',
    title: 'Clear creator dashboard',
    description:
      'See successful support, recent messages, and settlement status in one place.',
    illustration: '/illustrations/feature-dashboard.png',
    illustrationAlt: 'Creator dashboard showing support totals and messages',
  },
  {
    id: 'your-amounts',
    title: 'Your suggested amounts',
    description:
      'Set tip presets that fit your audience — plus room for custom amounts.',
    illustration: '/illustrations/feature-amounts.png',
    illustrationAlt: 'Suggested tip amount buttons and custom amount option',
  },
  {
    id: 'for-builders',
    title: 'For every kind of maker',
    description:
      'Developers, designers, writers, artists, researchers, podcasters, and African builders.',
    illustration: '/illustrations/feature-makers.png',
    illustrationAlt: 'Diverse makers including developers, writers, and creators',
  },
] as const;

/** Audience avatars for the hero DiceBear scatter (kept inset so they don’t clip). */
export const audienceItems = [
  { label: 'Developers', seed: 'tippy-developers', top: '4%', left: '10%', size: 48, delay: '0s' },
  { label: 'Creators', seed: 'tippy-creators', top: '6%', left: '90%', size: 44, delay: '0.35s' },
  { label: 'Designers', seed: 'tippy-designers', top: '30%', left: '6%', size: 42, delay: '0.7s' },
  { label: 'Writers', seed: 'tippy-writers', top: '26%', left: '94%', size: 44, delay: '1.05s' },
  { label: 'Artists', seed: 'tippy-artists', top: '56%', left: '8%', size: 40, delay: '0.2s' },
  {
    label: 'Open-source contributors',
    seed: 'tippy-opensource',
    top: '52%',
    left: '92%',
    size: 46,
    delay: '0.55s',
  },
  { label: 'Researchers', seed: 'tippy-researchers', top: '78%', left: '12%', size: 40, delay: '1.25s' },
  { label: 'Podcasters', seed: 'tippy-podcasters', top: '80%', left: '88%', size: 42, delay: '0.9s' },
  {
    label: 'Community builders',
    seed: 'tippy-community',
    top: '42%',
    left: '4%',
    size: 44,
    delay: '1.4s',
  },
  { label: 'Indie hackers', seed: 'tippy-indie', top: '68%', left: '96%', size: 40, delay: '0.3s' },
] as const;

export const audienceLabels: readonly string[] = audienceItems.map((item) => item.label);

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
      'Checkout and settlement run on Bachs infrastructure. Automatic Friday payouts via Bachs Connect are coming — TippyMe is not a bank and does not hold balances for you.',
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
      'Payments are processed by Bachs. TippyMe is the creator page, messages, and dashboard — not a bank. Automatic Friday payouts via Bachs Connect are coming when Connect settlement is enabled; TippyMe does not hold a withdrawable balance.',
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
