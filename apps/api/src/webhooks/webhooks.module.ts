import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhookFulfilmentService } from './webhook-fulfilment.service';
import { WebhooksController } from './webhooks.controller';

/** Phase 8 — Bachs webhook receiver + fulfilment. */
@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [WebhooksController],
  providers: [WebhookFulfilmentService],
})
export class WebhooksModule {}
