import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../common/utils/order-status';

// Mock getTopupPackage
jest.mock('../../common/config/topup', () => ({
  getTopupPackage: jest.fn().mockResolvedValue({
    packageId: 'pkg-1',
    price: 100,
    paidPts: 1000,
    bonusPts: 500,
  }),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn().mockResolvedValue({
                id: 'order-1',
                userId: 'user-1',
                packageId: 'pkg-1',
                amount: 100,
                priceSnapshot: 100,
                status: ORDER_STATUS.PENDING,
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'order-1',
                userId: 'user-1',
                packageId: 'pkg-1',
                amount: 100,
                status: ORDER_STATUS.PAID,
              }),
              update: jest.fn().mockResolvedValue({
                id: 'order-1',
                status: ORDER_STATUS.PAID,
              }),
            },
            paymentIntent: {
              create: jest.fn().mockResolvedValue({
                id: 'payment-1',
                orderId: 'order-1',
                userId: 'user-1',
                provider: 'stripe',
                status: PAYMENT_STATUS.AUTHORIZED,
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'payment-1',
                orderId: 'order-1',
                userId: 'user-1',
                status: PAYMENT_STATUS.AUTHORIZED,
              }),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn().mockResolvedValue({
                id: 'payment-1',
                status: PAYMENT_STATUS.CAPTURED,
              }),
            },
            wallet: {
              findUnique: jest.fn().mockResolvedValue({
                userId: 'user-1',
                paidPts: 1000,
                bonusPts: 500,
              }),
              upsert: jest.fn().mockResolvedValue({
                userId: 'user-1',
                paidPts: 2000,
                bonusPts: 1000,
              }),
            },
            paymentRetry: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn().mockResolvedValue({
                orderId: 'order-1',
                status: 'PENDING',
              }),
              update: jest.fn().mockResolvedValue({
                orderId: 'order-1',
                status: 'SUCCEEDED',
              }),
            },
            $transaction: jest.fn().mockImplementation((callback) => {
              const txMock = {
                wallet: {
                  upsert: jest.fn().mockResolvedValue({
                    userId: 'user-1',
                    paidPts: 2000,
                    bonusPts: 1000,
                  }),
                  findUnique: jest.fn().mockResolvedValue({
                    userId: 'user-1',
                    paidPts: 1000,
                    bonusPts: 500,
                  }),
                },
                order: {
                  update: jest.fn().mockResolvedValue({
                    id: 'order-1',
                    status: ORDER_STATUS.PAID,
                  }),
                },
                paymentIntent: {
                  update: jest.fn().mockResolvedValue({
                    id: 'payment-1',
                    status: PAYMENT_STATUS.CAPTURED,
                  }),
                },
              };
              return callback(txMock);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建订单', async () => {
      const result = await service.create('user-1', 'pkg-1', 100);

      expect(result).toBeDefined();
      expect(result?.order).toBeDefined();
      expect(result?.payment).toBeDefined();
      expect(prisma.order.create).toHaveBeenCalled();
    });

    it('应该在金额不匹配时返回null', async () => {
      const result = await service.create('user-1', 'pkg-1', 200);

      expect(result).toBeNull();
    });

    it('应该在套餐不存在时返回null', async () => {
      jest.spyOn(require('../../common/config/topup'), 'getTopupPackage').mockResolvedValueOnce(null);

      const result = await service.create('user-1', 'invalid-pkg', 100);

      expect(result).toBeNull();
    });

    it('应该支持幂等性key', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-1',
        userId: 'user-1',
        packageId: 'pkg-1',
        amount: 100,
        priceSnapshot: 100,
        status: ORDER_STATUS.PENDING,
        paymentIntents: [{
          id: 'payment-1',
          orderId: 'order-1',
          provider: 'stripe',
          status: PAYMENT_STATUS.AUTHORIZED,
          createdAt: new Date(),
        }],
      } as any);

      const result = await service.create('user-1', 'pkg-1', 100, 'stripe', 'idempotency-key-1');

      expect(result).toBeDefined();
    });
  });

  describe('confirm', () => {
    it('应该成功确认支付', async () => {
      const result = await service.confirm('user-1', 'payment-1');

      expect(result.ok).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.wallet).toBeDefined();
    });

    it('应该在支付不存在时返回失败', async () => {
      jest.spyOn(prisma.paymentIntent, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.confirm('user-1', 'invalid-payment');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('PAYMENT_NOT_FOUND');
    });

    it('应该在订单不存在时返回失败', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.confirm('user-1', 'payment-1');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('ORDER_NOT_FOUND');
    });

    it('应该在金额不匹配时返回失败', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-1',
        amount: 200, // 不匹配
        packageId: 'pkg-1',
        userId: 'user-1',
      } as any);

      const result = await service.confirm('user-1', 'payment-1');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('AMOUNT_MISMATCH');
    });
  });

  describe('refund', () => {
    it('应该成功退款', async () => {
      const result = await service.refund('user-1', 'order-1');

      expect(result.ok).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.wallet).toBeDefined();
    });

    it('应该在订单不存在时返回失败', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.refund('user-1', 'invalid-order');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('ORDER_NOT_FOUND');
    });

    it('应该在订单未支付时返回失败', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-1',
        status: ORDER_STATUS.PENDING,
        userId: 'user-1',
      } as any);

      const result = await service.refund('user-1', 'order-1');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('ORDER_NOT_PAID');
    });

    it('应该在点数不足时返回失败', async () => {
      jest.spyOn(prisma.wallet, 'findUnique').mockResolvedValueOnce({
        userId: 'user-1',
        paidPts: 100, // 不足
        bonusPts: 100,
      } as any);

      const result = await service.refund('user-1', 'order-1');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_POINTS');
    });
  });

  describe('enqueueRetry', () => {
    it('应该成功入队重试', async () => {
      await service.enqueueRetry('user-1', 'order-1', 'payment-1', 'test reason');

      expect(prisma.paymentRetry.upsert).toHaveBeenCalled();
    });
  });

  describe('processRetries', () => {
    it('应该处理待重试的支付', async () => {
      jest.spyOn(prisma.paymentRetry, 'findMany').mockResolvedValueOnce([
        {
          orderId: 'order-1',
          userId: 'user-1',
          paymentId: 'payment-1',
          status: 'PENDING',
          attempts: 0,
        } as any,
      ]);

      await service.processRetries();

      expect(prisma.paymentRetry.findMany).toHaveBeenCalled();
    });
  });
});
