import { createError } from 'h3';

/**
 * API errors with Nest-compatible JSON shape:
 * { statusCode, message, error, retryAfterSeconds? }
 */
export class ApiError extends Error {
  statusCode: number;
  error: string;
  retryAfterSeconds?: number;

  constructor(
    statusCode: number,
    error: string,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function apiError(
  statusCode: number,
  error: string,
  message: string,
  retryAfterSeconds?: number,
): ApiError {
  return new ApiError(statusCode, error, message, retryAfterSeconds);
}

/** Convert ApiError (or unknown) into an h3 createError payload. */
export function toH3Error(err: unknown) {
  if (err instanceof ApiError) {
    return createError({
      statusCode: err.statusCode,
      statusMessage: err.message,
      data: {
        statusCode: err.statusCode,
        message: err.message,
        error: err.error,
        ...(err.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: err.retryAfterSeconds }
          : {}),
      },
    });
  }
  return err;
}
