import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { AUTH_COOKIE_NAME } from '../otp.constants';
import type { AuthUserPayload } from '../auth.types';

export type AuthenticatedRequest = Request & {
  user?: AuthUserPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const payload = await this.authService.verifyAccessToken(token);
    request.user = payload;
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    const cookieToken = cookies?.[AUTH_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

    const header = request.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim() || null;
    }

    return null;
  }
}
