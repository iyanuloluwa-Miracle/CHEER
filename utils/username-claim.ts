/** Normalize a claim/username input for signup handoff (client-safe). */
export function normalizeClaimUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
}
