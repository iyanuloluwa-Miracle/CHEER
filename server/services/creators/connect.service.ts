import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';
import {
  AuditLogModel,
  CreatorProfileModel,
  UserModel,
  toPlain,
  useDb,
} from '../../db';
import type { LeanDoc } from '../../db/lean';
import type { CreatorProfile, User } from '../../db/types';
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
  constructor(private readonly http = new BachsHttpClient()) {}

  async startOnboarding(userId: string): Promise<ConnectOnboardResult> {
    await useDb();
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
      await CreatorProfileModel.updateOne(
        { _id: profile.id },
        {
          $set: {
            bachsAccountId: stubId,
            fridayPayoutEnabled: true,
            updatedAt: new Date(),
          },
        },
      );
      await this.audit(userId, profile.id, {
        event: 'connect_stub_linked',
        bachsAccountId: stubId,
      });
      return {
        settlement: buildSettlementStatus({
          bachsAccountId: stubId,
          fridayPayoutEnabled: true,
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

      await CreatorProfileModel.updateOne(
        { _id: profile.id },
        { $set: { bachsAccountId: account.id, updatedAt: new Date() } },
      );

      await this.audit(userId, profile.id, {
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
          bachsAccountId: account.id,
          fridayPayoutEnabled: profile.fridayPayoutEnabled,
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
    await useDb();
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

    await CreatorProfileModel.updateOne(
      { _id: profile.id },
      { $set: { fridayPayoutEnabled: true, updatedAt: new Date() } },
    );

    await this.audit(userId, profile.id, {
      event: 'friday_payout_enabled',
      bachsAccountId: profile.bachsAccountId,
    });

    return buildSettlementStatus({
      bachsAccountId: profile.bachsAccountId,
      fridayPayoutEnabled: true,
    });
  }

  async getSettlement(userId: string): Promise<CreatorSettlementStatusDto> {
    await useDb();
    const profile = await this.requireProfileWithUser(userId);
    return buildSettlementStatus({
      bachsAccountId: profile.bachsAccountId,
      fridayPayoutEnabled: profile.fridayPayoutEnabled,
    });
  }

  private async requireProfileWithUser(
    userId: string,
  ): Promise<CreatorProfile & { user: Pick<User, 'email'> }> {
    const profile = toPlain<CreatorProfile>(
      await CreatorProfileModel.findOne({ userId }).lean<LeanDoc | null>(),
    );
    const user = profile
      ? toPlain<User>(
          await UserModel.findOne({ _id: profile.userId }).lean<
            LeanDoc | null
          >(),
        )
      : null;
    if (!profile || !user) {
      throw new ApiError(
        404,
        'PROFILE_NOT_FOUND',
        'Create a creator profile first.',
      );
    }
    return { ...profile, user: { email: user.email } };
  }

  private async audit(
    userId: string,
    profileId: string,
    metadata: Record<string, string | boolean | null>,
  ) {
    await AuditLogModel.create([
      {
        actorUserId: userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'CreatorProfile',
        entityId: profileId,
        metadata,
      },
    ]);
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
