import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

const OTP_PURPOSES = ['LOGIN', 'EMAIL_VERIFICATION'] as const;

export class RequestOtpDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(OTP_PURPOSES)
  purpose?: (typeof OTP_PURPOSES)[number] = 'LOGIN';
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(4, 10)
  code!: string;

  @IsOptional()
  @IsIn(OTP_PURPOSES)
  purpose?: (typeof OTP_PURPOSES)[number] = 'LOGIN';
}
