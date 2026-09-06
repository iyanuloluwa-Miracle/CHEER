import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { AUTH_COOKIE_NAME } from '../auth/otp.constants';

/**
 * OpenAPI / Swagger UI for the TippyMe NestJS API.
 * Served at /api/docs (JSON at /api/docs-json).
 */
export function setupSwagger(app: INestApplication, apiPrefix: string) {
  const config = new DocumentBuilder()
    .setTitle('TippyMe API')
    .setDescription(
      [
        'Creator-support API for TippyMe (`cheer.cash`).',
        '',
        '**Auth:**',
        '- **Signup:** email OTP (`EMAIL_VERIFICATION` via SendByte) + set password',
        '- **Login:** email + password via `POST /auth/login` (no OTP)',
        '',
        'Successful auth sets an httpOnly cookie `' +
          AUTH_COOKIE_NAME +
          '`. Protected routes also accept `Authorization: Bearer <jwt>`.',
        '',
        '**Supporters** do not need accounts. Tip payments (Bachs) are not exposed yet.',
        '',
        'OTP codes are never returned in API responses.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addCookieAuth(AUTH_COOKIE_NAME, {
      type: 'apiKey',
      in: 'cookie',
      name: AUTH_COOKIE_NAME,
      description:
        'JWT session cookie set by POST /auth/verify-otp or POST /auth/login',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Optional alternative to the session cookie',
      },
      'bearer',
    )
    .addTag('Health', 'Service health')
    .addTag('Auth', 'Creator signup OTP + password login')
    .addTag('Creators', 'Creator profiles, usernames, and public Tippy pages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
    customSiteTitle: 'TippyMe API Docs',
  });
}
