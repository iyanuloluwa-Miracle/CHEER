import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiErrorResponseDto } from '../auth/dto/auth-response.dto';
import { PaymentsService } from './payments.service';

class PaymentStatusResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'PaymentTransaction id' })
  paymentId!: string;

  @ApiProperty({ description: 'Related tip id' })
  tipId!: string;

  @ApiProperty({
    enum: ['CREATED', 'CHECKOUT_PENDING', 'PAID', 'FAILED', 'EXPIRED'],
  })
  tipStatus!: string;

  @ApiProperty({
    enum: [
      'PENDING',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
      'EXPIRED',
    ],
  })
  paymentStatus!: string;

  @ApiProperty({ example: '2500.00' })
  amount!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({
    description:
      'True only when tip is PAID after provider verification — never from redirect alone',
  })
  paid!: boolean;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get(':id/status')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Public payment/tip status for confirmation polling',
    description:
      'Safe fields only. `:id` may be a PaymentTransaction id or Tip id. Frontend must not decide success — this reflects backend state only.',
  })
  @ApiOkResponse({ type: PaymentStatusResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async status(@Param('id') id: string) {
    const result = await this.payments.getPublicPaymentStatus(id);
    if (!result) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found.',
      });
    }
    return result;
  }
}
