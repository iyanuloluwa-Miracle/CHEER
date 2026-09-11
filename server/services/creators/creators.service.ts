import { AuditAction, Prisma, SocialPlatform, TipStatus } from '@prisma/client';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
import { usePrisma } from '../../lib/prisma';
import { decimalToAmountString } from '../tips/tips.types';
import type {
  CreateCreatorInput,
  CreatorProfileDto,
  ReplaceSocialLinksInput,
  SocialLinkInput,
  UpdateCreatorProfileInput,
  UpdateCreatorSettingsInput,
  UsernameAvailabilityDto,
} from './creators.types';
import { toCreatorProfileDto } from './creators.types';
import {
  toCreatorTipDto,
  toPublicSupporterNoteDto,
  toSupportGoalDto,
  utcMonthBounds,
  utcWeekBounds,
  type CreatorDashboardDto,
  type CreatorTipsPageDto,
  type ListTipsQuery,
  type PublicCreatorPageDto,
} from './dashboard.types';
import { buildSettlementStatus } from './settlement.types';
import {
  ALLOWED_CURRENCIES,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  MAX_SOCIAL_LINKS,
  MAX_SUGGESTED_TIPS,
  SUPPORT_MESSAGE_MAX,
  normalizeUsername,
  validateUsernameFormat,
  usernameValidationMessage,
  type AllowedCurrency,
} from './username';

