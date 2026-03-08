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
import { initSentry } from "./common/sentry/sentry.init";
import { SentryMiddleware } from "./common/sentry/sentry.middleware";
import { logger } from "./common/logger/winston.init";
import { ObservabilityService } from "./common/observability/observability.service";
import { createObservabilityMiddleware } from "./common/observability/observability.middleware";

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

async function bootstrap() {
  initSentry();

  const logLevels: LogLevel[] =
    process.env.NODE_ENV === "production"
      ? ["error", "warn"]
      : ["log", "error", "warn", "debug", "verbose"];

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  const observability = app.get(ObservabilityService);

  app.setGlobalPrefix("api");
  const expressApp = app.getHttpAdapter().getInstance();

  // Railway fallback health endpoints (without global prefix)
  expressApp.get("/", (_req: any, res: any) =>
    res.status(200).json({ ok: true, service: "gush-backend", time: new Date().toISOString() }),
  );
  expressApp.get("/health", (_req: any, res: any) =>
    res.status(200).json({ ok: true, service: "gush-backend", time: new Date().toISOString() }),
  );

  const originEnv = process.env.FRONTEND_ORIGIN || "";
  const allowedOrigins = originEnv
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  const allowedOriginSet = new Set(allowedOrigins);
  const isProd = process.env.NODE_ENV === "production";
  const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  const trustedGushDomainPattern = /^https:\/\/([a-z0-9-]+\.)*gushcomics\.com$/i;

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }

      const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
      if (allowedOriginSet.has(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      if (!isProd && localhostOriginPattern.test(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      // Allow first-party domains such as gushcomics.com and www.gushcomics.com.
      if (trustedGushDomainPattern.test(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked by CORS policy: ${requestOrigin}`);
      return callback(null, false);
    },
    credentials: true,
  });

  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf?.toString("utf8") || "";
      },
    }),
  );

  app.use(cookieParser());

  const prisma = app.get(PrismaService);
  app.use(createSessionMiddleware(prisma));
  app.use(requireAuthMiddleware);
  app.use(requestIdMiddleware);
  app.use(createObservabilityMiddleware(observability));
  app.use(loggerMiddleware);
  app.use(new SentryMiddleware().use.bind(new SentryMiddleware()));
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
  logger.info(`Application started on port: ${port}`);
}

bootstrap();
