import Decimal from 'decimal.js';
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lt,
  lte,
  sum,
} from 'drizzle-orm';
import { useDb, isUniqueViolation } from '../../db';
import {
  auditLogs,
  creatorProfiles,
  socialLinks,
  tipPageViews,
  tips,
  type Tip,
} from '../../db/schema';
import { AuditAction, SocialPlatform, TipStatus } from '../../db/enums';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
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
  type PublicSupporterNoteDto,
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

const RECENT_TIPS_LIMIT = 8;
const RECENT_MESSAGES_LIMIT = 8;
const PUBLIC_NOTES_LIMIT = 8;

export class CreatorsService {
  constructor(private readonly db = useDb()) {}

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

    const existing = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.username, format.username),
      columns: { userId: true },
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
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
      with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
    });
    return profile ? toCreatorProfileDto(profile) : null;
  }

  async getPublicByUsername(raw: string): Promise<PublicCreatorPageDto> {
    const username = normalizeUsername(raw);
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.username, username),
      with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
    });

    if (!profile || !profile.isActive) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }

    // Notes only — weekly tip totals stay private on the creator dashboard.
    const [recentNotes, [lifetimeAgg]] = await Promise.all([
      this.db
        .select({
          amount: tips.amount,
          currency: tips.currency,
          message: tips.message,
          isAnonymous: tips.isAnonymous,
          supporterName: tips.supporterName,
          createdAt: tips.createdAt,
        })
        .from(tips)
        .where(
          and(
            eq(tips.creatorId, profile.id),
            eq(tips.status, TipStatus.PAID),
            isNotNull(tips.message),
          ),
        )
        .orderBy(desc(tips.createdAt))
        .limit(PUBLIC_NOTES_LIMIT),
      this.db
        .select({ value: sum(tips.amount) })
        .from(tips)
        .where(
          and(eq(tips.creatorId, profile.id), eq(tips.status, TipStatus.PAID)),
        ),
    ]);

    const recentSupporterNotes = recentNotes
      .map((tip: Pick<Tip, 'amount' | 'currency' | 'message' | 'isAnonymous' | 'supporterName' | 'createdAt'>) =>
        toPublicSupporterNoteDto(tip as Tip),
      )
      .filter(
        (note: PublicSupporterNoteDto | null): note is PublicSupporterNoteDto =>
          note !== null,
      );

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
      supportGoal: toSupportGoalDto(profile, lifetimeAgg?.value),
      recentSupporterNotes,
    };
  }

  async create(
    userId: string,
    dto: CreateCreatorInput,
  ): Promise<CreatorProfileDto> {
    const existing = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
      columns: { id: true },
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

    const linkRows = this.normalizeSocialLinks(dto.socialLinks ?? []);
    const suggestedTipAmounts = this.normalizeTipAmounts(
      dto.suggestedTipAmounts ?? ['1000.00', '2500.00', '5000.00'],
    );

    try {
      const profile = await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(creatorProfiles)
          .values({
            userId,
            username,
            displayName: dto.displayName.trim(),
            bio: dto.bio?.trim() || null,
            avatarUrl: dto.avatarUrl?.trim() || null,
            supportMessage: dto.supportMessage?.trim() || null,
            currency: (dto.currency ?? 'NGN').toUpperCase(),
            suggestedTipAmounts,
          })
          .returning();

        if (linkRows.length > 0) {
          await tx.insert(socialLinks).values(
            linkRows.map((link) => ({
              ...link,
              creatorId: inserted.id,
            })),
          );
        }

        return tx.query.creatorProfiles.findFirst({
          where: eq(creatorProfiles.id, inserted.id),
          with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
        });
      });

      if (!profile) {
        throw new Error('Creator profile insert did not return a row.');
      }

      await this.db.insert(auditLogs).values({
        actorUserId: userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'CreatorProfile',
        entityId: profile.id,
        metadata: { event: 'created', username },
      });

      return toCreatorProfileDto(profile);
    } catch (err) {
      if (isUniqueViolation(err)) {
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

    const data: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      username?: string;
    } = {};

    if (dto.displayName !== undefined) {
      data.displayName = this.requireValidDisplayName(dto.displayName);
    }
    if (dto.bio !== undefined) {
      data.bio = dto.bio === null ? null : this.requireValidBio(dto.bio);
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
      await this.db
        .update(creatorProfiles)
        .set(data)
        .where(eq(creatorProfiles.id, profile.id));

      const updated = await this.db.query.creatorProfiles.findFirst({
        where: eq(creatorProfiles.id, profile.id),
        with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
      });

      if (!updated) {
        throw new Error('Creator profile update did not return a row.');
      }

      await this.db.insert(auditLogs).values({
        actorUserId: userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'CreatorProfile',
        entityId: updated.id,
        metadata: { event: 'profile_update' },
      });

      return toCreatorProfileDto(updated);
    } catch (err) {
      if (isUniqueViolation(err)) {
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

    const data: {
      supportMessage?: string | null;
      currency?: AllowedCurrency;
      suggestedTipAmounts?: string[];
      goalTitle?: string | null;
      goalTargetAmount?: string | null;
      goalActive?: boolean;
    } = {};
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
        dto.goalTitle === null
          ? null
          : this.requireValidGoalTitle(dto.goalTitle);
    }
    if (dto.goalTargetAmount !== undefined) {
      data.goalTargetAmount =
        dto.goalTargetAmount === null
          ? null
          : this.requireValidGoalAmount(dto.goalTargetAmount).toFixed(2);
    }
    if (dto.goalActive !== undefined) {
      data.goalActive = Boolean(dto.goalActive);
    }

    await this.db
      .update(creatorProfiles)
      .set(data)
      .where(eq(creatorProfiles.id, profile.id));

    const updated = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.id, profile.id),
      with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
    });

    if (!updated) {
      throw new Error('Creator profile update did not return a row.');
    }

    await this.db.insert(auditLogs).values({
      actorUserId: userId,
      action: AuditAction.PROFILE_UPDATED,
      entityType: 'CreatorProfile',
      entityId: updated.id,
      metadata: { event: 'settings_update' },
    });

    return toCreatorProfileDto(updated);
  }

  async replaceSocialLinks(
    userId: string,
    dto: ReplaceSocialLinksInput,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);
    const linkRows = this.normalizeSocialLinks(dto.links);

    const updated = await this.db.transaction(async (tx) => {
      await tx
        .delete(socialLinks)
        .where(eq(socialLinks.creatorId, profile.id));
      if (linkRows.length > 0) {
        await tx.insert(socialLinks).values(
          linkRows.map((link) => ({
            ...link,
            creatorId: profile.id,
          })),
        );
      }
      return tx.query.creatorProfiles.findFirst({
        where: eq(creatorProfiles.id, profile.id),
        with: {
        socialLinks: {
          orderBy: (sl, { asc: ascFn }) => [ascFn(sl.sortOrder)],
        },
      },
      });
    });

    if (!updated) {
      throw new Error('Creator profile not found after social link replace.');
    }

    await this.db.insert(auditLogs).values({
      actorUserId: userId,
      action: AuditAction.PROFILE_UPDATED,
      entityType: 'CreatorProfile',
      entityId: updated.id,
      metadata: { event: 'social_links_replaced', count: linkRows.length },
    });

    return toCreatorProfileDto(updated);
  }

  /**
   * Creator dashboard aggregates + recent activity.
   * Scoped exclusively to the session user's owned profile (IDOR-safe).
   * Successful totals count TipStatus.PAID only.
   */
  async getDashboard(userId: string): Promise<CreatorDashboardDto> {
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
      columns: {
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

    const paidFilter = and(
      eq(tips.creatorId, creatorId),
      eq(tips.status, TipStatus.PAID),
    );

    const [
      [lifetimeAgg],
      [periodAgg],
      recentTips,
      recentMessages,
      [lifetimeViews],
      [weekViews],
    ] = await Promise.all([
      this.db
        .select({ value: sum(tips.amount), n: count() })
        .from(tips)
        .where(paidFilter),
      this.db
        .select({ value: sum(tips.amount), n: count() })
        .from(tips)
        .where(
          and(paidFilter, gte(tips.createdAt, start), lt(tips.createdAt, end)),
        ),
      this.db.query.tips.findMany({
        where: eq(tips.creatorId, creatorId),
        with: { paymentTransaction: { columns: { status: true } } },
        orderBy: desc(tips.createdAt),
        limit: RECENT_TIPS_LIMIT,
      }),
      this.db.query.tips.findMany({
        where: and(
          eq(tips.creatorId, creatorId),
          eq(tips.status, TipStatus.PAID),
          isNotNull(tips.message),
        ),
        with: { paymentTransaction: { columns: { status: true } } },
        orderBy: desc(tips.createdAt),
        limit: RECENT_MESSAGES_LIMIT,
      }),
      this.db
        .select({ n: count() })
        .from(tipPageViews)
        .where(eq(tipPageViews.creatorId, creatorId)),
      this.db
        .select({ n: count() })
        .from(tipPageViews)
        .where(
          and(
            eq(tipPageViews.creatorId, creatorId),
            gte(tipPageViews.createdAt, week.start),
            lt(tipPageViews.createdAt, week.end),
          ),
        ),
    ]);

    const successfulTipCount = lifetimeAgg?.n ?? 0;
    const lifetimeViewCount = lifetimeViews?.n ?? 0;
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
          lifetimeAgg?.value ?? new Decimal(0),
        ),
        successfulTipCount,
        periodSupport: decimalToAmountString(
          periodAgg?.value ?? new Decimal(0),
        ),
        periodTipCount: periodAgg?.n ?? 0,
        periodKey,
        periodLabel,
      },
      linkViews: {
        lifetime: lifetimeViewCount,
        thisWeek: weekViews?.n ?? 0,
      },
      conversion: {
        viewsToTipsRate: conversionRate,
        /** Percentage 0–100 for UI, null when no views. */
        viewsToTipsPercent:
          conversionRate == null
            ? null
            : Math.round(conversionRate * 1000) / 10,
      },
      supportGoal: toSupportGoalDto(profile, lifetimeAgg?.value),
      recentTips: recentTips.map(toCreatorTipDto),
      recentMessages: recentMessages
        .filter((t: (typeof recentMessages)[number]) =>
          Boolean(t.message?.trim()),
        )
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
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.username, username),
      columns: { id: true, isActive: true },
    });

    if (!profile || !profile.isActive) {
      throw new ApiError(404, 'CREATOR_NOT_FOUND', 'Creator not found.');
    }

    await this.db.insert(tipPageViews).values({ creatorId: profile.id });

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

    const [[countRow], tipRows] = await Promise.all([
      this.db.select({ n: count() }).from(tips).where(where),
      this.db.query.tips.findMany({
        where,
        with: { paymentTransaction: { columns: { status: true } } },
        orderBy: desc(tips.createdAt),
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
    ]);

    const total = countRow?.n ?? 0;

    return {
      tips: tipRows.map(toCreatorTipDto),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private buildTipListWhere(creatorId: string, query: ListTipsQuery) {
    const conditions = [eq(tips.creatorId, creatorId)];

    if (query.status) {
      conditions.push(eq(tips.status, query.status));
    }

    if (query.from) {
      conditions.push(gte(tips.createdAt, new Date(query.from)));
    }

    if (query.to) {
      const to = new Date(query.to);
      // If date-only (YYYY-MM-DD), include the full end day in UTC.
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        to.setUTCHours(23, 59, 59, 999);
      }
      conditions.push(lte(tips.createdAt, to));
    }

    if (query.minAmount) {
      conditions.push(gte(tips.amount, query.minAmount));
    }

    if (query.maxAmount) {
      conditions.push(lte(tips.amount, query.maxAmount));
    }

    return and(...conditions);
  }

  /**
   * Ensures the authenticated user owns this creator id.
   * Never trust a client-supplied userId for ownership.
   */
  async assertOwnsCreator(userId: string, creatorId: string): Promise<void> {
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.id, creatorId),
      columns: { userId: true },
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
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
      columns: { id: true, userId: true },
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

  private requireValidGoalAmount(raw: string): Decimal {
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
    return new Decimal(n.toFixed(2));
  }

  private requireValidCurrency(raw: string): AllowedCurrency {
    const currency = raw.trim().toUpperCase();
    if (!(ALLOWED_CURRENCIES as readonly string[]).includes(currency)) {
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
      return new ApiError(400, reason, usernameValidationMessage(reason));
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
      if (
        !Object.values(SocialPlatform).includes(
          link.platform as (typeof SocialPlatform)[keyof typeof SocialPlatform],
        )
      ) {
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
