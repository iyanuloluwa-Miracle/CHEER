import { amountValidationMessage, validateTipAmount } from './amount';
import { TIP_MAX_AMOUNT, TIP_MIN_AMOUNT } from './tips.constants';

describe('validateTipAmount', () => {
  it('accepts valid decimal strings', () => {
    const result = validateTipAmount('2500.00');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe('2500.00');
    }
  });

  it('normalizes whole numbers to 2 dp', () => {
    const result = validateTipAmount('1000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe('1000.00');
    }
  });

  it('rejects invalid format', () => {
    expect(validateTipAmount('abc')).toMatchObject({
      ok: false,
      reason: 'INVALID_FORMAT',
    });
    expect(validateTipAmount('12.345')).toMatchObject({
      ok: false,
      reason: 'INVALID_FORMAT',
    });
    expect(validateTipAmount('-10')).toMatchObject({
      ok: false,
      reason: 'INVALID_FORMAT',
    });
  });

  it('rejects below minimum', () => {
    const result = validateTipAmount('99.99');
    expect(result).toMatchObject({ ok: false, reason: 'BELOW_MINIMUM' });
    expect(amountValidationMessage('BELOW_MINIMUM')).toContain(TIP_MIN_AMOUNT);
  });

  it('rejects above maximum', () => {
    const over = (Number(TIP_MAX_AMOUNT) + 1).toFixed(2);
    const result = validateTipAmount(over);
    expect(result).toMatchObject({ ok: false, reason: 'ABOVE_MAXIMUM' });
    expect(amountValidationMessage('ABOVE_MAXIMUM')).toContain(TIP_MAX_AMOUNT);
  });

  it('accepts exact minimum and maximum', () => {
    expect(validateTipAmount(TIP_MIN_AMOUNT).ok).toBe(true);
    expect(validateTipAmount(TIP_MAX_AMOUNT).ok).toBe(true);
  });
});
