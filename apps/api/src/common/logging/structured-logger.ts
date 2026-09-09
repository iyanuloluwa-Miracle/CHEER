import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';

export type LogLevel = 'log' | 'warn' | 'error' | 'debug';

export interface StructuredLogFields {
  msg: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  tipId?: string;
  checkoutId?: string;
  eventId?: string;
  outcome?: string;
  errorCode?: string;
  /** Never put OTP, passwords, API keys, or card data here. */
  [key: string]: string | number | boolean | undefined;
}

const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|cookie|otp|api[_-]?key|pepper|card|cvv|pan/i;

function scrub(fields: StructuredLogFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Structured JSON logger for production log drains.
 * Set LOG_FORMAT=json (default in production) or LOG_FORMAT=text for local.
 */
export class StructuredLogger {
  private readonly nest: Logger;
  private readonly json: boolean;
  private readonly contextName: string;

  constructor(context: string, logFormat?: string) {
    this.contextName = context;
    this.nest = new Logger(context);
    const format = (logFormat ?? process.env.LOG_FORMAT ?? '').toLowerCase();
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    this.json =
      format === 'json' || (format === '' && nodeEnv === 'production');
  }

  private emit(level: LogLevel, fields: StructuredLogFields) {
    const safe = scrub(fields);
    if (this.json) {
      const line = JSON.stringify({
        level,
        time: new Date().toISOString(),
        context: this.contextName,
        ...safe,
      });
      if (level === 'error') {
        console.error(line);
      } else if (level === 'warn') {
        console.warn(line);
      } else {
        console.log(line);
      }
      return;
    }

    const { msg, ...rest } = safe;
    const suffix =
      Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    const text = `${String(msg)}${suffix}`;
    if (level === 'error') this.nest.error(text);
    else if (level === 'warn') this.nest.warn(text);
    else if (level === 'debug') this.nest.debug(text);
    else this.nest.log(text);
  }

  log(fields: StructuredLogFields) {
    this.emit('log', fields);
  }

  warn(fields: StructuredLogFields) {
    this.emit('warn', fields);
  }

  error(fields: StructuredLogFields) {
    this.emit('error', fields);
  }

  debug(fields: StructuredLogFields) {
    this.emit('debug', fields);
  }
}

export function createRequestId(existing?: string): string {
  if (existing && /^[\w-]{8,128}$/.test(existing)) {
    return existing;
  }
  return randomUUID();
}

/** Optional external error sink (Sentry-compatible DSN env). No SDK required for MVP. */
export function reportOperationalError(params: {
  message: string;
  requestId?: string;
  path?: string;
  statusCode?: number;
}): void {
  const dsn = process.env.ERROR_MONITORING_DSN?.trim();
  if (!dsn) return;
  // Hook point for a future Sentry/OpenTelemetry SDK. Never send secrets.
  const logger = new StructuredLogger('ErrorMonitoring');
  logger.error({
    msg: 'operational_error',
    sink: 'ERROR_MONITORING_DSN_configured',
    detail: params.message,
    requestId: params.requestId,
    path: params.path,
    statusCode: params.statusCode,
  });
}
