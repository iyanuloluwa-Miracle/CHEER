import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendByte, SendByteError } from '@sendbyte/node';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  id: string;
  provider: 'SENDBYTE' | 'DEV_LOG';
}

/**
 * Isolated SendByte provider. Auth and other modules must call this —
 * never the SendByte SDK directly.
 */
@Injectable()
export class SendByteService {
  private readonly logger = new Logger(SendByteService.name);
  private readonly client: SendByte | null;
  private readonly fromEmail: string;
  private readonly nodeEnv: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDBYTE_API_KEY')?.trim();
    this.fromEmail =
      this.config.get<string>('SENDBYTE_FROM_EMAIL') ??
      'TippyMe <noreply@example.com>';
    this.nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (apiKey) {
      this.client = new SendByte(apiKey);
    } else {
      this.client = null;
      if (this.nodeEnv === 'production') {
        this.logger.error(
          'SENDBYTE_API_KEY is missing in production — email delivery disabled',
        );
      } else {
        this.logger.warn(
          'SENDBYTE_API_KEY not set — OTP emails will use DEV_LOG transport',
        );
      }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.client) {
      if (this.nodeEnv === 'production') {
        throw new ServiceUnavailableException(
          'Email delivery is temporarily unavailable',
        );
      }
      // Never include OTP or message body in logs.
      this.logger.log(
        `DEV_LOG email queued to=${params.to} subject=${params.subject}`,
      );
      return {
        id: `dev_${Date.now()}`,
        provider: 'DEV_LOG',
      };
    }

    try {
      const payload: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text?: string;
        idempotency_key?: string;
      } = {
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      };

      if (params.text) {
        payload.text = params.text;
      }
      if (params.idempotencyKey) {
        payload.idempotency_key = params.idempotencyKey;
      }

      const { id } = await this.client.emails.send(payload);
      return { id, provider: 'SENDBYTE' };
    } catch (err) {
      if (err instanceof SendByteError) {
        this.logger.error(
          `SendByte error code=${err.code} status=${err.status}`,
        );
      } else {
        this.logger.error('SendByte send failed');
      }
      throw new ServiceUnavailableException(
        'Unable to send email. Please try again shortly.',
      );
    }
  }
}
