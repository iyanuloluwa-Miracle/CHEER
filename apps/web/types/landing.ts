export type HowItWorksVisualType = 'create' | 'share' | 'receive';

export interface NavLink {
  label: string;
  to: string;
}

export interface CtaLink {
  label: string;
  to: string;
}

export interface HowItWorksStep {
  title: string;
  description: string;
  visual: HowItWorksVisualType;
  visualCaption: string;
  visualTheme: 'light' | 'dark';
  /** When set, render this image directly (no mock browser frame). */
  illustration?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  location: string;
  photo: string;
}

export interface StackTool {
  id: string;
  name: string;
  role: string;
  href?: string;
}
