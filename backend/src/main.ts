import { NestFactory } from "@nestjs/core";
import { LogLevel } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import cookieParser = require("cookie-parser");
import { loggerMiddleware } from "./common/middleware/logger.middleware";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";
import { PrismaService } from "./common/prisma/prisma.service";
import { createSessionMiddleware } from "./common/middleware/session.middleware";
import { requireAuthMiddleware } from "./common/middleware/require-auth.middleware";
import { json } from "express";

async function bootstrap() {
  // 老王说：生产环境只输出错误和警告，避免日志爆炸
  const logLevels: LogLevel[] = process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['log', 'error', 'warn', 'debug', 'verbose'];

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });
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
  app.useGlobalInterceptors(new TimeoutInterceptor());
  const config = new DocumentBuilder()
    .setTitle("Gush Backend")
    .setDescription("Mock backend API for Gush.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`应用已启动，监听端口: ${port}`);
}

bootstrap();
