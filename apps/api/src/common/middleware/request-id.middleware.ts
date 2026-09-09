import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createRequestId } from '../logging/structured-logger';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id') ?? undefined;
    const requestId = createRequestId(incoming);
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
