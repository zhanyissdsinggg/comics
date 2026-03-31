import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { getAppConfig } from "../../../common/config/app-config";
import { AdminAuthController } from "./controllers/admin-auth.controller";
import { AdminLogService } from "../../../common/services/admin-log.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";
import { AdminAuditInterceptor } from "../interceptors/admin-audit.interceptor";
import { AdminMembersService } from "../admin-system/services/admin-members.service";

const TEST_JWT_SECRET = "gush-jwt-test-secret";

function resolveJwtSecret(): string {
  const secret = String(getAppConfig().auth.jwtSecret || "").trim();
  if (secret) {
    return secret;
  }

  if (getAppConfig().environment === "test") {
    return TEST_JWT_SECRET;
  }

  throw new Error("JWT_SECRET must be configured for admin auth outside test environments.");
}

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminLogService,
    PrismaService,
    AdminMembersService,
    AdminAuthGuard,
    AdminAuditInterceptor,
  ],
  exports: [AdminAuthGuard, JwtModule, AdminLogService, AdminAuditInterceptor],
})
export class AdminAuthModule {}
