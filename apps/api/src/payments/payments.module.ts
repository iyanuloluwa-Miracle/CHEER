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
 * Bachs when BACHS_API_KEY is set; local stub otherwise.
 * Production env validation requires BACHS_API_KEY — stub is never selected there.
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
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        if (!key) {
          if (nodeEnv === 'production') {
            throw new Error(
              'BACHS_API_KEY is required in production — refusing stub payment provider',
            );
          }
          return stub;
        }
        return bachs;
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER, BachsHttpClient],
})
export class PaymentsModule {}