const profileInclude = {
  socialLinks: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.CreatorProfileInclude;

const tipWithPaymentInclude = {
  paymentTransaction: { select: { status: true } },
} satisfies Prisma.TipInclude;

const RECENT_TIPS_LIMIT = 8;
const RECENT_MESSAGES_LIMIT = 8;
const PUBLIC_NOTES_LIMIT = 8;

export class CreatorsService {
  constructor(private readonly prisma = usePrisma()) {}

  async checkUsernameAvailability(
    raw: string,
    opts?: { excludeUserId?: string },
  ): Promise<UsernameAvailabilityDto> {
    const format = validateUsernameFormat(raw);
    if (!format.ok) {
      return {
        username: normalizeUsername(raw),
        available: false,
        reason: format.reason,
      };
    }

    const existing = await this.prisma.creatorProfile.findUnique({
      where: { username: format.username },
      select: { userId: true },
    });

    if (existing && existing.userId !== opts?.excludeUserId) {
      return {
        username: format.username,
        available: false,
        reason: 'TAKEN',
      };
    }

    return { username: format.username, available: true };
  }

  async getMe(userId: string): Promise<CreatorProfileDto | null> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });
    return profile ? toCreatorProfileDto(profile) : null;
  }

  async getPublicByUsername(raw: string): Promise<PublicCreatorPageDto> {
    const username = normalizeUsername(raw);
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { username },
      include: profileInclude,
    });

    if (!profile || !profile.isActive) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }

    // Notes only — weekly tip totals stay private on the creator dashboard.
    const [recentNotes, lifetimeAgg] = await Promise.all([
      this.prisma.tip.findMany({
        where: {
          creatorId: profile.id,
          status: TipStatus.PAID,
          message: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: PUBLIC_NOTES_LIMIT,
        select: {
          amount: true,
          currency: true,
          message: true,
          isAnonymous: true,
          supporterName: true,
          createdAt: true,
        },
      }),
      this.prisma.tip.aggregate({
        where: { creatorId: profile.id, status: TipStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    const recentSupporterNotes = recentNotes
      .map((tip) => toPublicSupporterNoteDto(tip as never))
      .filter((note): note is NonNullable<typeof note> => note !== null);

    const week = utcWeekBounds();

    return {
      profile: toCreatorProfileDto(profile),
      tipsThisWeek: {
        sum: '0.00',
        count: 0,
        currency: profile.currency,
        weekKey: week.weekKey,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      },
      supportGoal: toSupportGoalDto(profile, lifetimeAgg._sum.amount),
      recentSupporterNotes,
    };
  }

  async create(
    userId: string,
    dto: CreateCreatorInput,
  ): Promise<CreatorProfileDto> {
    const existing = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(
        409,
        'PROFILE_EXISTS',
        'You already have a creator profile.',
      );
    }

    const username = this.requireValidUsername(dto.username);
    const availability = await this.checkUsernameAvailability(username);
    if (!availability.available) {
      throw this.usernameConflict(availability.reason ?? 'TAKEN');
    }

    const socialLinks = this.normalizeSocialLinks(dto.socialLinks ?? []);
    const suggestedTipAmounts = this.normalizeTipAmounts(
      dto.suggestedTipAmounts ?? ['1000.00', '2500.00', '5000.00'],
    );

    try {
      const profile = await this.prisma.creatorProfile.create({
        data: {
          userId,
          username,
          displayName: dto.displayName.trim(),
          bio: dto.bio?.trim() || null,
          avatarUrl: dto.avatarUrl?.trim() || null,
          supportMessage: dto.supportMessage?.trim() || null,
          currency: (dto.currency ?? 'NGN').toUpperCase(),
          suggestedTipAmounts,
          socialLinks: socialLinks.length
            ? {
                create: socialLinks,
              }
            : undefined,
        },
        include: profileInclude,
      });

      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: AuditAction.PROFILE_UPDATED,
          entityType: 'CreatorProfile',
          entityId: profile.id,
          metadata: { event: 'created', username },
        },
      });

      return toCreatorProfileDto(profile);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ApiError(
          409,
          'USERNAME_TAKEN',
          'That username was just taken. Please choose another.',
        );
      }
      throw err;
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateCreatorProfileInput,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);

    const data: Prisma.CreatorProfileUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = this.requireValidDisplayName(dto.displayName);
    }
    if (dto.bio !== undefined) {
      data.bio =
        dto.bio === null ? null : this.requireValidBio(dto.bio);
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl =
        dto.avatarUrl === null ? null : dto.avatarUrl.trim() || null;
    }
    if (dto.username !== undefined) {
      const username = this.requireValidUsername(dto.username);
      const availability = await this.checkUsernameAvailability(username, {
        excludeUserId: userId,
      });
      if (!availability.available) {
        throw this.usernameConflict(availability.reason ?? 'TAKEN');
      }
      data.username = username;
    }

    try {
      const updated = await this.prisma.creatorProfile.update({
        where: { id: profile.id },
        data,
        include: profileInclude,
      });

      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: AuditAction.PROFILE_UPDATED,
          entityType: 'CreatorProfile',
          entityId: updated.id,
          metadata: { event: 'profile_update' },
        },
      });

      return toCreatorProfileDto(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ApiError(
          409,
          'USERNAME_TAKEN',
          'That username was just taken. Please choose another.',
        );
      }
      throw err;
    }
  }

  async updateSettings(
    userId: string,
    dto: UpdateCreatorSettingsInput,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);

    const data: Prisma.CreatorProfileUpdateInput = {};
    if (dto.supportMessage !== undefined) {
      data.supportMessage =
        dto.supportMessage === null
          ? null
          : this.requireValidSupportMessage(dto.supportMessage);
    }
    if (dto.currency !== undefined) {
      data.currency = this.requireValidCurrency(dto.currency);
    }
    if (dto.suggestedTipAmounts !== undefined) {
      data.suggestedTipAmounts = this.normalizeTipAmounts(
        dto.suggestedTipAmounts,
      );
    }
    if (dto.goalTitle !== undefined) {
      data.goalTitle =
        dto.goalTitle === null ? null : this.requireValidGoalTitle(dto.goalTitle);
    }
    if (dto.goalTargetAmount !== undefined) {
      data.goalTargetAmount =
        dto.goalTargetAmount === null
          ? null
          : this.requireValidGoalAmount(dto.goalTargetAmount);
    }
    if (dto.goalActive !== undefined) {
      data.goalActive = Boolean(dto.goalActive);
    }

    const updated = await this.prisma.creatorProfile.update({
      where: { id: profile.id },
      data,
      include: profileInclude,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'CreatorProfile',
        entityId: updated.id,
        metadata: { event: 'settings_update' },
      },
    });

    return toCreatorProfileDto(updated);
  }

  async replaceSocialLinks(
    userId: string,
    dto: ReplaceSocialLinksInput,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);
    const links = this.normalizeSocialLinks(dto.links);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.socialLink.deleteMany({ where: { creatorId: profile.id } });
      if (links.length > 0) {
        await tx.socialLink.createMany({
          data: links.map((link) => ({
            ...link,
            creatorId: profile.id,
          })),
        });
      }
      return tx.creatorProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: profileInclude,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'CreatorProfile',
        entityId: updated.id,
        metadata: { event: 'social_links_replaced', count: links.length },
      },
    });

    return toCreatorProfileDto(updated);
  }

  /**
   * Creator dashboard aggregates + recent activity.
   * Scoped exclusively to the session user's owned profile (IDOR-safe).
   * Successful totals count TipStatus.PAID only.
   */
  async getDashboard(userId: string): Promise<CreatorDashboardDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        currency: true,
        bachsAccountId: true,
        fridayPayoutEnabled: true,
        goalTitle: true,
        goalTargetAmount: true,
        goalActive: true,
      },
    });
    if (!profile) {
      throw new ApiError(
        404,
        'PROFILE_NOT_FOUND',
        'Create a creator profile first.',
      );
    }

    const creatorId = profile.id;
    const { start, end, periodKey, periodLabel } = utcMonthBounds();
    const week = utcWeekBounds();
    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    const [
      lifetimeAgg,
      periodAgg,
      recentTips,
      recentMessages,
      lifetimeViews,
      weekViews,
    ] = await Promise.all([
      this.prisma.tip.aggregate({
        where: { creatorId, status: TipStatus.PAID },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.tip.aggregate({
        where: {
          creatorId,
          status: TipStatus.PAID,
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.tip.findMany({
        where: { creatorId },
        include: tipWithPaymentInclude,
        orderBy: { createdAt: 'desc' },
        take: RECENT_TIPS_LIMIT,
      }),
      this.prisma.tip.findMany({
        where: {
          creatorId,
          status: TipStatus.PAID,
          message: { not: null },
        },
        include: tipWithPaymentInclude,
        orderBy: { createdAt: 'desc' },
        take: RECENT_MESSAGES_LIMIT,
      }),
      this.prisma.tipPageView.count({ where: { creatorId } }),
      this.prisma.tipPageView.count({
        where: {
          creatorId,
          createdAt: { gte: week.start, lt: week.end },
        },
      }),
    ]);

    const successfulTipCount = lifetimeAgg._count._all;
    const lifetimeViewCount = lifetimeViews;
    const conversionRate =
      lifetimeViewCount > 0
        ? Math.min(1, successfulTipCount / lifetimeViewCount)
        : null;

    return {
      currency: profile.currency,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      publicPath: `/${profile.username}`,
      publicUrl: `${appUrl}/${profile.username}`,
      totals: {
        successfulSupport: decimalToAmountString(
          lifetimeAgg._sum.amount ?? new Prisma.Decimal(0),
        ),
        successfulTipCount,
        periodSupport: decimalToAmountString(
          periodAgg._sum.amount ?? new Prisma.Decimal(0),
        ),
        periodTipCount: periodAgg._count._all,
        periodKey,
        periodLabel,
      },
      linkViews: {
        lifetime: lifetimeViewCount,
        thisWeek: weekViews,
      },
      conversion: {
        viewsToTipsRate: conversionRate,
        /** Percentage 0–100 for UI, null when no views. */
        viewsToTipsPercent:
          conversionRate == null
            ? null
            : Math.round(conversionRate * 1000) / 10,
      },
      supportGoal: toSupportGoalDto(profile, lifetimeAgg._sum.amount),
      recentTips: recentTips.map(toCreatorTipDto),
      recentMessages: recentMessages
        .filter((t) => Boolean(t.message?.trim()))
        .map(toCreatorTipDto),
      settlement: buildSettlementStatus({
        bachsAccountId: profile.bachsAccountId,
        fridayPayoutEnabled: profile.fridayPayoutEnabled,
      }),
    };
  }

  /**
   * Record an anonymous public tip-page view for dashboard link-view counts.
   * Does not store IP, user-agent, or other visitor identifiers.
   */
  async recordTipPageView(raw: string): Promise<{ recorded: true }> {
    const username = normalizeUsername(raw);
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true, isActive: true },
    });

    if (!profile || !profile.isActive) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }

    await this.prisma.tipPageView.create({
      data: { creatorId: profile.id },
    });

    return { recorded: true };
  }

  /**
   * Paginated tip list for the authenticated creator.
   * Always filters by owned creatorId — never trusts client creator/tip ids.
   */
  async listMyTips(
    userId: string,
    query: ListTipsQuery,
  ): Promise<CreatorTipsPageDto> {
    const profile = await this.requireOwnedProfile(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildTipListWhere(profile.id, query);

    const [total, tips] = await Promise.all([
      this.prisma.tip.count({ where }),
      this.prisma.tip.findMany({
        where,
        include: tipWithPaymentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      tips: tips.map(toCreatorTipDto),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private buildTipListWhere(
    creatorId: string,
    query: ListTipsQuery,
  ): Prisma.TipWhereInput {
    const where: Prisma.TipWhereInput = { creatorId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const to = new Date(query.to);
        // If date-only (YYYY-MM-DD), include the full end day in UTC.
        if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
          to.setUTCHours(23, 59, 59, 999);
        }
        where.createdAt.lte = to;
      }
    }

    if (query.minAmount || query.maxAmount) {
      where.amount = {};
      if (query.minAmount) {
        where.amount.gte = new Prisma.Decimal(query.minAmount);
      }
      if (query.maxAmount) {
        where.amount.lte = new Prisma.Decimal(query.maxAmount);
      }
    }

    return where;
  }

  /**
   * Ensures the authenticated user owns this creator id.
   * Never trust a client-supplied userId for ownership.
   */
  async assertOwnsCreator(userId: string, creatorId: string): Promise<void> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { userId: true },
    });
    if (!profile) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }
    if (profile.userId !== userId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have access to this creator profile.',
      );
    }
  }

  private async requireOwnedProfile(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!profile) {
      throw new ApiError(
        404,
        'PROFILE_NOT_FOUND',
        'Create a creator profile first.',
      );
    }
    return profile;
  }

  private requireValidDisplayName(raw: string): string {
    const displayName = raw.trim();
    if (
      displayName.length < DISPLAY_NAME_MIN ||
      displayName.length > DISPLAY_NAME_MAX
    ) {
      throw new ApiError(
        400,
        'INVALID_DISPLAY_NAME',
        `Display name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`,
      );
    }
    return displayName;
  }

  private requireValidBio(raw: string): string | null {
    const bio = raw.trim();
    if (!bio) return null;
    if (bio.length > BIO_MAX) {
      throw new ApiError(
        400,
        'INVALID_BIO',
        `Bio must be at most ${BIO_MAX} characters.`,
      );
    }
    return bio;
  }

  private requireValidSupportMessage(raw: string): string | null {
    const message = raw.trim();
    if (!message) return null;
    if (message.length > SUPPORT_MESSAGE_MAX) {
      throw new ApiError(
        400,
        'INVALID_SUPPORT_MESSAGE',
        `Support message must be at most ${SUPPORT_MESSAGE_MAX} characters.`,
      );
    }
    return message;
  }

  private requireValidGoalTitle(raw: string): string | null {
    const title = raw.trim();
    if (!title) return null;
    if (title.length > 80) {
      throw new ApiError(
        400,
        'INVALID_GOAL_TITLE',
        'Goal title must be at most 80 characters.',
      );
    }
    return title;
  }

  private requireValidGoalAmount(raw: string): Prisma.Decimal {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 100) {
      throw new ApiError(
        400,
        'INVALID_GOAL_AMOUNT',
        'Goal target must be at least 100.00.',
      );
    }
    if (n > 100_000_000) {
      throw new ApiError(
        400,
        'INVALID_GOAL_AMOUNT',
        'Goal target is too large.',
      );
    }
    return new Prisma.Decimal(n.toFixed(2));
  }

  private requireValidCurrency(raw: string): AllowedCurrency {
    const currency = raw.trim().toUpperCase();
    if (
      !(ALLOWED_CURRENCIES as readonly string[]).includes(currency)
    ) {
      throw new ApiError(
        400,
        'INVALID_CURRENCY',
        `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}.`,
      );
    }
    return currency as AllowedCurrency;
  }

  private requireValidUsername(raw: string): string {
    const format = validateUsernameFormat(raw);
    if (!format.ok) {
      throw new ApiError(
        400,
        format.reason,
        usernameValidationMessage(format.reason),
      );
    }
    return format.username;
  }

  private usernameConflict(reason: string): ApiError {
    if (reason === 'RESERVED') {
      return new ApiError(
        400,
        'RESERVED',
        usernameValidationMessage('RESERVED'),
      );
    }
    if (
      reason === 'INVALID_FORMAT' ||
      reason === 'TOO_SHORT' ||
      reason === 'TOO_LONG'
    ) {
      return new ApiError(
        400,
        reason,
        usernameValidationMessage(reason),
      );
    }
    return new ApiError(409, 'USERNAME_TAKEN', 'That username is already taken.');
  }

  private normalizeTipAmounts(amounts: string[]): string[] {
    if (amounts.length > MAX_SUGGESTED_TIPS) {
      throw new ApiError(
        400,
        'TOO_MANY_TIP_AMOUNTS',
        `You can suggest at most ${MAX_SUGGESTED_TIPS} tip amounts.`,
      );
    }
    const normalized = amounts.map((a) => {
      const n = Number(a);
      if (!Number.isFinite(n) || n <= 0) {
        throw new ApiError(
          400,
          'INVALID_TIP_AMOUNT',
          'Suggested tip amounts must be positive numbers.',
        );
      }
      return n.toFixed(2);
    });
    return [...new Set(normalized)];
  }

  private normalizeSocialLinks(links: SocialLinkInput[]) {
    if (links.length > MAX_SOCIAL_LINKS) {
      throw new ApiError(
        400,
        'TOO_MANY_SOCIAL_LINKS',
        `You can add at most ${MAX_SOCIAL_LINKS} social links.`,
      );
    }
    const seen = new Set<string>();
    return links.map((link, index) => {
      const url = link.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new ApiError(
          400,
          'INVALID_SOCIAL_URL',
          'Social links must be http(s) URLs.',
        );
      }
      if (!Object.values(SocialPlatform).includes(link.platform)) {
        throw new ApiError(
          400,
          'INVALID_SOCIAL_PLATFORM',
          'Unsupported social platform.',
        );
      }
      const key = `${link.platform}:${url.toLowerCase()}`;
      if (seen.has(key)) {
        throw new ApiError(
          400,
          'DUPLICATE_SOCIAL_LINK',
          'Duplicate social links are not allowed.',
        );
      }
      seen.add(key);
      return {
        platform: link.platform,
        url,
        label: link.label?.trim() || null,
        sortOrder: link.sortOrder ?? index,
      };
    });
  }
}
