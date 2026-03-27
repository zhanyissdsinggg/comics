import { EntitlementsService } from "./entitlements.service";
import { PrismaService } from "../../common/prisma/prisma.service";

describe("EntitlementsService", () => {
  let service: EntitlementsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      series: { findUnique: jest.fn() },
      entitlement: { findMany: jest.fn() },
      episode: { findUnique: jest.fn(), findMany: jest.fn() },
      wallet: { findUnique: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(),
    };

    service = new EntitlementsService(prisma as unknown as PrismaService);
  });

  it("blocks wallet unlocks for unpublished series", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-1", isPublished: false, ttfIntervalHours: 24 });

    await expect(service.unlockWithWallet("user-1", "series-1", "series-1e1")).resolves.toEqual({
      ok: false,
      status: 404,
      error: "NOT_FOUND",
    });
    expect(prisma.episode.findUnique).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("blocks TTF unlocks for unpublished series", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-1", isPublished: false, ttfIntervalHours: 24 });

    await expect(service.unlockWithTtf("user-1", "series-1", "series-1e1")).resolves.toEqual({
      ok: false,
      status: 404,
      error: "NOT_FOUND",
    });
    expect(prisma.episode.findUnique).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("blocks pack unlocks for unpublished series", async () => {
    prisma.series.findUnique.mockResolvedValue({ id: "series-1", isPublished: false, ttfIntervalHours: 24 });

    await expect(service.unlockPack("user-1", "series-1", ["series-1e1"], "pack_3")).resolves.toEqual({
      ok: false,
      status: 404,
      error: "NOT_FOUND",
    });
    expect(prisma.episode.findMany).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("groups unlocked episodes by series when listing entitlements", async () => {
    prisma.entitlement.findMany.mockResolvedValue([
      { seriesId: "series-1", episodeId: "series-1e1" },
      { seriesId: "series-1", episodeId: "series-1e2" },
      { seriesId: "series-2", episodeId: "series-2e1" },
      { seriesId: "series-1", episodeId: "series-1e2" },
    ]);

    await expect(service.listEntitlements("user-1")).resolves.toEqual([
      { seriesId: "series-1", unlockedEpisodeIds: ["series-1e1", "series-1e2"] },
      { seriesId: "series-2", unlockedEpisodeIds: ["series-2e1"] },
    ]);
    expect(prisma.entitlement.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { seriesId: true, episodeId: true },
      orderBy: [{ seriesId: "asc" }, { episodeId: "asc" }],
    });
  });
});
