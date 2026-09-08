import { sanitizeSupporterName, sanitizeTipMessage } from './message';

describe('message sanitization', () => {
  it('trims and caps message length', () => {
    const long = 'a'.repeat(600);
    const result = sanitizeTipMessage(long);
    expect(result).toHaveLength(500);
  });

  it('strips HTML tags and control chars', () => {
    const result = sanitizeTipMessage(
      '<script>alert(1)</script>Hello\u0000 world',
    );
    expect(result).toBe('alert(1)Hello world');
  });

  it('returns null for empty/whitespace', () => {
    expect(sanitizeTipMessage('   ')).toBeNull();
    expect(sanitizeTipMessage(null)).toBeNull();
  });

  it('sanitizes supporter names', () => {
    expect(sanitizeSupporterName('  Ada  <b>Love</b> ')).toBe('Ada Love');
    expect(sanitizeSupporterName('')).toBeNull();
  });
});
