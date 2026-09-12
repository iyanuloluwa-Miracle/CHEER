import Decimal from 'decimal.js';
import {
  TIP_AMOUNT_PATTERN,
  TIP_MAX_AMOUNT,
  TIP_MIN_AMOUNT,
} from './tips.constants';

export type AmountValidationFailure =
  | 'INVALID_FORMAT'
  | 'BELOW_MINIMUM'
  | 'ABOVE_MAXIMUM';

export type AmountValidationResult =
  | { ok: true; amount: string; decimal: Decimal }
  | { ok: false; reason: AmountValidationFailure };

/**
 * Parse and validate a tip amount. Never trust floats from the client.
 * Returns a normalized decimal string with scale 2.
 */
export function validateTipAmount(raw: unknown): AmountValidationResult {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  const asString =
    typeof raw === 'number' ? String(raw) : raw.trim().replace(/,/g, '');

  if (!TIP_AMOUNT_PATTERN.test(asString)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  let decimal: Decimal;
  try {
    decimal = new Decimal(asString);
  } catch {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  if (!decimal.isFinite() || decimal.lte(0)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  const normalized = decimal.toFixed(2);
  const min = new Decimal(TIP_MIN_AMOUNT);
  const max = new Decimal(TIP_MAX_AMOUNT);

  if (decimal.lt(min)) {
    return { ok: false, reason: 'BELOW_MINIMUM' };
  }
  if (decimal.gt(max)) {
    return { ok: false, reason: 'ABOVE_MAXIMUM' };
  }

  return {
    ok: true,
    amount: normalized,
    decimal: new Decimal(normalized),
  };
}

export function amountValidationMessage(
  reason: AmountValidationFailure,
): string {
  switch (reason) {
    case 'BELOW_MINIMUM':
      return `Minimum tip amount is ${TIP_MIN_AMOUNT}.`;
    case 'ABOVE_MAXIMUM':
      return `Maximum tip amount is ${TIP_MAX_AMOUNT}.`;
    case 'INVALID_FORMAT':
    default:
      return 'Amount must be a positive number with up to 2 decimal places.';
  }
}
