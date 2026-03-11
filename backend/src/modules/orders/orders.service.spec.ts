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
                  packageId: 'pkg-1',
                  amount: 500,
                  currency: 'USD',
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
            $queryRaw: jest.fn().mockResolvedValue([]),
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
    it('returns the user orders sorted by createdAt desc', async () => {
      const result = await service.list('user-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('falls back to raw sql when prisma list query fails', async () => {
      jest.spyOn(prisma.order, 'findMany').mockRejectedValueOnce(new Error('column does not exist'));
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        {
          id: 'order-raw-1',
          userId: 'user-1',
          packageId: 'pkg-raw-1',
          amount: '900',
          currency: 'USD',
          status: ORDER_STATUS.PAID,
          priceSnapshot: '900',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]);

      const result = await service.list('user-1');

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual([
        expect.objectContaining({
          id: 'order-raw-1',
          userId: 'user-1',
          packageId: 'pkg-raw-1',
          amount: 900,
          currency: 'USD',
          status: ORDER_STATUS.PAID,
          priceSnapshot: 900,
        }),
      ]);
    });

    it('returns an empty array when the user has no orders', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([]);

      const result = await service.list('user-1');

      expect(result).toEqual([]);
    });

    it('preserves descending order from the datasource', async () => {
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
    it('reconciles expired pending orders', async () => {
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

    it('returns zero when there is nothing to reconcile', async () => {
      jest.spyOn(prisma.order, 'findMany').mockResolvedValueOnce([]);

      const result = await service.reconcile('user-1');

      expect(result.updated).toBe(0);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('writes audit logs for timed out orders', async () => {
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
        }),
      );
    });

    it('creates payment retry records for timed out orders', async () => {
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

    it('returns refreshed orders after reconcile finishes', async () => {
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
