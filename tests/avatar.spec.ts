import { describe, expect, it } from 'vitest';
import { dicebearAvatarUrl, resolveAvatarUrl } from '../utils/avatar';
import { normalizeClaimUsername } from '../utils/username-claim';

describe('avatar helpers', () => {
  it('builds a DiceBear lorelei 10.x URL from a seed', () => {
    expect(dicebearAvatarUrl('abdul')).toBe(
      'https://api.dicebear.com/10.x/lorelei/svg?seed=abdul',
    );
  });

  it('falls back to anonymous seed when empty', () => {
    expect(dicebearAvatarUrl('  ')).toContain('seed=anonymous');
  });

  it('resolveAvatarUrl prefers a custom URL', () => {
    expect(resolveAvatarUrl('https://cdn.example/a.png', 'abdul')).toBe(
      'https://cdn.example/a.png',
    );
  });

  it('resolveAvatarUrl uses DiceBear when avatarUrl is null', () => {
    expect(resolveAvatarUrl(null, 'abdul')).toBe(
      'https://api.dicebear.com/10.x/lorelei/svg?seed=abdul',
    );
  });
});

describe('normalizeClaimUsername', () => {
  it('lowercases and strips invalid characters', () => {
    expect(normalizeClaimUsername('Abdul-Sam!')).toBe('abdulsam');
  });

  it('caps length at 30', () => {
    expect(normalizeClaimUsername('a'.repeat(40))).toHaveLength(30);
  });
});
