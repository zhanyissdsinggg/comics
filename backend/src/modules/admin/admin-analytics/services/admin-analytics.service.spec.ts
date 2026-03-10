import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { ORDER_STATUS } from "../../../../common/utils/order-status";
import { AdminAnalyticsService } from "./admin-analytics.service";

describe("AdminAnalyticsService", () => {
  let service: AdminAnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id: "order-1",
                  userId: "user-1",
                  amount: 100,
                  status: ORDER_STATUS.PAID,
                  createdAt: new Date("2024-01-01T00:00:00.000Z"),
                },
                {
                  id: "order-2",
                  userId: "user-1",
                  amount: 200,
                  status: ORDER_STATUS.PAID,
                  createdAt: new Date("2024-02-01T00:00:00.000Z"),
                },
              ]),
              aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }),
            },
            userBehavior: {
              findUnique: jest.fn().mockResolvedValue({
                id: "behavior-1",
                userId: "user-1",
                createdAt: new Date(),
                action: "read",
                details: null,
                lastActiveAt: new Date(),
                readingTime: 120,
                seriesViewed: 10,
                commentsCount: 5,
                ratingsCount: 3,
                bookmarksCount: 2,
              }),
              count: jest.fn().mockResolvedValue(100),
            },
            user: {
              findUnique: jest.fn().mockResolvedValue({
                id: "user-1",
                wallet: { paidPts: 1000, bonusPts: 500 },
                userTags: [],
                userMetrics: { ltv: 450, churnRisk: "low" },
                userBehavior: { lastActiveAt: new Date() },
              }),
              findMany: jest.fn().mockResolvedValue([
                { id: "user-1", wallet: { paidPts: 1000 }, userMetrics: { ltv: 450 }, userBehavior: null },
              ]),
              count: jest.fn().mockResolvedValue(1000),
            },
            userTag: {
              deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            userMetrics: {
              findUnique: jest.fn().mockResolvedValue({
                userId: "user-1",
                ltv: 450,
                churnRisk: "low",
              }),
              update: jest.fn().mockResolvedValue({
                userId: "user-1",
                ltv: 500,
                churnRisk: "medium",
              }),
              create: jest.fn().mockResolvedValue({
                userId: "user-2",
                ltv: 250,
              }),
              count: jest.fn().mockResolvedValue(50),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calculates user LTV from paid orders only", async () => {
    const result = await service.calculateUserLTV("user-1");

    expect(result.totalSpent).toBe(300);
    expect(result.totalOrders).toBe(2);
    expect(result.avgOrderValue).toBe(150);
    expect(result.ltv).toBe(450);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: ORDER_STATUS.PAID },
    });
  });

  it("returns zero LTV when the user has no paid orders", async () => {
    jest.spyOn(prisma.order, "findMany").mockResolvedValueOnce([] as never);

    const result = await service.calculateUserLTV("user-1");

    expect(result.totalSpent).toBe(0);
    expect(result.totalOrders).toBe(0);
    expect(result.avgOrderValue).toBe(0);
    expect(result.ltv).toBe(0);
  });

  it("classifies churn risk across low, medium, high and unknown buckets", async () => {
    expect(await service.assessChurnRisk("user-1")).toBe("low");

    jest.spyOn(prisma.userBehavior, "findUnique").mockResolvedValueOnce({
      id: "behavior-2",
      userId: "user-1",
      createdAt: new Date(),
      action: "view",
      details: null,
      lastActiveAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      readingTime: 10,
      seriesViewed: 1,
      commentsCount: 0,
      ratingsCount: 0,
      bookmarksCount: 0,
    } as never);
    expect(await service.assessChurnRisk("user-1")).toBe("medium");

    jest.spyOn(prisma.userBehavior, "findUnique").mockResolvedValueOnce({
      id: "behavior-3",
      userId: "user-1",
      createdAt: new Date(),
      action: "view",
      details: null,
      lastActiveAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      readingTime: 10,
      seriesViewed: 1,
      commentsCount: 0,
      ratingsCount: 0,
      bookmarksCount: 0,
    } as never);
    expect(await service.assessChurnRisk("user-1")).toBe("high");

    jest.spyOn(prisma.userBehavior, "findUnique").mockResolvedValueOnce(null as never);
    expect(await service.assessChurnRisk("user-1")).toBe("unknown");
  });

  it("builds analytics payload for an existing user", async () => {
    const result = await service.getUserAnalytics("user-1");

    expect(result).not.toBeNull();
    expect(result?.user.id).toBe("user-1");
    expect(result?.ltv.totalSpent).toBe(300);
    expect(result?.churnRisk).toBe("low");
  });

  it("returns null analytics when the user does not exist", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null as never);

    const result = await service.getUserAnalytics("missing-user");

    expect(result).toBeNull();
  });

  it("loads segmented users with normalized pagination", async () => {
    const result = await service.getUserSegments({ segment: "vip", limit: 25, offset: 10 });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(10);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userTags: expect.any(Object),
        }),
        take: 25,
        skip: 10,
      }),
    );
  });

  it("returns null when behavior analytics cannot be found", async () => {
    jest.spyOn(prisma.userBehavior, "findUnique").mockResolvedValueOnce(null as never);

    const result = await service.getUserBehaviorAnalytics("user-1");

    expect(result).toBeNull();
  });

  it("computes a bounded activity score for behavior analytics", async () => {
    const result = await service.getUserBehaviorAnalytics("user-1");

    expect(result?.activityScore).toBeGreaterThanOrEqual(0);
    expect(result?.activityScore).toBeLessThanOrEqual(100);
  });

  it("rewrites user tags into persisted tag records", async () => {
    await service.updateUserTags("user-1", [
      { tagType: "vip_level", tagValue: "gold" },
      { tagType: "interest", tagValue: "romance" },
    ]);

    expect(prisma.userTag.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.userTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            tag: "vip_level:gold",
            tagType: "vip_level",
            tagValue: "gold",
          }),
        ]),
      }),
    );
  });

  it("updates metrics when a metrics row already exists", async () => {
    const result = await service.updateUserMetrics("user-1", { ltv: 500, churnRisk: "medium" });

    expect(prisma.userMetrics.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { ltv: 500, churnRisk: "medium" },
    });
    expect(result.ltv).toBe(500);
  });

  it("creates metrics when a metrics row does not exist", async () => {
    jest.spyOn(prisma.userMetrics, "findUnique").mockResolvedValueOnce(null as never);

    const result = await service.updateUserMetrics("user-2", { ltv: 250 });

    expect(prisma.userMetrics.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-2", ltv: 250 }),
    });
    expect(result.userId).toBe("user-2");
  });

  it("aggregates analytics stats with paid-order revenue only", async () => {
    const result = await service.getAnalyticsStats();

    expect(result).toEqual({
      totalUsers: 1000,
      activeUsers: 100,
      activeRate: "10.00%",
      highValueUsers: 50,
      atRiskUsers: 50,
      totalRevenue: 1000,
    });
    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      where: { status: ORDER_STATUS.PAID },
      _sum: { amount: true },
    });
  });
});