import { Module } from '@nestjs/common';
import { SendByteService } from './sendbyte.service';
import { TransactionalNotificationsService } from './transactional-notifications.service';

@Module({
  providers: [SendByteService, TransactionalNotificationsService],
  exports: [SendByteService, TransactionalNotificationsService],
})
export class NotificationsModule {}
