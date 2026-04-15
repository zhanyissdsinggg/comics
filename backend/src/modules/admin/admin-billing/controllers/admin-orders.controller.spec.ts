import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getTopupPackage } from "../../../../common/config/topup";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import {
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "../../../../common/storage/limits";
import { buildAdminVisibleOrderWhere } from "../../../../common/utils/admin-visible-data";
import { ORDER_STATUS } from "../../../../common/utils/order-status";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminOrdersController } from "./admin-orders.controller";

jest.mock("../../../../common/config/topup", () => ({
  getTopupPackage: jest.fn(),
}));

jest.mock("../../../../common/storage/limits", () => ({
  getIdempotencyRecord: jest.fn(),
  setIdempotencyRecord: jest.fn(),
}));

describe("AdminOrdersController", () => {
  let controller: AdminOrdersController;
  let prisma: PrismaService;
  let adminLogService: AdminLogService;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: "order-1",
                userId: "user-1",
                status: ORDER_STATUS.PAID,
                packageId: "missing-package",
              }),
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
            },
            wallet: {
              findUnique: jest.fn().mockResolvedValue({
                userId: "user-1",
                paidPts: 100,
                bonusPts: 50,
                plan: "free",
              }),
              upsert: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
          },
        },
        {
          provide: AdminLogService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get<AdminOrdersController>(AdminOrdersController);
    prisma = module.get<PrismaService>(PrismaService);
    adminLogService = module.get<AdminLogService>(AdminLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects refunds when the order package config is missing", async () => {
    (getTopupPackage as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      controller.refund(
        {
          userId: "user-1",
          orderId: "order-1",
        },
        { headers: {} } as never,
      ),
    ).rejects.toThrow(new BadRequestException("Order package config not found."));

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(adminLogService.log).not.toHaveBeenCalled();
  });

  it("uses idempotency cache for balance adjustments", async () => {
    (getIdempotencyRecord as jest.Mock).mockResolvedValueOnce({
      status: 200,
      body: {
        wallet: { userId: "user-1", paidPts: 180, bonusPts: 75, plan: "free" },
      },
    });

    const result = await controller.adjust(
      {
        userId: "user-1",
        paidDelta: 80,
        bonusDelta: 25,
        idempotencyKey: "idem-1",
      },
      { headers: {} } as never,
    );

    expect(result).toEqual({
      wallet: { userId: "user-1", paidPts: 180, bonusPts: 75, plan: "free" },
    });
    expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    expect(setIdempotencyRecord).not.toHaveBeenCalled();
  });

  it("stores idempotent result after a successful balance adjustment", async () => {
    (getIdempotencyRecord as jest.Mock).mockResolvedValueOnce(null);
    (prisma.wallet.upsert as jest.Mock).mockResolvedValueOnce({
      userId: "user-1",
      paidPts: 180,
      bonusPts: 75,
      plan: "free",
    });

    const result = await controller.adjust(
      {
        userId: "user-1",
        paidDelta: 80,
        bonusDelta: 25,
        idempotencyKey: "idem-2",
      },
      { headers: {} } as never,
    );

    expect(result).toEqual({
      wallet: { userId: "user-1", paidPts: 180, bonusPts: 75, plan: "free" },
    });
    expect(setIdempotencyRecord).toHaveBeenCalledWith(
      prisma,
      "user-1",
      "admin-adjust:idem-2",
      {
        status: 200,
        body: result,
      },
    );
    expect(adminLogService.log).toHaveBeenCalled();
  });

  it("lists orders with search and sorting while keeping gateway order id truthful", async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "order-1",
        userId: "user-1",
        idempotencyKey: "idem-1",
        amount: 25,
        currency: "usd",
        status: ORDER_STATUS.PAID,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ]);
    (prisma.order.count as jest.Mock).mockResolvedValueOnce(1);

    const result = await controller.list({
      query: {
        page: "1",
        pageSize: "20",
        search: "user-1",
        sortBy: "amount",
        sortOrder: "asc",
      },
    } as never);
    const expectedWhere = buildAdminVisibleOrderWhere(
      {
        OR: [
          { id: { contains: "user-1", mode: "insensitive" } },
          { userId: { contains: "user-1", mode: "insensitive" } },
          { idempotencyKey: { contains: "user-1", mode: "insensitive" } },
        ],
      },
      false,
    );

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      select: {
        id: true,
        userId: true,
        idempotencyKey: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: { amount: "asc" },
      take: 20,
      skip: 0,
    });
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: "order-1",
          currency: "USD",
          orderId: "",
        }),
      ],
      pagination: expect.objectContaining({
        total: 1,
      }),
    });
  });
});
