import { Module } from '@nestjs/common';
import { SendByteService } from './sendbyte.service';

@Module({
  providers: [SendByteService],
  exports: [SendByteService],
})
export class NotificationsModule {}
