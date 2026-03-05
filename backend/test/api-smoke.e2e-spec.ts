import { INestApplication, Module } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { HealthController } from "../src/health.controller";
import { MetaController } from "../src/meta.controller";
import { PrismaService } from "../src/common/prisma/prisma.service";

const prismaMock = {
  $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
  paymentRetry: {
    count: jest.fn().mockResolvedValue(0),
  },
  order: {
    count: jest.fn().mockResolvedValue(0),
  },
};

@Module({
  controllers: [HealthController, MetaController],
  providers: [
    {
      provide: PrismaService,
      useValue: prismaMock,
    },
  ],
})
class TestAppModule {}

describe("API smoke (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/health should return ok", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        ok: true,
      })
    );
    expect(typeof res.body.time).toBe("string");
  });

  it("GET /api/meta/version should return version payload", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/meta/version")
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        name: "gush-backend",
        version: "0.1.0",
      })
    );
    expect(typeof res.body.time).toBe("string");
  });

  it("GET /api/health/detail should include db counters", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/health/detail")
      .expect(200);

    expect(prismaMock.$queryRaw).toHaveBeenCalled();
    expect(prismaMock.paymentRetry.count).toHaveBeenCalled();
    expect(prismaMock.order.count).toHaveBeenCalled();

    expect(res.body).toEqual(
      expect.objectContaining({
        ok: true,
        dbOk: true,
        pendingOrders: 0,
        retryPending: 0,
      })
    );
  });
});
