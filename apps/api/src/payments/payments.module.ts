import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BachsHttpClient } from './bachs/bachs-http.client';
import type { PaymentProviderPort } from './payment-provider.port';
import { PAYMENT_PROVIDER } from './payment-provider.port';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BachsPaymentProvider } from './providers/bachs-payment.provider';
import { StubPaymentProvider } from './providers/stub-payment.provider';

/**
 * Phase 7–8 — Bachs when BACHS_API_KEY is set; stub otherwise.
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [
    BachsHttpClient,
    BachsPaymentProvider,
    StubPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, BachsPaymentProvider, StubPaymentProvider],
      useFactory: (
        config: ConfigService,
        bachs: BachsPaymentProvider,
        stub: StubPaymentProvider,
      ): PaymentProviderPort => {
        const key = config.get<string>('BACHS_API_KEY')?.trim();
        return key ? bachs : stub;
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER, BachsHttpClient],
})
export class PaymentsModule {}
