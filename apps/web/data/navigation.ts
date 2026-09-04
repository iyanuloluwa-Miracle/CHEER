import type { NavLink } from '~/types/landing';

export const sectionLinks: readonly NavLink[] = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'For Creators', to: '/#for-creators' },
  { label: 'FAQ', to: '/#faq' },
] as const;

export const loginLink: NavLink = { label: 'Log in', to: '/login' };

export const signupLink: NavLink = { label: 'Get started', to: '/signup' };

export const mobileNavLinks: readonly NavLink[] = [...sectionLinks, loginLink];
