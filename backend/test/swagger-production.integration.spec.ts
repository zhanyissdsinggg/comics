import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Swagger production guard", () => {
  let app: INestApplication | undefined;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        session: {
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");

    const swaggerEnabled = process.env.NODE_ENV !== "production";
    if (swaggerEnabled) {
      const config = new DocumentBuilder()
        .setTitle("Gush Reading Platform Backend")
        .setDescription("Production backend for the Gush comics-and-novels reading platform.")
        .setVersion("1.0.0")
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api/docs", app, document);
    }

    await app.init();
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    if (app) {
      await app.close();
    }
  });

  it("does not expose /api/docs in production", async () => {
    await request(app!.getHttpServer()).get("/api/docs").expect(404);
  });
});
