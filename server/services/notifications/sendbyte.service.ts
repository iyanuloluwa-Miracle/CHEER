import { SendByte, SendByteError } from '@sendbyte/node';
import { ApiError } from '../../lib/errors';
import { getServerEnv } from '../../lib/env';

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

export interface SendByteServiceOptions {
  apiKey?: string | null;
  fromEmail?: string;
  nodeEnv?: string;
}

/**
 * Isolated SendByte provider. Auth and other modules must call this —
 * never the SendByte SDK directly.
 */
export class SendByteService {
  private readonly client: SendByte | null;
  private readonly fromEmail: string;
  private readonly nodeEnv: string;

  constructor(options?: SendByteServiceOptions) {
    const env = getServerEnv();
    const apiKey = (options?.apiKey ?? env.SENDBYTE_API_KEY)?.trim();
    this.fromEmail =
      options?.fromEmail ??
      env.SENDBYTE_FROM_EMAIL ??
      'TippyMe <noreply@example.com>';
    this.nodeEnv = options?.nodeEnv ?? env.NODE_ENV ?? 'development';

    if (apiKey) {
      this.client = new SendByte(apiKey);
    } else if (this.nodeEnv === 'production') {
      throw new Error('SENDBYTE_API_KEY is required in production');
    } else {
      this.client = null;
      console.warn(
        'SENDBYTE_API_KEY not set — OTP emails will use DEV_LOG transport',
      );
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.client) {
      if (this.nodeEnv === 'production') {
        throw new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'Email delivery is temporarily unavailable',
        );
      }
      // Never include OTP or message body in logs.
      console.info(
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
        console.error(
          `SendByte error code=${err.code} status=${err.status}`,
        );
      } else {
        console.error('SendByte send failed');
      }
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'Unable to send email. Please try again shortly.',
      );
    }
  }
}
