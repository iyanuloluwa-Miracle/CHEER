import type { NavLink } from '~/types/landing';

export const sectionLinks: readonly NavLink[] = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Stack', to: '/#stack' },
  { label: 'FAQ', to: '/#faq' },
] as const;

export const loginLink: NavLink = { label: 'Log in', to: '/login' };

export const signupLink: NavLink = { label: 'Get started', to: '/signup' };

export const dashboardLink: NavLink = { label: 'Dashboard', to: '/dashboard' };

export const dashboardNavLinks: readonly NavLink[] = [
  { label: 'Overview', to: '/dashboard' },
] as const;

export const mobileNavLinks: readonly NavLink[] = [...sectionLinks, loginLink];

export const mobileAuthedNavLinks: readonly NavLink[] = [
  ...sectionLinks,
  dashboardLink,
];

export const footerLinks: readonly NavLink[] = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Stack', to: '/#stack' },
  { label: 'FAQ', to: '/#faq' },
] as const;
