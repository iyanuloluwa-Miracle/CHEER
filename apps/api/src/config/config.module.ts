import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed accessors for configuration. Secrets stay server-side only.
 */
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
