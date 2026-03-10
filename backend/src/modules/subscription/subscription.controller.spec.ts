import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let subscriptionService: { subscribe: jest.Mock; cancel: jest.Mock };
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    subscriptionService = {
      subscribe: jest.fn().mockResolvedValue({ id: 'sub-1', planId: 'vip' }),
      cancel: jest.fn().mockResolvedValue(null),
    };

    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: subscriptionService,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs normalized attribution when subscribe succeeds', async () => {
    const req = { userId: 'user-1' } as any;
    const res = { status: jest.fn() } as any;

    const result = await controller.subscribe(
      {
        planId: 'vip',
        attribution: {
          promotionId: 'promo-1',
          offerId: 'subscribe_vip',
          entryPoint: 'STORE_UPSELL',
          sourcePath: '/store',
          returnTo: '/account',
        },
      },
      req,
      res,
    );

    expect(subscriptionService.subscribe).toHaveBeenCalledWith('user-1', 'vip');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'subscription_create',
          userId: 'user-1',
        }),
      }),
    );
    expect(prisma.auditLog.create.mock.calls[0][0].data.payload).toContain('"promotionId":"promo-1"');
    expect(result).toEqual({ subscription: { id: 'sub-1', planId: 'vip' } });
  });
});
