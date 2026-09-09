import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  reportOperationalError,
  StructuredLogger,
} from '../logging/structured-logger';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let retryAfterSeconds: number | undefined;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      error = 'RATE_LIMITED';
      message = 'Too many requests. Please try again shortly.';
      retryAfterSeconds = 60;
      response.setHeader('Retry-After', String(retryAfterSeconds));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
        error = (body.error as string) ?? exception.name;
        if (typeof body.retryAfterSeconds === 'number') {
          retryAfterSeconds = body.retryAfterSeconds;
          response.setHeader('Retry-After', String(retryAfterSeconds));
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error({
        msg: 'unhandled_exception',
        requestId,
        path: request.url,
        statusCode: status,
        errorCode: exception.name,
        detail: exception.message,
      });
      reportOperationalError({
        message: exception.message,
        requestId,
        path: request.url,
        statusCode: status,
      });
    } else {
      this.logger.error({
        msg: 'unknown_exception',
        requestId,
        path: request.url,
        detail: String(exception),
      });
    }

    if (Number(status) >= 500 && exception instanceof HttpException) {
      this.logger.error({
        msg: 'http_5xx',
        requestId,
        path: request.url,
        statusCode: status,
        errorCode: error,
      });
      reportOperationalError({
        message: typeof message === 'string' ? message : error,
        requestId,
        path: request.url,
        statusCode: status,
      });
    }

    const payload: ErrorBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    };

    response.status(status).json(payload);
  }
}
