export interface AuthUserPayload {
  sub: string;
  email: string;
}

export interface PublicUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  hasCreatorProfile: boolean;
}

export interface RequestOtpResponse {
  ok: true;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyOtpResponse {
  ok: true;
  user: PublicUser;
}

export type AuthErrorCode =
  | 'INVALID_OTP'
  | 'EXPIRED_OTP'
  | 'OTP_CONSUMED'
  | 'TOO_MANY_ATTEMPTS'
  | 'RESEND_COOLDOWN'
  | 'RATE_LIMITED'
  | 'EMAIL_DELIVERY_FAILED'
  | 'UNAUTHORIZED';
