import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

/**
 * 老王说：认证模块，整合JWT认证的所有组件
 * 这个憨批模块是整个JWT认证系统的入口
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me",
      signOptions: { expiresIn: "1h" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
