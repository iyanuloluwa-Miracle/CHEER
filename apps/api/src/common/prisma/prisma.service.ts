import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  constructor() {
    super({
      datasources: {
        db: {
          url: PrismaService.resolveDatabaseUrl(),
        },
      },
    });
  }

  private static resolveDatabaseUrl(): string {
    const base =
      process.env.DATABASE_URL ??
      'postgresql://cheer:cheer@localhost:5432/cheer?schema=public';
    if (base.includes('connect_timeout=')) {
      return base;
    }
    const join = base.includes('?') ? '&' : '?';
    return `${base}${join}connect_timeout=5`;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Connected to PostgreSQL via Prisma');
    } catch (error) {
      this.connected = false;
      this.logger.error(
        'PostgreSQL connection failed — API will report degraded health until DATABASE_URL is reachable',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  isConnected() {
    return this.connected;
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}
