import { StructuredLogger } from './structured-logger';

describe('StructuredLogger', () => {
  it('redacts sensitive field names', () => {
    const lines: string[] = [];
    const spy = jest
      .spyOn(console, 'log')
      .mockImplementation((line: string) => {
        lines.push(line);
      });

    const logger = new StructuredLogger('Test', 'json');
    logger.log({
      msg: 'probe',
      otp: '123456',
      apiKey: 'sk_live_secret',
      tipId: 'tip_1',
    });

    spy.mockRestore();
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.otp).toBe('[redacted]');
    expect(parsed.apiKey).toBe('[redacted]');
    expect(parsed.tipId).toBe('tip_1');
    expect(parsed.msg).toBe('probe');
  });
});
