import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import cookieParser = require("cookie-parser");
import { loggerMiddleware } from "./common/middleware/logger.middleware";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { PrismaService } from "./common/prisma/prisma.service";
import { createSessionMiddleware } from "./common/middleware/session.middleware";
import { requireAuthMiddleware } from "./common/middleware/require-auth.middleware";
import { json } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const originEnv = process.env.FRONTEND_ORIGIN || "";
  const allowedOrigins = originEnv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf?.toString("utf8") || "";
      },
    })
  );
  app.use(cookieParser());
  const prisma = app.get(PrismaService);
  app.use(createSessionMiddleware(prisma));
  app.use(requireAuthMiddleware);
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  const config = new DocumentBuilder()
    .setTitle("Tappytoon Backend")
    .setDescription("Mock backend API for Tappytoon.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(4000);
}

bootstrap();
