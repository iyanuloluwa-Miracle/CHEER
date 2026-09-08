import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { PaymentsService } from '../payments/payments.service';
import { WebhookFulfilmentService } from './webhook-fulfilment.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly fulfilment: WebhookFulfilmentService,
  ) {}

  /**
   * Bachs webhook receiver.
   * Requires raw body (Nest rawBody: true) for signature verification.
   * Flow: verify signature → identify tip → GET checkout verify → validate → update.
   */
  @Post('bachs')
  @HttpCode(200)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Bachs webhook endpoint',
    description:
      'Verifies X-Bachs-Signature + timestamp, dedupes on evt id, server-verifies checkout, updates tip/payment only when trusted.',
  })
  @ApiOkResponse({ description: 'Acknowledged' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async bachs(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'WEBHOOK_MALFORMED',
        message: 'Empty webhook payload.',
      });
    }

    const parsed = await this.payments.handleWebhook({
      rawBody,
      headers,
    });

    if (!parsed.acknowledged) {
      // Distinguishing signature failure vs malformed JSON is done in provider;
      // missing/invalid signature → 401; provider returns acknowledged false for both.
      const raw =
        typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      let malformed = false;
      try {
        JSON.parse(raw);
      } catch {
        malformed = true;
      }

      if (malformed) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'WEBHOOK_MALFORMED',
          message: 'Malformed webhook payload.',
        });
      }

      throw new UnauthorizedException({
        statusCode: 401,
        error: 'WEBHOOK_INVALID',
        message: 'Invalid webhook signature.',
      });
    }

    const result = await this.fulfilment.processSignedBachsEvent({
      providerEventId: parsed.providerEventId,
      eventType: parsed.eventType,
      tipId: parsed.tipId,
      verification: parsed.verification,
    });

    if (result.retryable) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'WEBHOOK_VERIFY_FAILED',
        message: 'Unable to verify payment with provider. Please retry.',
      });
    }

    return { ok: true, outcome: result.outcome };
  }
}
