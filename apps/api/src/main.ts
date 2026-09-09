import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { setupSwagger } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  const port = config.get<number>('PORT', 3001);
  const appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix(apiPrefix);

  // Behind a single reverse proxy (nginx/Cloudflare), trust one hop so
  // throttler client IP and secure cookies resolve correctly.
  if (nodeEnv === 'production') {
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.getInstance().set('trust proxy', 1);
  }

  app.use(
    helmet({
      // Allow Swagger UI assets in non-production
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );
  app.use(cookieParser());

  const corsOrigins =
    nodeEnv === 'production'
      ? [appUrl]
      : [
          appUrl,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://[::1]:3000',
        ];

  app.enableCors({
    origin: [...new Set(corsOrigins)],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Idempotency-Key',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (nodeEnv !== 'production') {
    setupSwagger(app, apiPrefix);
  }

  await app.listen(port);

  logger.log(`TippyMe API listening on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
  }
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`CORS origin: ${appUrl}`);
}

void bootstrap();
