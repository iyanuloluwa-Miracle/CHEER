import { eq } from 'drizzle-orm';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
import { useDb } from '../../db';
import { auditLogs, creatorProfiles } from '../../db/schema';
import { AuditAction } from '../../db/enums';
import {
  BachsProviderError,
  bachsPublicMessage,
} from '../payments/bachs/bachs.errors';
import { BachsHttpClient } from '../payments/bachs/bachs-http.client';
import {
  buildSettlementStatus,
  type CreatorSettlementStatusDto,
} from './settlement.types';

export interface ConnectOnboardResult {
  settlement: CreatorSettlementStatusDto;
  /** Hosted Bachs onboarding URL — null when already linked or stub mode. */
  onboardingUrl: string | null;
  /** True when TippyMe used a local stub Connect id (no live Bachs Connect). */
  stub: boolean;
}

/**
 * Bachs Connect onboarding + Friday payout schedule for creators.
 * Never invents a TippyMe wallet — only stores `bachsAccountId` and settlement flags.
 */
export class ConnectService {
  constructor(
    private readonly db = useDb(),
    private readonly http = new BachsHttpClient(),
  ) {}

  async startOnboarding(userId: string): Promise<ConnectOnboardResult> {
    const profile = await this.requireProfileWithUser(userId);
    const appUrl = (getServerEnv().APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const returnUrl = `${appUrl}/dashboard/connect/return`;
    const refreshUrl = `${appUrl}/dashboard/connect/refresh`;

    // Already linked — mint a fresh hosted link if live Bachs is configured.
    if (profile.bachsAccountId) {
      if (!this.http.isConfigured || profile.bachsAccountId.startsWith('acct_stub_')) {
        return {
          settlement: buildSettlementStatus({
            bachsAccountId: profile.bachsAccountId,
            fridayPayoutEnabled: profile.fridayPayoutEnabled,
          }),
          onboardingUrl: null,
          stub: profile.bachsAccountId.startsWith('acct_stub_'),
        };
      }

      try {
        const link = await this.http.createAccountLink(profile.bachsAccountId, {
          type: 'onboarding',
          return_url: returnUrl,
          refresh_url: refreshUrl,
        });
        return {
          settlement: buildSettlementStatus({
            bachsAccountId: profile.bachsAccountId,
            fridayPayoutEnabled: profile.fridayPayoutEnabled,
          }),
          onboardingUrl: link.url,
          stub: false,
        };
      } catch (err) {
        this.throwConnectError(err);
      }
    }

    // No Bachs key → honest local stub for demo / offline hackathon demos.
    if (!this.http.isConfigured) {
      const stubId = `acct_stub_${profile.id}`;
      const [updated] = await this.db
        .update(creatorProfiles)
        .set({
          bachsAccountId: stubId,
          fridayPayoutEnabled: true,
        })
        .where(eq(creatorProfiles.id, profile.id))
        .returning();
      await this.audit(userId, updated.id, {
        event: 'connect_stub_linked',
        bachsAccountId: stubId,
      });
      return {
        settlement: buildSettlementStatus({
          bachsAccountId: updated.bachsAccountId,
          fridayPayoutEnabled: updated.fridayPayoutEnabled,
        }),
        onboardingUrl: null,
        stub: true,
      };
    }

    try {
      const account = await this.http.createConnectedAccount(
        {
          contact_email: profile.user.email,
          display_name: profile.displayName.slice(0, 120),
          country: 'NG',
          entity_type: 'individual',
          configuration: {
            recipient: {
              capabilities: {
                payouts: { requested: true },
                transfers: { requested: true },
              },
            },
          },
          responsibilities: { fees: { collector: 'bachs' } },
          metadata: {
            tippyme_creator_id: profile.id,
            tippyme_username: profile.username,
          },
        },
        `connect_${profile.id}`.slice(0, 255),
      );

      if (!account.id) {
        throw new BachsProviderError(
          'PROVIDER',
          'Incomplete Bachs Connect account response',
        );
      }

      const [updated] = await this.db
        .update(creatorProfiles)
        .set({ bachsAccountId: account.id })
        .where(eq(creatorProfiles.id, profile.id))
        .returning();

      await this.audit(userId, updated.id, {
        event: 'connect_account_created',
        bachsAccountId: account.id,
      });

      const link = await this.http.createAccountLink(account.id, {
        type: 'onboarding',
        return_url: returnUrl,
        refresh_url: refreshUrl,
      });

      return {
        settlement: buildSettlementStatus({
          bachsAccountId: updated.bachsAccountId,
          fridayPayoutEnabled: updated.fridayPayoutEnabled,
        }),
        onboardingUrl: link.url,
        stub: false,
      };
    } catch (err) {
      this.throwConnectError(err);
    }
  }

  /**
   * After hosted return/refresh — optionally enable Friday weekly payouts.
   */
  async enableFridayPayout(userId: string): Promise<CreatorSettlementStatusDto> {
    const profile = await this.requireProfileWithUser(userId);
    if (!profile.bachsAccountId) {
      throw new ApiError(
        400,
        'CONNECT_REQUIRED',
        'Link Bachs Connect before enabling Friday payouts.',
      );
    }

    if (
      this.http.isConfigured &&
      !profile.bachsAccountId.startsWith('acct_stub_')
    ) {
      try {
        await this.http.updateBalanceSettings(profile.bachsAccountId, {
          payout_schedule: {
            interval: 'weekly',
            weekly_payout_days: ['friday'],
          },
        });
      } catch (err) {
        // Non-fatal: schedule may require payout destination first.
        console.warn(
          `Friday payout schedule request failed for ${profile.bachsAccountId}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }

    const [updated] = await this.db
      .update(creatorProfiles)
      .set({ fridayPayoutEnabled: true })
      .where(eq(creatorProfiles.id, profile.id))
      .returning();

    await this.audit(userId, updated.id, {
      event: 'friday_payout_enabled',
      bachsAccountId: updated.bachsAccountId,
    });

    return buildSettlementStatus({
      bachsAccountId: updated.bachsAccountId,
      fridayPayoutEnabled: updated.fridayPayoutEnabled,
    });
  }

  async getSettlement(userId: string): Promise<CreatorSettlementStatusDto> {
    const profile = await this.requireProfileWithUser(userId);
    return buildSettlementStatus({
      bachsAccountId: profile.bachsAccountId,
      fridayPayoutEnabled: profile.fridayPayoutEnabled,
    });
  }

  private async requireProfileWithUser(userId: string) {
    const profile = await this.db.query.creatorProfiles.findFirst({
      where: eq(creatorProfiles.userId, userId),
      columns: {
        id: true,
        username: true,
        displayName: true,
        bachsAccountId: true,
        fridayPayoutEnabled: true,
      },
      with: {
        user: { columns: { email: true } },
      },
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

  private async audit(
    userId: string,
    profileId: string,
    metadata: Record<string, string | boolean | null>,
  ) {
    await this.db.insert(auditLogs).values({
      actorUserId: userId,
      action: AuditAction.PROFILE_UPDATED,
      entityType: 'CreatorProfile',
      entityId: profileId,
      metadata,
    });
  }

  private throwConnectError(err: unknown): never {
    if (err instanceof BachsProviderError) {
      throw new ApiError(
        err.httpStatus && err.httpStatus >= 400 && err.httpStatus < 500
          ? err.httpStatus
          : 503,
        'CONNECT_FAILED',
        bachsPublicMessage(err.kind),
      );
    }
    console.error(
      `Connect onboarding failed: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    throw new ApiError(
      503,
      'CONNECT_FAILED',
      'Unable to start Bachs Connect right now. Please try again shortly.',
    );
  }
}

/** Compute platform fee decimal string from tip amount (default 5%). */
export function computePlatformFee(
  amount: string,
  percent?: number,
): string {
  const envPercent = Number(getServerEnv().BACHS_PLATFORM_FEE_PERCENT ?? '5');
  const pct =
    percent != null && Number.isFinite(percent)
      ? percent
      : Number.isFinite(envPercent)
        ? envPercent
        : 5;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  const fee = (n * Math.max(0, pct)) / 100;
  // Leave something for the seller; cap fee below amount.
  const capped = Math.min(fee, Math.max(n - 0.01, 0));
  return capped.toFixed(2);
}
