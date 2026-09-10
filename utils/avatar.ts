const DICEBEAR_BASE = 'https://api.dicebear.com/10.x/lorelei/png';

/** Deterministic DiceBear avatar URL for a seed (username, display name, etc.). */
export function dicebearAvatarUrl(seed: string, size = 128): string {
  const normalized = seed.trim() || 'anonymous';
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(normalized)}&size=${size}`;
}

/** Prefer a custom avatar URL; otherwise fall back to DiceBear. */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  seed: string,
  size = 128,
): string {
  const custom = avatarUrl?.trim();
  if (custom) return custom;
  return dicebearAvatarUrl(seed, size);
}
