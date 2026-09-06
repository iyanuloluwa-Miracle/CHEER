import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SendByteService } from './sendbyte.service';

jest.mock('@sendbyte/node', () => {
  class SendByteError extends Error {
    code = 'test_error';
    status = 500;
    docsUrl = '';
  }
  return {
    SendByte: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
    SendByteError,
  };
});

import { SendByte, SendByteError } from '@sendbyte/node';

describe('SendByteService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses DEV_LOG when API key is missing in non-production', async () => {
    const service = new SendByteService({
      get: (key: string, fallback?: string) => {
        if (key === 'SENDBYTE_API_KEY') return '';
        if (key === 'NODE_ENV') return 'test';
        if (key === 'SENDBYTE_FROM_EMAIL')
          return 'TippyMe <noreply@test.local>';
        return fallback;
      },
    } as ConfigService);

    const result = await service.sendEmail({
      to: 'a@b.com',
      subject: 'Test',
      html: '<p>hi</p>',
    });

    expect(result.provider).toBe('DEV_LOG');
    expect(result.id).toMatch(/^dev_/);
  });

  it('throws when SendByte SDK fails', async () => {
    const send = jest.fn().mockRejectedValue(
      Object.assign(new SendByteError('fail'), {
        code: 'domain_not_verified',
        status: 422,
      }),
    );
    (SendByte as unknown as jest.Mock).mockImplementation(() => ({
      emails: { send },
    }));

    const service = new SendByteService({
      get: (key: string, fallback?: string) => {
        if (key === 'SENDBYTE_API_KEY') return 'sk_test_abc';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SENDBYTE_FROM_EMAIL')
          return 'TippyMe <noreply@test.local>';
        return fallback;
      },
    } as ConfigService);

    await expect(
      service.sendEmail({
        to: 'a@b.com',
        subject: 'OTP',
        html: '<p>code</p>',
        idempotencyKey: 'otp-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends via SDK when configured', async () => {
    const send = jest.fn().mockResolvedValue({ id: 'em_123' });
    (SendByte as unknown as jest.Mock).mockImplementation(() => ({
      emails: { send },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendByteService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) => {
              if (key === 'SENDBYTE_API_KEY') return 'sk_test_abc';
              if (key === 'NODE_ENV') return 'development';
              if (key === 'SENDBYTE_FROM_EMAIL')
                return 'TippyMe <noreply@test.local>';
              return fallback;
            },
          },
        },
      ],
    }).compile();

    const service = module.get(SendByteService);
    const result = await service.sendEmail({
      to: 'creator@example.com',
      subject: 'Your TippyMe verification code',
      html: '<p>x</p>',
      text: 'x',
      idempotencyKey: 'otp-chal',
    });

    expect(result).toEqual({ id: 'em_123', provider: 'SENDBYTE' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        idempotency_key: 'otp-chal',
      }),
    );
  });
});
