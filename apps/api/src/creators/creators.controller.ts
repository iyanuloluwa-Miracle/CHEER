import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AUTH_COOKIE_NAME } from '../auth/otp.constants';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { CreatorsService } from './creators.service';
import {
  CreateCreatorDto,
  ReplaceSocialLinksDto,
  UpdateCreatorProfileDto,
  UpdateCreatorSettingsDto,
} from './dto/creators.dto';
import {
  CreatorMeEnvelopeDto,
  CreatorProfileEnvelopeDto,
  UsernameAvailabilityResponseDto,
} from './dto/creator-response.dto';

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creators: CreatorsService) {}

  @Get('username-available')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Check username availability',
    description:
      'Validates format, reserved names, and uniqueness. Does not require auth.',
  })
  @ApiQuery({
    name: 'username',
    required: true,
    example: 'dina',
    description: 'Username to check (normalized to lowercase)',
  })
  @ApiOkResponse({ type: UsernameAvailabilityResponseDto })
  async usernameAvailable(@Query('username') username: string) {
    return this.creators.checkUsernameAvailability(username ?? '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: 'Get the authenticated creator profile' })
  @ApiOkResponse({ type: CreatorMeEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async me(@CurrentUser() user: AuthUserPayload) {
    const profile = await this.creators.getMe(user.sub);
    return { profile };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Create creator profile (onboarding)',
    description:
      'Creates the Tippy page for the authenticated user. Username must be unique and not reserved.',
  })
  @ApiCreatedResponse({ type: CreatorProfileEnvelopeDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Username taken or profile already exists',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async create(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateCreatorDto,
  ) {
    const profile = await this.creators.create(user.sub, body);
    return { profile };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Update own profile fields',
    description:
      'Ownership is derived from the session — never from a client userId.',
  })
  @ApiOkResponse({ type: CreatorProfileEnvelopeDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async updateProfile(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateCreatorProfileDto,
  ) {
    const profile = await this.creators.updateProfile(user.sub, body);
    return { profile };
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Update support settings',
    description: 'Currency, support message, and suggested tip amounts.',
  })
  @ApiOkResponse({ type: CreatorProfileEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async updateSettings(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateCreatorSettingsDto,
  ) {
    const profile = await this.creators.updateSettings(user.sub, body);
    return { profile };
  }

  @Put('me/social-links')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Replace social links',
    description: 'Full replace of the authenticated creator’s social links.',
  })
  @ApiOkResponse({ type: CreatorProfileEnvelopeDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  async replaceSocialLinks(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ReplaceSocialLinksDto,
  ) {
    const profile = await this.creators.replaceSocialLinks(user.sub, body);
    return { profile };
  }

  @Get(':username')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get public creator profile',
    description: 'Public Tippy page data for `/{username}`. No auth required.',
  })
  @ApiOkResponse({ type: CreatorProfileEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async getPublic(@Param('username') username: string) {
    const profile = await this.creators.getPublicByUsername(username);
    return { profile };
  }
}
