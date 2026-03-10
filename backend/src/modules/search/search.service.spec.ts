import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  let service: SearchService;
  let prisma: {
    series: { findMany: jest.Mock };
    searchLog: { findMany: jest.Mock; upsert: jest.Mock };
  };

  const allSeries = [
    {
      id: "series-1",
      title: "Romance Comic",
      type: "comic",
      description: "A sweeping romance story",
      coverUrl: null,
      coverTone: null,
      badge: null,
      badges: [],
      adult: false,
      genres: ["Romance", "Drama"],
      status: "Ongoing",
      rating: 4.8,
      ratingCount: 120,
      updatedAt: new Date("2026-03-05T00:00:00.000Z"),
      createdAt: new Date("2026-01-05T00:00:00.000Z"),
    },
    {
      id: "series-2",
      title: "Action Hero",
      type: "comic",
      description: "Fast-paced battles",
      coverUrl: null,
      coverTone: null,
      badge: null,
      badges: [],
      adult: false,
      genres: ["Action"],
      status: "Completed",
      rating: 4.6,
      ratingCount: 95,
      updatedAt: new Date("2026-03-07T00:00:00.000Z"),
      createdAt: new Date("2026-01-07T00:00:00.000Z"),
    },
    {
      id: "series-3",
      title: "Romance Notes",
      type: "novel",
      description: "Romance and longing",
      coverUrl: null,
      coverTone: null,
      badge: null,
      badges: [],
      adult: false,
      genres: ["Romance"],
      status: "Completed",
      rating: 4.9,
      ratingCount: 40,
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "series-4",
      title: "Secret Desire",
      type: "comic",
      description: "Adults only romance",
      coverUrl: null,
      coverTone: null,
      badge: null,
      badges: [],
      adult: true,
      genres: ["Romance"],
      status: "Completed",
      rating: 4.7,
      ratingCount: 80,
      updatedAt: new Date("2026-03-06T00:00:00.000Z"),
      createdAt: new Date("2026-01-06T00:00:00.000Z"),
    },
  ];

  beforeEach(async () => {
    prisma = {
      series: {
        findMany: jest.fn().mockResolvedValue(allSeries),
      },
      searchLog: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it("supports real type/status/genre filters and excludes adult content by default", async () => {
    const result = await service.search({
      q: "romance",
      type: "comic",
      status: "ongoing",
      genre: "romance",
      adult: false,
      sort: "relevance",
      page: 1,
      pageSize: 12,
    });

    expect(result.total).toBe(1);
    expect(result.results.map((item) => item.id)).toEqual(["series-1"]);
  });

  it("supports pagination with alphabetical sorting", async () => {
    const result = await service.search({
      adult: false,
      sort: "alphabetical",
      page: 2,
      pageSize: 2,
    });

    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.results.map((item) => item.id)).toEqual(["series-3"]);
  });

  it("prefers stronger title matches for relevance ordering", async () => {
    const result = await service.search({
      q: "romance comic",
      adult: false,
      sort: "relevance",
      page: 1,
      pageSize: 12,
    });

    expect(result.results[0]?.id).toBe("series-1");
  });
});