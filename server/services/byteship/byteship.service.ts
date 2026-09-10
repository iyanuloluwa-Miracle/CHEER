import { ByteshipClient } from '@byteship/js';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';

const AVATAR_FOLDER_PREFIX = 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 15 * 60;

export function getByteshipServerClient(): ByteshipClient {
  const apiKey = getServerEnv().BYTESHIP_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      'BYTESHIP_NOT_CONFIGURED',
      'Profile photo uploads are not configured yet.',
    );
  }
  return new ByteshipClient({ apiKey });
}

/** Folder prefix scoped to the authenticated user. */
export function avatarFolderForUser(userId: string): string {
  return `${AVATAR_FOLDER_PREFIX}/${userId}`;
}

export async function createAvatarUploadToken(userId: string): Promise<{
  token: string;
  expiresAt: string;
  folder: string;
  maxUploadBytes: number;
}> {
  const folder = avatarFolderForUser(userId);
  const byteship = getByteshipServerClient();
  const { uploadToken } = await byteship.createUploadToken({
    folder,
    visibility: 'public',
    maxUploadBytes: MAX_AVATAR_BYTES,
    expiresInSeconds: TOKEN_TTL_SECONDS,
  });

  return {
    token: uploadToken.token,
    expiresAt: uploadToken.expiresAt,
    folder,
    maxUploadBytes: MAX_AVATAR_BYTES,
  };
}

export { MAX_AVATAR_BYTES, AVATAR_FOLDER_PREFIX };
