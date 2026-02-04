"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const cookieParser = require("cookie-parser");
const logger_middleware_1 = require("./common/middleware/logger.middleware");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
const prisma_service_1 = require("./common/prisma/prisma.service");
const session_middleware_1 = require("./common/middleware/session.middleware");
const require_auth_middleware_1 = require("./common/middleware/require-auth.middleware");
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
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
    app.use((0, express_1.json)({
        verify: (req, _res, buf) => {
            req.rawBody = (buf === null || buf === void 0 ? void 0 : buf.toString("utf8")) || "";
        },
    }));
    app.use(cookieParser());
    const prisma = app.get(prisma_service_1.PrismaService);
    app.use((0, session_middleware_1.createSessionMiddleware)(prisma));
    app.use(require_auth_middleware_1.requireAuthMiddleware);
    app.use(request_id_middleware_1.requestIdMiddleware);
    app.use(logger_middleware_1.loggerMiddleware);
    app.useGlobalInterceptors(new response_envelope_interceptor_1.ResponseEnvelopeInterceptor());
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Tappytoon Backend")
        .setDescription("Mock backend API for Tappytoon.")
        .setVersion("0.1.0")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api/docs", app, document);
    await app.listen(4000);
}
bootstrap();
