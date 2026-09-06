import {
  RESERVED_USERNAMES,
  normalizeUsername,
  validateUsernameFormat,
} from './username';

describe('username validation', () => {
  it('normalizes to lowercase', () => {
    expect(normalizeUsername('  DiNa ')).toBe('dina');
  });

  it('accepts valid usernames', () => {
    expect(validateUsernameFormat('dina')).toEqual({
      ok: true,
      username: 'dina',
    });
    expect(validateUsernameFormat('builder_01')).toEqual({
      ok: true,
      username: 'builder_01',
    });
  });

  it('rejects invalid format', () => {
    expect(validateUsernameFormat('Bad-Name')).toMatchObject({
      ok: false,
      reason: 'INVALID_FORMAT',
    });
    expect(validateUsernameFormat('ab')).toMatchObject({
      ok: false,
      reason: 'TOO_SHORT',
    });
  });

  it('rejects reserved route usernames', () => {
    for (const name of [
      'login',
      'dashboard',
      'api',
      'admin',
      'onboarding',
      'tippyme',
    ]) {
      expect(RESERVED_USERNAMES.has(name)).toBe(true);
      expect(validateUsernameFormat(name)).toMatchObject({
        ok: false,
        reason: 'RESERVED',
      });
    }
  });
});
