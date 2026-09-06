export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database?: 'up' | 'down';
  timestamp: string;
}

export interface PublicUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  hasCreatorProfile: boolean;
}

export type SocialPlatform =
  | 'X'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'GITHUB'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'WEBSITE'
  | 'OTHER';

export interface CreatorSocialLink {
  id?: string;
  platform: SocialPlatform;
  url: string;
  label?: string | null;
  sortOrder?: number;
}

export interface CreatorProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  supportMessage: string | null;
  currency: string;
  suggestedTipAmounts: string[];
  isActive: boolean;
  socialLinks: CreatorSocialLink[];
  publicPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason?: 'INVALID_FORMAT' | 'RESERVED' | 'TOO_SHORT' | 'TOO_LONG' | 'TAKEN';
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path?: string;
  timestamp?: string;
  retryAfterSeconds?: number;
}
