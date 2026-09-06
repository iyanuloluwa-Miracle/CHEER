import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateCreatorDto,
  ReplaceSocialLinksDto,
  SocialLinkInputDto,
  UpdateCreatorProfileDto,
  UpdateCreatorSettingsDto,
} from './dto/creators.dto';
import {
  toCreatorProfileDto,
  type CreatorProfileDto,
  type UsernameAvailabilityDto,
} from './creators.types';
import {
  normalizeUsername,
  validateUsernameFormat,
  usernameValidationMessage,
} from './username';

const profileInclude = {
  socialLinks: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.CreatorProfileInclude;

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getPublicByUsername(raw: string): Promise<CreatorProfileDto> {
    const username = normalizeUsername(raw);
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { username },
      include: profileInclude,
    });

    if (!profile || !profile.isActive) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'CREATOR_NOT_FOUND',
        message: 'Creator not found.',
      });
    }

    return toCreatorProfileDto(profile);
  }

  async create(
    userId: string,
    dto: CreateCreatorDto,
  ): Promise<CreatorProfileDto> {
    const existing = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'PROFILE_EXISTS',
        message: 'You already have a creator profile.',
      });
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
        throw new ConflictException({
          statusCode: 409,
          error: 'USERNAME_TAKEN',
          message: 'That username was just taken. Please choose another.',
        });
      }
      throw err;
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);

    const data: Prisma.CreatorProfileUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim();
    }
    if (dto.bio !== undefined) {
      data.bio = dto.bio === null ? null : dto.bio.trim() || null;
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
        throw new ConflictException({
          statusCode: 409,
          error: 'USERNAME_TAKEN',
          message: 'That username was just taken. Please choose another.',
        });
      }
      throw err;
    }
  }

  async updateSettings(
    userId: string,
    dto: UpdateCreatorSettingsDto,
  ): Promise<CreatorProfileDto> {
    const profile = await this.requireOwnedProfile(userId);

    const data: Prisma.CreatorProfileUpdateInput = {};
    if (dto.supportMessage !== undefined) {
      data.supportMessage =
        dto.supportMessage === null ? null : dto.supportMessage.trim() || null;
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency.toUpperCase();
    }
    if (dto.suggestedTipAmounts !== undefined) {
      data.suggestedTipAmounts = this.normalizeTipAmounts(
        dto.suggestedTipAmounts,
      );
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
    dto: ReplaceSocialLinksDto,
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
   * Ensures the authenticated user owns this creator id.
   * Never trust a client-supplied userId for ownership.
   */
  async assertOwnsCreator(userId: string, creatorId: string): Promise<void> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { userId: true },
    });
    if (!profile) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'CREATOR_NOT_FOUND',
        message: 'Creator not found.',
      });
    }
    if (profile.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'You do not have access to this creator profile.',
      });
    }
  }

  private async requireOwnedProfile(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!profile) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'PROFILE_NOT_FOUND',
        message: 'Create a creator profile first.',
      });
    }
    return profile;
  }

  private requireValidUsername(raw: string): string {
    const format = validateUsernameFormat(raw);
    if (!format.ok) {
      throw new BadRequestException({
        statusCode: 400,
        error: format.reason,
        message: usernameValidationMessage(format.reason),
      });
    }
    return format.username;
  }

  private usernameConflict(reason: string) {
    if (reason === 'RESERVED') {
      return new BadRequestException({
        statusCode: 400,
        error: 'RESERVED',
        message: usernameValidationMessage('RESERVED'),
      });
    }
    if (
      reason === 'INVALID_FORMAT' ||
      reason === 'TOO_SHORT' ||
      reason === 'TOO_LONG'
    ) {
      return new BadRequestException({
        statusCode: 400,
        error: reason,
        message: usernameValidationMessage(reason),
      });
    }
    return new ConflictException({
      statusCode: 409,
      error: 'USERNAME_TAKEN',
      message: 'That username is already taken.',
    });
  }

  private normalizeTipAmounts(amounts: string[]): string[] {
    const normalized = amounts.map((a) => {
      const n = Number(a);
      if (!Number.isFinite(n) || n <= 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_TIP_AMOUNT',
          message: 'Suggested tip amounts must be positive numbers.',
        });
      }
      return n.toFixed(2);
    });
    return [...new Set(normalized)];
  }

  private normalizeSocialLinks(links: SocialLinkInputDto[]) {
    const seen = new Set<string>();
    return links.map((link, index) => {
      const url = link.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_SOCIAL_URL',
          message: 'Social links must be http(s) URLs.',
        });
      }
      if (!Object.values(SocialPlatform).includes(link.platform)) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'INVALID_SOCIAL_PLATFORM',
          message: 'Unsupported social platform.',
        });
      }
      const key = `${link.platform}:${url.toLowerCase()}`;
      if (seen.has(key)) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'DUPLICATE_SOCIAL_LINK',
          message: 'Duplicate social links are not allowed.',
        });
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
