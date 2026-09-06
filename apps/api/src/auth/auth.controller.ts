import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUserPayload } from './auth.types';
import {
  AUTH_COOKIE_NAME,
  AUTH_REQUEST_OTP_LIMIT,
  AUTH_THROTTLE_TTL_MS,
  AUTH_VERIFY_OTP_LIMIT,
} from './otp.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('request-otp')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: AUTH_REQUEST_OTP_LIMIT,
      ttl: AUTH_THROTTLE_TTL_MS,
    },
  })
  async requestOtp(@Body() body: RequestOtpDto, @Req() req: Request) {
    return this.authService.requestOtp(body.email, body.purpose ?? 'LOGIN', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: AUTH_VERIFY_OTP_LIMIT,
      ttl: AUTH_THROTTLE_TTL_MS,
    },
  })
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, accessToken } = await this.authService.verifyOtp(
      body.email,
      body.code,
      body.purpose ?? 'LOGIN',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    this.setSessionCookie(res, accessToken);
    return response;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUserPayload) {
    const publicUser = await this.authService.getUserById(user.sub);
    if (!publicUser) {
      return { user: null };
    }
    return { user: publicUser };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearSessionCookie(res);
    return { ok: true };
  }

  private setSessionCookie(res: Response, token: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookie(res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
  }
}
