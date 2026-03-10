import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { AdminAuditInterceptor } from "../../interceptors/admin-audit.interceptor";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPromotionsController } from "./admin-promotions.controller";

describe("AdminPromotionsController", () => {
  let controller: AdminPromotionsController;
  let prisma: {
    promotion: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    promotionFallback: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      promotion: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      promotionFallback: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const builder = Test.createTestingModule({
      controllers: [AdminPromotionsController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AdminLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        AdminAuditInterceptor,
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminPromotionsController);
  });

  it("returns promotions sorted by title", async () => {
    const promotions = [{ id: "promo-1", title: "Promo 1" }];
    prisma.promotion.findMany.mockResolvedValue(promotions);

    const result = await controller.list();

    expect(result).toEqual({ promotions });
    expect(prisma.promotion.findMany).toHaveBeenCalledWith({ orderBy: { title: "asc" } });
  });

  it("returns stored defaults", async () => {
    prisma.promotionFallback.findUnique.mockResolvedValue({
      key: "default",
      payload: JSON.stringify({ ctaType: "STORE", ctaTarget: "/store", ctaLabel: "Open store" }),
    });

    const result = await controller.defaults();

    expect(result).toEqual({
      defaults: { ctaType: "STORE", ctaTarget: "/store", ctaLabel: "Open store" },
    });
  });

  it("falls back to default defaults payload", async () => {
    prisma.promotionFallback.findUnique.mockResolvedValue(null);

    const result = await controller.defaults();

    expect(result).toEqual({
      defaults: { ctaType: "STORE", ctaTarget: "", ctaLabel: "View offer" },
    });
  });

  it("upserts defaults payload", async () => {
    const defaultsPayload = { ctaType: "SUBSCRIBE", ctaTarget: "/subscribe", ctaLabel: "Subscribe now" };
    prisma.promotionFallback.upsert.mockResolvedValue({
      key: "default",
      payload: JSON.stringify(defaultsPayload),
    });

    const result = await controller.updateDefaults({ defaults: defaultsPayload });

    expect(prisma.promotionFallback.upsert).toHaveBeenCalledWith({
      where: { key: "default" },
      update: { payload: JSON.stringify(defaultsPayload) },
      create: {
        key: "default",
        payload: JSON.stringify(defaultsPayload),
      },
    });
    expect(result).toEqual({ defaults: defaultsPayload });
  });

  it("creates a promotion with normalized fields", async () => {
    prisma.promotion.create.mockResolvedValue({
      id: "promo-1",
      title: "Flash Sale",
      type: "GENERIC",
    });

    const result = await controller.create({
      promotion: {
        id: "promo-1",
        title: "Flash Sale",
        active: true,
        bonusMultiplier: "2",
        returningAfterDays: "14",
        autoGrant: true,
        startAt: "2026-03-01T00:00:00.000Z",
      },
    });

    expect(prisma.promotion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "promo-1",
        title: "Flash Sale",
        active: true,
        bonusMultiplier: 2,
        returningAfterDays: 14,
        autoGrant: true,
        type: "GENERIC",
      }),
    });
    expect(result).toEqual({
      promotion: { id: "promo-1", title: "Flash Sale", type: "GENERIC" },
    });
  });

  it("parses string false values on create instead of treating them as truthy", async () => {
    prisma.promotion.create.mockResolvedValue({ id: "promo-2", title: "Flag Test" });

    await controller.create({
      promotion: {
        id: "promo-2",
        title: "Flag Test",
        active: "false",
        autoGrant: "false",
      },
    } as never);

    expect(prisma.promotion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        active: false,
        autoGrant: false,
      }),
    });
  });

  it("rejects create when promotion id is missing", async () => {
    await expect(controller.create({ promotion: { title: "No Id" } })).rejects.toThrow();
  });

  it("updates a promotion with partial payload", async () => {
    prisma.promotion.update.mockResolvedValue({ id: "promo-1", title: "Updated" });

    const result = await controller.update(
      { promotion: { title: "Updated", active: false, bonusMultiplier: "3" } },
      { params: { id: "promo-1" } } as never,
    );

    expect(prisma.promotion.update).toHaveBeenCalledWith({
      where: { id: "promo-1" },
      data: expect.objectContaining({
        title: "Updated",
        active: false,
        bonusMultiplier: 3,
      }),
    });
    expect(result).toEqual({ promotion: { id: "promo-1", title: "Updated" } });
  });

  it("parses string false values on update instead of treating them as truthy", async () => {
    prisma.promotion.update.mockResolvedValue({ id: "promo-1", title: "Updated" });

    await controller.update(
      { promotion: { active: "false", autoGrant: "false" } } as never,
      { params: { id: "promo-1" } } as never,
    );

    expect(prisma.promotion.update).toHaveBeenCalledWith({
      where: { id: "promo-1" },
      data: expect.objectContaining({
        active: false,
        autoGrant: false,
      }),
    });
  });

  it("deletes an existing promotion", async () => {
    prisma.promotion.findUnique.mockResolvedValue({ id: "promo-1" });
    prisma.promotion.delete.mockResolvedValue({ id: "promo-1" });

    const result = await controller.remove({ params: { id: "promo-1" } } as never);

    expect(prisma.promotion.findUnique).toHaveBeenCalledWith({ where: { id: "promo-1" } });
    expect(prisma.promotion.delete).toHaveBeenCalledWith({ where: { id: "promo-1" } });
    expect(result).toEqual({ ok: true });
  });

  it("rejects deleting a missing promotion", async () => {
    prisma.promotion.findUnique.mockResolvedValue(null);

    await expect(controller.remove({ params: { id: "missing" } } as never)).rejects.toThrow();
  });
});