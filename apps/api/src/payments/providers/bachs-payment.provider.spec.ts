import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BachsHttpClient } from '../bachs/bachs-http.client';
import { BachsProviderError } from '../bachs/bachs.errors';
import { verifyBachsWebhookSignature } from '../bachs/bachs.webhook';
import { BachsPaymentProvider } from './bachs-payment.provider';

describe('verifyBachsWebhookSignature', () => {
  it('accepts a valid signature within tolerance', () => {
    const secret = 'whsec_test';
    const rawBody = '{"id":"evt_1","type":"collection.succeeded"}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    expect(
      verifyBachsWebhookSignature({
        rawBody,
        secret,
        timestampHeader: timestamp,
        signatureHeader: signature,
      }),
    ).toBe(true);
  });

  it('rejects stale timestamps', () => {
    const secret = 'whsec_test';
    const rawBody = '{}';
    const timestamp = String(Math.floor(Date.now() / 1000) - 10_000);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    expect(
      verifyBachsWebhookSignature({
        rawBody,
        secret,
        timestampHeader: timestamp,
        signatureHeader: signature,
      }),
    ).toBe(false);
  });
});

describe('BachsPaymentProvider', () => {
  let provider: BachsPaymentProvider;
  let http: {
    createCheckoutSession: jest.Mock;
    getCheckoutSession: jest.Mock;
  };

  const baseInput = {
    tipId: 'tip_abc',
    paymentTransactionId: 'pay_abc',
    internalReference: 'idem_key_abc123',
    amount: '2500.00',
    currency: 'NGN',
    creatorUsername: 'dina',
    successUrl: 'http://localhost:3000/support/confirm/tip_abc',
    cancelUrl: 'http://localhost:3000/dina',
    customerEmail: 'supporter@example.com',
    customerName: 'Ada',
  };

  beforeEach(async () => {
    http = {
      createCheckoutSession: jest.fn(),
      getCheckoutSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BachsPaymentProvider,
        { provide: BachsHttpClient, useValue: http },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'BACHS_WEBHOOK_SECRET' ? 'whsec_test' : undefined,
          },
        },
      ],
    }).compile();

    provider = module.get(BachsPaymentProvider);
  });

  it('initializes checkout successfully', async () => {
    http.createCheckoutSession.mockResolvedValue({
      checkout_id: 'chk_test123',
      checkout_url: 'https://checkout.bachs.io/c/test',
      status: 'open',
      expires_at: '2026-09-07T12:00:00Z',
      created_at: '2026-09-07T11:00:00Z',
      reference: 'tip_abc',
    });

    const result = await provider.initializePayment(baseInput);

    expect(result.checkoutUrl).toBe('https://checkout.bachs.io/c/test');
    expect(result.providerReference).toBe('chk_test123');
    expect(result.rawStatus).toBe('open');
    expect(http.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        pricing: { currency: 'NGN', amount: '2500.00' },
        customer: { email: 'supporter@example.com', name: 'Ada' },
        reference: 'tip_abc',
      }),
      'idem_key_abc123',
    );
  });

  it('fails initialization when customer email missing', async () => {
    await expect(
      provider.initializePayment({ ...baseInput, customerEmail: undefined }),
    ).rejects.toBeInstanceOf(BachsProviderError);
    expect(http.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('maps provider errors on failed initialization', async () => {
    http.createCheckoutSession.mockRejectedValue(
      new BachsProviderError('PROVIDER', 'Bachs API error (500)', {
        httpStatus: 500,
      }),
    );

    await expect(provider.initializePayment(baseInput)).rejects.toMatchObject({
      kind: 'PROVIDER',
    });
  });

  it('maps timeout errors', async () => {
    http.createCheckoutSession.mockRejectedValue(
      new BachsProviderError('TIMEOUT', 'Bachs request timed out'),
    );

    await expect(provider.initializePayment(baseInput)).rejects.toMatchObject({
      kind: 'TIMEOUT',
    });
  });

  it('verifyPayment maps open checkout to pending', async () => {
    http.getCheckoutSession.mockResolvedValue({
      checkout_id: 'chk_test123',
      status: 'open',
      payment_status: null,
      amount: '2500.00',
      currency: 'NGN',
    });

    const result = await provider.verifyPayment({
      providerReference: 'chk_test123',
    });

    expect(result.status).toBe('pending');
    expect(result.providerReference).toBe('chk_test123');
  });

  it('verifyPayment maps completed checkout to succeeded', async () => {
    http.getCheckoutSession.mockResolvedValue({
      checkout_id: 'chk_test123',
      status: 'completed',
      payment_status: 'succeeded',
      amount: '2500.00',
      currency: 'NGN',
    });

    const result = await provider.verifyPayment({
      providerReference: 'chk_test123',
    });

    expect(result.status).toBe('succeeded');
  });

  it('handleWebhook rejects invalid signatures', async () => {
    const result = await provider.handleWebhook({
      rawBody: '{}',
      headers: {
        'x-bachs-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-bachs-signature': 'deadbeef',
      },
    });
    expect(result.acknowledged).toBe(false);
  });

  it('handleWebhook accepts collection.succeeded', async () => {
    const rawBody = JSON.stringify({
      id: 'evt_1',
      type: 'collection.succeeded',
      data: {
        checkout_id: 'chk_test123',
        status: 'succeeded',
        amount: '2500.00',
        currency: 'NGN',
        reference: 'tip_abc',
      },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', 'whsec_test')
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    const result = await provider.handleWebhook({
      rawBody,
      headers: {
        'x-bachs-timestamp': timestamp,
        'x-bachs-signature': signature,
      },
    });

    expect(result.acknowledged).toBe(true);
    expect(result.providerEventId).toBe('evt_1');
    expect(result.verification?.status).toBe('succeeded');
    expect(result.tipId).toBe('tip_abc');
  });
});
