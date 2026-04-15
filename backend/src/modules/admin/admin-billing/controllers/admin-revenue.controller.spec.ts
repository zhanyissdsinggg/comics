import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AdminRevenueController } from './admin-revenue.controller';

describe('AdminRevenueController', () => {
  let controller: AdminRevenueController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminRevenueController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token'),
            verify: jest.fn().mockReturnValue({ sub: 'admin', role: 'admin' }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            promotion: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            auditLog: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            user: {
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();

    controller = module.get<AdminRevenueController>(AdminRevenueController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses refund update time instead of order creation time for refunded totals', async () => {
    prisma.order.findMany = jest.fn().mockResolvedValueOnce([
      {
        amount: 100,
        status: 'REFUNDED',
        createdAt: new Date('2026-03-01T08:00:00.000Z'),
        paidAt: new Date('2026-03-01T08:10:00.000Z'),
        updatedAt: new Date('2026-03-05T09:00:00.000Z'),
      },
    ]) as never;

    const result = await controller.stats('2026-03-05', '2026-03-05');

    expect(result.stats.totalRevenue).toBe(0);
    expect(result.stats.totalRefunded).toBe(100);
    expect(result.stats.netRevenue).toBe(-100);
  });

  it('calculates channel avg order value using revenue orders only', async () => {
    prisma.order.findMany = jest.fn().mockResolvedValueOnce([
      {
        amount: 100,
        status: 'PAID',
        createdAt: new Date('2026-03-05T10:00:00.000Z'),
        paidAt: new Date('2026-03-05T10:05:00.000Z'),
        updatedAt: new Date('2026-03-05T10:05:00.000Z'),
        paymentIntents: [{ provider: 'stripe' }],
      },
      {
        amount: 50,
        status: 'FAILED',
        createdAt: new Date('2026-03-05T11:00:00.000Z'),
        paidAt: null,
        updatedAt: new Date('2026-03-05T11:00:00.000Z'),
        paymentIntents: [{ provider: 'stripe' }],
      },
    ]) as never;

    const result = await controller.channels('2026-03-05', '2026-03-05');

    expect(result.channels).toEqual([
      {
        channel: 'stripe',
        orders: 1,
        revenue: 100,
        avgOrderValue: 100,
      },
    ]);
  });

  it('preserves explicit end timestamps instead of forcing them to the day end', async () => {
    prisma.order.findMany = jest.fn().mockResolvedValueOnce([]) as never;

    await controller.orderStatusDistribution('2026-03-05T10:00:00.000Z', '2026-03-05T10:00:00.000Z');

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: expect.objectContaining({
            gte: new Date('2026-03-05T10:00:00.000Z'),
            lte: new Date('2026-03-05T10:00:00.000Z'),
          }),
        },
      }),
    );
  });

  it('prefers explicit order audit attribution before falling back to derived rules', async () => {
    prisma.promotion.findMany = jest.fn().mockResolvedValueOnce([
      {
        id: 'promo-first',
        title: 'First Purchase',
        active: true,
        type: 'FIRST_PURCHASE',
        startAt: null,
        endAt: null,
        returningAfterDays: 7,
      },
      {
        id: 'promo-holiday',
        title: 'Holiday Deal',
        active: true,
        type: 'HOLIDAY',
        startAt: new Date('2026-03-01T00:00:00.000Z'),
        endAt: new Date('2026-03-31T23:59:59.999Z'),
        returningAfterDays: 7,
      },
    ]) as never;

    prisma.order.findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'order-explicit',
          userId: 'user-1',
          amount: 120,
          status: 'PAID',
          createdAt: new Date('2026-03-12T08:00:00.000Z'),
          paidAt: new Date('2026-03-12T08:05:00.000Z'),
          updatedAt: new Date('2026-03-12T08:05:00.000Z'),
        },
        {
          id: 'order-derived',
          userId: 'user-2',
          amount: 80,
          status: 'PAID',
          createdAt: new Date('2026-03-14T09:00:00.000Z'),
          paidAt: new Date('2026-03-14T09:05:00.000Z'),
          updatedAt: new Date('2026-03-14T09:05:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'order-explicit',
          userId: 'user-1',
          amount: 120,
          status: 'PAID',
          createdAt: new Date('2026-03-12T08:00:00.000Z'),
          paidAt: new Date('2026-03-12T08:05:00.000Z'),
          updatedAt: new Date('2026-03-12T08:05:00.000Z'),
        },
        {
          id: 'order-derived',
          userId: 'user-2',
          amount: 80,
          status: 'PAID',
          createdAt: new Date('2026-03-14T09:00:00.000Z'),
          paidAt: new Date('2026-03-14T09:05:00.000Z'),
          updatedAt: new Date('2026-03-14T09:05:00.000Z'),
        },
      ]) as never;

    prisma.auditLog.findMany = jest.fn().mockResolvedValueOnce([
      {
        targetId: 'order-explicit',
        payload: JSON.stringify({
          attribution: {
            promotionId: 'promo-holiday',
            offerId: 'points_pack_mega',
            entryPoint: 'STORE_ENTRY',
          },
        }),
      },
    ]) as never;

    const result = await controller.promotions('2026-03-01', '2026-03-31');

    expect(result).toEqual({
      promotions: [
        {
          promotionId: 'promo-first',
          title: 'First Purchase',
          orders: 1,
          revenue: 80,
          roi: null,
          active: true,
        },
        {
          promotionId: 'promo-holiday',
          title: 'Holiday Deal',
          orders: 1,
          revenue: 120,
          roi: null,
          active: true,
        },
      ],
      attributionModel: 'hybrid_order_audit_and_derived_rules',
      roiAvailable: false,
    });
  });

  it('derives promotion revenue from first-purchase and returning-order rules', async () => {
    prisma.promotion.findMany = jest.fn().mockResolvedValueOnce([
      {
        id: 'promo-first',
        title: 'First Purchase',
        active: true,
        type: 'FIRST_PURCHASE',
        startAt: null,
        endAt: null,
        returningAfterDays: 7,
      },
      {
        id: 'promo-return',
        title: 'Welcome Back',
        active: true,
        type: 'RETURNING',
        startAt: null,
        endAt: null,
        returningAfterDays: 7,
      },
      {
        id: 'promo-holiday',
        title: 'Holiday Deal',
        active: true,
        type: 'HOLIDAY',
        startAt: null,
        endAt: null,
        returningAfterDays: 7,
      },
    ]) as never;

    prisma.order.findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'order-1',
          userId: 'user-1',
          amount: 100,
          status: 'PAID',
          createdAt: new Date('2026-03-05T08:00:00.000Z'),
          paidAt: new Date('2026-03-05T08:05:00.000Z'),
          updatedAt: new Date('2026-03-05T08:05:00.000Z'),
        },
        {
          id: 'order-2',
          userId: 'user-2',
          amount: 80,
          status: 'PAID',
          createdAt: new Date('2026-03-10T09:00:00.000Z'),
          paidAt: new Date('2026-03-10T09:05:00.000Z'),
          updatedAt: new Date('2026-03-10T09:05:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'order-1',
          userId: 'user-1',
          amount: 100,
          status: 'PAID',
          createdAt: new Date('2026-03-05T08:00:00.000Z'),
          paidAt: new Date('2026-03-05T08:05:00.000Z'),
          updatedAt: new Date('2026-03-05T08:05:00.000Z'),
        },
        {
          id: 'order-legacy',
          userId: 'user-2',
          amount: 60,
          status: 'PAID',
          createdAt: new Date('2026-02-20T09:00:00.000Z'),
          paidAt: new Date('2026-02-20T09:05:00.000Z'),
          updatedAt: new Date('2026-02-20T09:05:00.000Z'),
        },
        {
          id: 'order-2',
          userId: 'user-2',
          amount: 80,
          status: 'PAID',
          createdAt: new Date('2026-03-10T09:00:00.000Z'),
          paidAt: new Date('2026-03-10T09:05:00.000Z'),
          updatedAt: new Date('2026-03-10T09:05:00.000Z'),
        },
      ]) as never;

    const result = await controller.promotions('2026-03-01', '2026-03-31');

    expect(result).toEqual({
      promotions: [
        {
          promotionId: 'promo-first',
          title: 'First Purchase',
          orders: 1,
          revenue: 100,
          roi: null,
          active: true,
        },
        {
          promotionId: 'promo-return',
          title: 'Welcome Back',
          orders: 1,
          revenue: 80,
          roi: null,
          active: true,
        },
        {
          promotionId: 'promo-holiday',
          title: 'Holiday Deal',
          orders: 0,
          revenue: 0,
          roi: null,
          active: true,
        },
      ],
      attributionModel: 'derived_rules',
      roiAvailable: false,
    });
  });
});
