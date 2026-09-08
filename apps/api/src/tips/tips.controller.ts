import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import {
  CreateTipResponseDto,
  PublicTipEnvelopeDto,
} from './dto/tip-response.dto';
import {
  TIP_CREATE_THROTTLE_LIMIT,
  TIP_CREATE_THROTTLE_TTL_MS,
} from './tips.constants';
import { TipsService } from './tips.service';

@ApiTags('Tips')
@Controller('tips')
export class TipsController {
  constructor(private readonly tips: TipsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({
    default: {
      limit: TIP_CREATE_THROTTLE_LIMIT,
      ttl: TIP_CREATE_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Create a tip and start checkout',
    description:
      'Public — no account required. Creates Tip (CREATED→CHECKOUT_PENDING) and PaymentTransaction (PENDING→PROCESSING). Does not mark paid. Amount/currency/creator are server-validated.',
  })
  @ApiCreatedResponse({ type: CreateTipResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponseDto })
  async create(
    @Body() body: CreateTipDto,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    return this.tips.createTip(body, {
      idempotencyKeyHeader,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id/public')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Public tip confirmation payload',
    description:
      'Safe fields only for the confirmation page. Status is never upgraded from a browser redirect.',
  })
  @ApiOkResponse({ type: PublicTipEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async getPublic(@Param('id') id: string) {
    const tip = await this.tips.getPublicTip(id);
    return { tip };
  }
}
