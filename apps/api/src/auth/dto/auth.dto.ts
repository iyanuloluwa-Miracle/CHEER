import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Length,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: 'creator@example.com',
    description: 'Creator email for signup verification (OTP is signup-only)',
  })
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'creator@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description:
      'One-time code from email (never logged or returned by the API)',
    minLength: 4,
    maxLength: 10,
  })
  @IsString()
  @Length(4, 10)
  code!: string;

  @ApiProperty({
    example: 'securePass123',
    description:
      'Password to set for future logins (required on signup verify)',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'creator@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
