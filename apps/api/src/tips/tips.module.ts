import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { TipsController } from './tips.controller';
import { TipsService } from './tips.service';

/** Phase 6 — public tip creation + checkout init (stub provider). */
@Module({
  imports: [PaymentsModule],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
