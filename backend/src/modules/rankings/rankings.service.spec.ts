import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RankingsService } from "./rankings.service";

describe("RankingsService", () => {
  let service: RankingsService;
  const prisma = {
    series: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma.series.findMany.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<RankingsService>(RankingsService);
  });

  it("filters unpublished titles from ranking responses", async () => {
    prisma.series.findMany.mockResolvedValue([
      { id: "series-1", rating: 4.5, isPublished: true, adult: false },
      { id: "series-2", rating: 5, isPublished: false, adult: false },
    ]);

    const result = await service.list("top", false);

    expect(prisma.series.findMany).toHaveBeenCalledWith({
      where: { adult: false, isPublished: true },
    });
    expect(result.map((item) => item.id)).toEqual(["series-1"]);
  });
});
