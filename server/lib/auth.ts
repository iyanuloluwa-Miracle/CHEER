import type { H3Event } from 'h3';
import {
  deleteCookie,
  getCookie,
  getHeader,
  setCookie,
} from 'h3';
import { SignJWT, jwtVerify } from 'jose';
import { ApiError } from './errors';
import { getServerEnv } from './env';

export const AUTH_COOKIE_NAME = 'tippyme_session';
export const AUTH_JWT_EXPIRES_IN = '7d';
const AUTH_COOKIE_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type AuthUserPayload = {
  sub: string;
  email: string;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().AUTH_SECRET);
}

export async function signAccessToken(
  payload: AuthUserPayload,
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(AUTH_JWT_EXPIRES_IN)
    .sign(secretKey());
}

export async function verifyAccessToken(
  token: string,
): Promise<AuthUserPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = payload.sub;
    const email = payload.email;
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    return { sub, email };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
}

function extractToken(event: H3Event): string | null {
  const cookieToken = getCookie(event, AUTH_COOKIE_NAME);
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const header = getHeader(event, 'authorization');
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim() || null;
  }

  return null;
}

export async function requireUser(event: H3Event): Promise<AuthUserPayload> {
  const token = extractToken(event);
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
  return verifyAccessToken(token);
}

export function setAuthCookie(event: H3Event, token: string): void {
  const isProd = getServerEnv().NODE_ENV === 'production';
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SEC,
  });
}

export function clearAuthCookie(event: H3Event): void {
  const isProd = getServerEnv().NODE_ENV === 'production';
  deleteCookie(event, AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}
