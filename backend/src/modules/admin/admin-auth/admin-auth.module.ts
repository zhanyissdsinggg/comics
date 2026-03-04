import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AdminAuthController } from "./controllers/admin-auth.controller";
import { AdminLogService } from "../../../common/services/admin-log.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 老王说：管理员认证模块 - 处理JWT登录和token刷新
 * 这个模块专门负责管理员的身份验证和授权
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "gush-jwt-secret-change-me",
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminLogService, PrismaService, AdminAuthGuard],
  exports: [AdminAuthGuard, JwtModule],
})
export class AdminAuthModule {}
