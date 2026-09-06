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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import {
  ApiErrorResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RequestOtpResponseDto,
  VerifyOtpResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUserPayload } from './auth.types';
import {
  AUTH_COOKIE_NAME,
  AUTH_REQUEST_OTP_LIMIT,
  AUTH_THROTTLE_TTL_MS,
  AUTH_VERIFY_OTP_LIMIT,
} from './otp.constants';

@ApiTags('Auth')
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
  @ApiOperation({
    summary: 'Request signup email OTP',
    description:
      'Signup only (`EMAIL_VERIFICATION`). Generates a one-time code and sends it via SendByte. OTP is never returned. Returning users should use POST /auth/login.',
  })
  @ApiOkResponse({ type: RequestOtpResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Account already exists — use login',
  })
  @ApiTooManyRequestsResponse({
    type: ApiErrorResponseDto,
    description: 'Resend cooldown or rate limit',
  })
  async requestOtp(@Body() body: RequestOtpDto, @Req() req: Request) {
    return this.authService.requestOtp(body.email, {
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
  @ApiOperation({
    summary: 'Verify signup OTP and set password',
    description: `Completes signup: verifies the email OTP, stores the password hash, and sets the httpOnly \`${AUTH_COOKIE_NAME}\` cookie.`,
  })
  @ApiOkResponse({ type: VerifyOtpResponseDto })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid, expired, or consumed OTP',
  })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponseDto })
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, accessToken } = await this.authService.verifyOtp(
      body.email,
      body.code,
      body.password,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    this.setSessionCookie(res, accessToken);
    return response;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: AUTH_VERIFY_OTP_LIMIT,
      ttl: AUTH_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Log in with email and password',
    description:
      'For returning creators. Does not send or require an OTP. Sets the session cookie on success.',
  })
  @ApiOkResponse({ type: VerifyOtpResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, accessToken } = await this.authService.loginWithPassword(
      body.email,
      body.password,
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
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: 'Get current authenticated creator user' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async me(@CurrentUser() user: AuthUserPayload) {
    const publicUser = await this.authService.getUserById(user.sub);
    if (!publicUser) {
      return { user: null };
    }
    return { user: publicUser };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear session cookie' })
  @ApiOkResponse({ type: LogoutResponseDto })
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
