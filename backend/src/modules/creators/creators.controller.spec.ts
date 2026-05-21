import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request = require("supertest");
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreatorsController } from "./creators.controller";
import { CreatorsService } from "./creators.service";

describe("CreatorsController", () => {
  let app: INestApplication | undefined;
  let creatorsService: Record<string, jest.Mock>;
  let prisma: { userPreference: { findUnique: jest.Mock } };

  beforeEach(async () => {
    creatorsService = {
      listPublicCreators: jest.fn().mockResolvedValue([
        { id: "creator-1", slug: "hana-seo", name: "Hana Seo", series: [] },
      ]),
      getPublicCreator: jest.fn().mockResolvedValue({
        id: "creator-1",
        slug: "hana-seo",
        name: "Hana Seo",
        series: [],
      }),
    };
    prisma = {
      userPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CreatorsController],
      providers: [
        {
          provide: CreatorsService,
          useValue: creatorsService,
        },
        {
          provide: PrismaService,
          useValue: prisma,
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

  it("defaults the public creators route to the standard non-adult catalog", async () => {
    await request(app!.getHttpServer())
      .get("/creators")
      .expect(200)
      .expect({
        creators: [{ id: "creator-1", slug: "hana-seo", name: "Hana Seo", series: [] }],
        count: 1,
      });

    expect(creatorsService.listPublicCreators).toHaveBeenCalledWith(false);
  });

  it("keeps the adult gate on creators list when adult mode is requested", async () => {
    await request(app!.getHttpServer())
      .get("/creators?adult=true")
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          error: "ADULT_GATED",
          reason: "NEED_LOGIN",
        });
      });

    expect(creatorsService.listPublicCreators).not.toHaveBeenCalled();
  });
});
