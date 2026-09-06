import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({ example: 'clxyz...' })
  id!: string;

  @ApiProperty({ example: 'creator@example.com' })
  email!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-09-06T12:00:00.000Z',
  })
  emailVerifiedAt!: string | null;

  @ApiProperty({ example: false })
  hasCreatorProfile!: boolean;
}

export class RequestOtpResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ example: 600, description: 'OTP lifetime in seconds' })
  expiresInSeconds!: number;

  @ApiProperty({
    example: 60,
    description: 'Seconds until another OTP may be requested',
  })
  resendAvailableInSeconds!: number;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}

export class MeResponseDto {
  @ApiPropertyOptional({ type: PublicUserDto, nullable: true })
  user!: PublicUserDto | null;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  ok!: true;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid or expired verification code.',
  })
  message!: string | string[];

  @ApiProperty({ example: 'INVALID_OTP' })
  error!: string;

  @ApiPropertyOptional({ example: '/api/auth/verify-otp' })
  path?: string;

  @ApiPropertyOptional({ example: '2026-09-06T12:00:00.000Z' })
  timestamp?: string;

  @ApiPropertyOptional({ example: 60 })
  retryAfterSeconds?: number;
}
