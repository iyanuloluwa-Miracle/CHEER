import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class CreatorSocialLinkResponseDto {
  @ApiProperty({ example: 'cllink...' })
  id!: string;

  @ApiProperty({ enum: SocialPlatform, example: SocialPlatform.GITHUB })
  platform!: SocialPlatform;

  @ApiProperty({ example: 'https://github.com/dina' })
  url!: string;

  @ApiPropertyOptional({ nullable: true, example: 'GitHub' })
  label!: string | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}

export class CreatorProfileResponseDto {
  @ApiProperty({ example: 'clcreator...' })
  id!: string;

  @ApiProperty({ example: 'dina' })
  username!: string;

  @ApiProperty({ example: 'Dina Okonkwo' })
  displayName!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Building for African creators.',
  })
  bio!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.com/avatar.jpg',
  })
  avatarUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Thanks for supporting my work.',
  })
  supportMessage!: string | null;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({
    type: [String],
    example: ['1000.00', '2500.00', '5000.00'],
  })
  suggestedTipAmounts!: string[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: [CreatorSocialLinkResponseDto] })
  socialLinks!: CreatorSocialLinkResponseDto[];

  @ApiProperty({
    example: '/dina',
    description: 'Public Tippy page path (host from APP_URL)',
  })
  publicPath!: string;

  @ApiProperty({ example: '2026-09-06T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-06T12:00:00.000Z' })
  updatedAt!: string;
}

export class CreatorProfileEnvelopeDto {
  @ApiProperty({ type: CreatorProfileResponseDto })
  profile!: CreatorProfileResponseDto;
}

export class CreatorMeEnvelopeDto {
  @ApiPropertyOptional({
    type: CreatorProfileResponseDto,
    nullable: true,
    description: 'Null when the authenticated user has not onboarded yet',
  })
  profile!: CreatorProfileResponseDto | null;
}

export class UsernameAvailabilityResponseDto {
  @ApiProperty({ example: 'dina' })
  username!: string;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({
    enum: ['INVALID_FORMAT', 'RESERVED', 'TOO_SHORT', 'TOO_LONG', 'TAKEN'],
    example: 'TAKEN',
  })
  reason?: 'INVALID_FORMAT' | 'RESERVED' | 'TOO_SHORT' | 'TOO_LONG' | 'TAKEN';
}
