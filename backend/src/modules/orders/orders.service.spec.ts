import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDER_STATUS } from '../../common/utils/order-status';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'order-1',
                  userId: 'user-1',
                  status: ORDER_STATUS.PAID,
                  createdAt: new Date(),
                },
              ]),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            paymentIntent: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'payment-1',
                  orderId: 'order-1',
                  createdAt: new Date(),
                },
              ]),
            },
            auditLog: {
              createMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            paymentRetry: {
              upsert: jest.fn().mockResolvedValue({
                orderId: 'order-1',
                status: 'PENDING',
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('应该返回用户的所有订单', async () => {
      const result = await service.list('user-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该返回空数组当用户没有订单时', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([]);

      const result = await service.list('user-1');

      expect(result).toEqual([]);
    });

    it('应该按创建时间倒序返回订单', async () => {
      const orders = [
        { id: 'order-3', createdAt: new Date('2024-01-03') },
        { id: 'order-2', createdAt: new Date('2024-01-02') },
        { id: 'order-1', createdAt: new Date('2024-01-01') },
      ];
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce(orders as any);

      const result = await service.list('user-1');

      expect(result[0].id).toBe('order-3');
      expect(result[2].id).toBe('order-1');
    });
  });

  describe('reconcile', () => {
    it('应该成功协调超时订单', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([
        {
          id: 'order-1',
          userId: 'user-1',
          status: ORDER_STATUS.PENDING,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
        },
      ] as any);

      const result = await service.reconcile('user-1');

      expect(result.updated).toBe(1);
      expect(prisma.order.updateMany).toHaveBeenCalled();
      expect(prisma.auditLog.createMany).toHaveBeenCalled();
    });

    it('应该在没有超时订单时返回0', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([]);

      const result = await service.reconcile('user-1');

      expect(result.updated).toBe(0);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('应该创建审计日志', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([
        {
          id: 'order-1',
          userId: 'user-1',
          status: ORDER_STATUS.PENDING,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
        },
      ] as any);

      await service.reconcile('user-1');

      expect(prisma.auditLog.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              action: 'order_timeout',
              resource: 'order',
            }),
          ]),
        })
      );
    });

    it('应该创建支付重试记录', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([
        {
          id: 'order-1',
          userId: 'user-1',
          status: ORDER_STATUS.PENDING,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
        },
      ] as any);

      await service.reconcile('user-1');

      expect(prisma.paymentRetry.upsert).toHaveBeenCalled();
    });

    it('应该返回更新后的订单列表', async () => {
      jest.spyOn(prisma.order, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'order-1',
            userId: 'user-1',
            status: ORDER_STATUS.PENDING,
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            id: 'order-1',
            userId: 'user-1',
            status: ORDER_STATUS.TIMEOUT,
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
          },
        ] as any);

      const result = await service.reconcile('user-1');

      expect(result.orders).toBeDefined();
      expect(Array.isArray(result.orders)).toBe(true);
    });
  });
});
