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
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatorsService } from './creators.service';
import {
  CreateCreatorDto,
  ReplaceSocialLinksDto,
  UpdateCreatorProfileDto,
  UpdateCreatorSettingsDto,
} from './dto/creators.dto';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creators: CreatorsService) {}

  @Get('username-available')
  @SkipThrottle()
  async usernameAvailable(@Query('username') username: string) {
    return this.creators.checkUsernameAvailability(username ?? '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUserPayload) {
    const profile = await this.creators.getMe(user.sub);
    return { profile };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateCreatorDto,
  ) {
    const profile = await this.creators.create(user.sub, body);
    return { profile };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateCreatorProfileDto,
  ) {
    const profile = await this.creators.updateProfile(user.sub, body);
    return { profile };
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateCreatorSettingsDto,
  ) {
    const profile = await this.creators.updateSettings(user.sub, body);
    return { profile };
  }

  @Put('me/social-links')
  @UseGuards(JwtAuthGuard)
  async replaceSocialLinks(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ReplaceSocialLinksDto,
  ) {
    const profile = await this.creators.replaceSocialLinks(user.sub, body);
    return { profile };
  }

  @Get(':username')
  @SkipThrottle()
  async getPublic(@Param('username') username: string) {
    const profile = await this.creators.getPublicByUsername(username);
    return { profile };
  }
}
