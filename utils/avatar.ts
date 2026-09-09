const DICEBEAR_BASE = 'https://api.dicebear.com/10.x/lorelei/svg';

/** Deterministic DiceBear avatar URL for a seed (username, display name, etc.). */
export function dicebearAvatarUrl(seed: string): string {
  const normalized = seed.trim() || 'anonymous';
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(normalized)}`;
}

/** Prefer a custom avatar URL; otherwise fall back to DiceBear. */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  seed: string,
): string {
  const custom = avatarUrl?.trim();
  if (custom) return custom;
  return dicebearAvatarUrl(seed);
}
