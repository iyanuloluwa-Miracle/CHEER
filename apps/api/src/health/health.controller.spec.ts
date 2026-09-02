import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok when database responds', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('cheer-api');
    expect(result.database).toBe('up');
    expect(typeof result.timestamp).toBe('string');
  });
});
