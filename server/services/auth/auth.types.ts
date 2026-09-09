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
