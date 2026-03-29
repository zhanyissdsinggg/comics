import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request = require("supertest");
import { RecommendationController } from "./recommendation.controller";
import { RecommendationService } from "./recommendation.service";

describe("RecommendationController", () => {
  let app: INestApplication | undefined;
  let recommendationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    recommendationService = {
      getHomepageSlots: jest.fn().mockResolvedValue([
        { id: "slot-home-hero", slot: "home-hero", seriesIds: ["series-1", "series-2"] },
      ]),
      getContentBasedRecommendations: jest.fn().mockResolvedValue([]),
      getPersonalizedRecommendations: jest.fn().mockResolvedValue([]),
      getPopularSeries: jest.fn().mockResolvedValue([]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: recommendationService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: false,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("returns homepage slots without requiring admin auth", async () => {
    await request(app!.getHttpServer())
      .get("/recommendations/homepage")
      .expect(200)
      .expect({
        slots: [{ id: "slot-home-hero", slot: "home-hero", seriesIds: ["series-1", "series-2"] }],
        count: 1,
      });

    expect(recommendationService.getHomepageSlots).toHaveBeenCalledWith(false);
  });

  it("keeps the adult gate on homepage slots when adult mode is requested", async () => {
    await request(app!.getHttpServer())
      .get("/recommendations/homepage?adult=true")
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          error: "ADULT_GATED",
          reason: "NEED_LOGIN",
        });
      });

    expect(recommendationService.getHomepageSlots).not.toHaveBeenCalled();
  });

  it("defaults popular recommendations to the standard non-adult catalog", async () => {
    await request(app!.getHttpServer())
      .get("/recommendations/popular")
      .expect(200)
      .expect({
        series: [],
        count: 0,
      });

    expect(recommendationService.getPopularSeries).toHaveBeenCalledWith(10, false);
  });
});
