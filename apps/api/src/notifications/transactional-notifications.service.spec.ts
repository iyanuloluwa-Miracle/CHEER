import { Test, TestingModule } from '@nestjs/testing';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SendByteService } from './sendbyte.service';
import { TransactionalNotificationsService } from './transactional-notifications.service';

describe('TransactionalNotificationsService', () => {
  let service: TransactionalNotificationsService;
  let prisma: {
    notification: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let sendByte: { sendEmail: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'n1' }),
        update: jest.fn().mockResolvedValue({ id: 'n1' }),
      },
    };
    sendByte = {
      sendEmail: jest.fn().mockResolvedValue({
        id: 'em_1',
        provider: 'SENDBYTE',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionalNotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SendByteService, useValue: sendByte },
      ],
    }).compile();

    service = module.get(TransactionalNotificationsService);
  });

  it('sends tip email and persists SENT with provider message id', async () => {
    const result = await service.notifyTipReceived({
      tipId: 'tip_1',
      userId: 'user_1',
      email: 'dina@example.com',
      amount: '2500.00',
      currency: 'NGN',
      isAnonymous: true,
      supporterName: null,
    });

    expect(result.status).toBe('sent');
    expect(result.providerMessageId).toBe('em_1');
    expect(sendByte.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'tip_paid_tip_1',
        subject: 'Someone supported your work',
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('skips duplicate tip notification when already SENT', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'n_existing',
      status: NotificationStatus.SENT,
    });

    const result = await service.notifyTipReceived({
      tipId: 'tip_1',
      userId: 'user_1',
      email: 'dina@example.com',
      amount: '2500.00',
      currency: 'NGN',
      isAnonymous: false,
      supporterName: 'Ada',
    });

    expect(result.status).toBe('skipped');
    expect(sendByte.sendEmail).not.toHaveBeenCalled();
  });

  it('records FAILED without throwing when SendByte fails (non-critical)', async () => {
    sendByte.sendEmail.mockRejectedValue(new Error('provider down'));
    prisma.notification.create.mockResolvedValue({ id: 'n_fail' });

    const result = await service.notifyTipReceived({
      tipId: 'tip_fail',
      userId: 'user_1',
      email: 'dina@example.com',
      amount: '1000.00',
      currency: 'NGN',
      isAnonymous: true,
      supporterName: null,
    });

    expect(result.status).toBe('failed');
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(sendByte.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('retries once then succeeds', async () => {
    sendByte.sendEmail
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ id: 'em_retry', provider: 'SENDBYTE' });

    const result = await service.notifyTipReceived({
      tipId: 'tip_retry',
      userId: 'user_1',
      email: 'dina@example.com',
      amount: '1000.00',
      currency: 'NGN',
      isAnonymous: true,
      supporterName: null,
    });

    expect(result.status).toBe('sent');
    expect(sendByte.sendEmail).toHaveBeenCalledTimes(2);
    expect(result.providerMessageId).toBe('em_retry');
  });

  it('rethrows on critical OTP failure after recording FAILED', async () => {
    sendByte.sendEmail.mockRejectedValue(new Error('provider down'));
    prisma.notification.create.mockResolvedValue({ id: 'n_otp_fail' });

    await expect(
      service.notifyOtp({
        userId: 'user_1',
        email: 'a@b.com',
        code: '123456',
        challengeId: 'chal_1',
        purpose: 'EMAIL_VERIFICATION',
      }),
    ).rejects.toThrow('provider down');

    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('sends account verified email', async () => {
    const result = await service.notifyAccountVerified({
      userId: 'user_1',
      email: 'a@b.com',
    });
    expect(result.status).toBe('sent');
    expect(sendByte.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your account was verified',
        idempotencyKey: 'account_verified_user_1',
      }),
    );
  });
});
