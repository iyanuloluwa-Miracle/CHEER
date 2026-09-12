import type {
  CreatorProfile,
  SocialLink,
  SocialPlatform,
} from '../../db/schema';
import { decimalToAmountString } from '../tips/tips.types';

export interface CreatorSocialLinkDto {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string | null;
  sortOrder: number;
}

export interface CreatorProfileDto {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  supportMessage: string | null;
  currency: string;
  suggestedTipAmounts: string[];
  isActive: boolean;
  goalTitle: string | null;
  goalTargetAmount: string | null;
  goalActive: boolean;
  socialLinks: CreatorSocialLinkDto[];
  publicPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsernameAvailabilityDto {
  username: string;
  available: boolean;
  reason?: 'INVALID_FORMAT' | 'RESERVED' | 'TOO_SHORT' | 'TOO_LONG' | 'TAKEN';
}

export interface SocialLinkInput {
  platform: SocialPlatform;
  url: string;
  label?: string;
  sortOrder?: number;
}

export interface CreateCreatorInput {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  supportMessage?: string;
  currency?: string;
  suggestedTipAmounts?: string[];
  socialLinks?: SocialLinkInput[];
}

export interface UpdateCreatorProfileInput {
  username?: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateCreatorSettingsInput {
  supportMessage?: string | null;
  currency?: string;
  suggestedTipAmounts?: string[];
  goalTitle?: string | null;
  goalTargetAmount?: string | null;
  goalActive?: boolean;
}

export interface ReplaceSocialLinksInput {
  links: SocialLinkInput[];
}

export function parseSuggestedTipAmounts(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((v): v is string => typeof v === 'string');
}

export function toCreatorProfileDto(
  profile: CreatorProfile & { socialLinks?: SocialLink[] },
): CreatorProfileDto {
  const links = [...(profile.socialLinks ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    supportMessage: profile.supportMessage,
    currency: profile.currency,
    suggestedTipAmounts: parseSuggestedTipAmounts(profile.suggestedTipAmounts),
    isActive: profile.isActive,
    goalTitle: profile.goalTitle ?? null,
    goalTargetAmount: profile.goalTargetAmount
      ? decimalToAmountString(profile.goalTargetAmount)
      : null,
    goalActive: Boolean(profile.goalActive),
    socialLinks: links.map((link) => ({
      id: link.id,
      platform: link.platform,
      url: link.url,
      label: link.label,
      sortOrder: link.sortOrder,
    })),
    publicPath: `/${profile.username}`,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
