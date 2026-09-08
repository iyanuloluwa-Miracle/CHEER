/**
 * Safe Bachs provider errors — never leak raw provider payloads to clients.
 */
export type BachsErrorKind =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROVIDER'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CONFIG';

export class BachsProviderError extends Error {
  readonly kind: BachsErrorKind;
  readonly httpStatus?: number;
  readonly providerErrorCode?: string;

  constructor(
    kind: BachsErrorKind,
    message: string,
    opts?: { httpStatus?: number; providerErrorCode?: string; cause?: unknown },
  ) {
    super(message, opts?.cause ? { cause: opts.cause } : undefined);
    this.name = 'BachsProviderError';
    this.kind = kind;
    this.httpStatus = opts?.httpStatus;
    this.providerErrorCode = opts?.providerErrorCode;
  }
}

export function mapHttpStatusToKind(status: number): BachsErrorKind {
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'PROVIDER';
  return 'PROVIDER';
}

/** User-facing copy — never include provider detail / secrets. */
export function bachsPublicMessage(kind: BachsErrorKind): string {
  switch (kind) {
    case 'VALIDATION':
      return 'Unable to start checkout with the provided details. Please try again.';
    case 'RATE_LIMITED':
      return 'Payment service is busy. Please wait a moment and try again.';
    case 'TIMEOUT':
    case 'NETWORK':
      return 'Payment service timed out. Please try again.';
    case 'CONFIG':
      return 'Payments are temporarily unavailable.';
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
    case 'CONFLICT':
    case 'PROVIDER':
    default:
      return 'Unable to start payment right now. Please try again shortly.';
  }
}
