import * as fs from "fs";
import { BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { ContentCacheInvalidationService } from "../../../../common/cache/content-cache-invalidation.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminContentGeneratorController } from "./admin-content-generator.controller";

describe("AdminContentGeneratorController", () => {
  let controller: AdminContentGeneratorController;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.ADMIN_CONTENT_GENERATOR_ENABLED = "1";

    const builder = Test.createTestingModule({
      controllers: [AdminContentGeneratorController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("token"),
            verify: jest.fn().mockReturnValue({ sub: "admin", role: "admin" }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            series: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            episode: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            $transaction: jest
              .fn()
              .mockResolvedValue([{ count: 2 }, { count: 2 }]),
          },
        },
        {
          provide: ContentCacheInvalidationService,
          useValue: {
            invalidateSeriesContent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();

    controller = module.get<AdminContentGeneratorController>(
      AdminContentGeneratorController,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.ADMIN_CONTENT_GENERATOR_ENABLED;
  });

  it("rejects non-object request bodies", async () => {
    await expect(controller.generate([] as never)).rejects.toThrow(
      new BadRequestException("Request body must be an object."),
    );
  });

  it("rejects malformed numeric fields instead of silently coercing them", async () => {
    await expect(
      controller.generate({
        seriesPerType: "10abc",
      }),
    ).rejects.toThrow(
      new BadRequestException("seriesPerType must be a positive integer."),
    );
  });

  it("writes local generated asset urls instead of external placeholder urls", async () => {
    const writeSpy = jest
      .spyOn(fs, "writeFileSync")
      .mockImplementation(() => undefined);

    await controller.generate({
      seed: "local-assets",
      seriesPerType: 1,
      minEpisodes: 1,
      maxEpisodes: 1,
    });

    const seriesCall = (prisma.series.createMany as jest.Mock).mock.calls.at(
      -1,
    )?.[0];
    const episodeCall = (prisma.episode.createMany as jest.Mock).mock.calls.at(
      -1,
    )?.[0];
    const comicSeries = seriesCall.data.find(
      (item: Record<string, unknown>) => item.type === "comic",
    );
    const comicEpisode = episodeCall.data.find(
      (item: Record<string, unknown>) =>
        item.seriesId === comicSeries.id &&
        Array.isArray(item.pages) &&
        item.pages.length > 0,
    );

    expect(comicSeries.coverUrl).toMatch(
      /^\/uploads\/generated\/content\/comic-/,
    );
    expect(comicEpisode.pages[0].url).toMatch(
      /^\/uploads\/generated\/content\/comic-/,
    );
    expect(writeSpy).toHaveBeenCalled();
  });

  it("keeps an explicit empty seed deterministic across runs", async () => {
    jest.useFakeTimers();
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

    const captureSeries = async (iso: string) => {
      jest.setSystemTime(new Date(iso));
      await controller.generate({
        seed: "",
        seriesPerType: 1,
        minEpisodes: 1,
        maxEpisodes: 1,
      });

      const call = (prisma.series.createMany as jest.Mock).mock.calls.at(
        -1,
      )?.[0];
      return call.data.map(
        ({ id, latestEpisodeId, coverUrl, ...rest }: Record<string, unknown>) =>
          rest,
      );
    };

    const first = await captureSeries("2026-03-10T00:00:00.000Z");
    const second = await captureSeries("2026-03-11T00:00:00.000Z");

    expect(second).toEqual(first);
  });
});
