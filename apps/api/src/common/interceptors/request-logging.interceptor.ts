import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { StructuredLogger } from '../logging/structured-logger';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const started = Date.now();
    const requestId = request.requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            msg: 'request_completed',
            requestId,
            method,
            path: originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - started,
          });
        },
        error: (err: Error) => {
          this.logger.warn({
            msg: 'request_failed',
            requestId,
            method,
            path: originalUrl,
            durationMs: Date.now() - started,
            errorCode: err.name,
            detail: err.message,
          });
        },
      }),
    );
  }
}
