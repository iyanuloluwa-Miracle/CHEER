import type { EventHandler, EventHandlerRequest, H3Event } from 'h3';
import { defineEventHandler, setHeader, setResponseStatus } from 'h3';
import { ApiError } from './errors';

/**
 * Wrap Nitro handlers so ApiError becomes Nest-compatible JSON
 * ({ statusCode, message, error, retryAfterSeconds? }) with correct status.
 */
export function defineApiHandler<T extends EventHandlerRequest, R>(
  handler: (event: H3Event<T>) => R | Promise<R>,
): EventHandler<T, R | Record<string, unknown>> {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event);
    } catch (err) {
      if (err instanceof ApiError) {
        setResponseStatus(event, err.statusCode);
        if (err.retryAfterSeconds != null) {
          setHeader(event, 'Retry-After', err.retryAfterSeconds);
        }
        return {
          statusCode: err.statusCode,
          message: err.message,
          error: err.error,
          ...(err.retryAfterSeconds != null
            ? { retryAfterSeconds: err.retryAfterSeconds }
            : {}),
        };
      }
      throw err;
    }
  }) as EventHandler<T, R | Record<string, unknown>>;
}
