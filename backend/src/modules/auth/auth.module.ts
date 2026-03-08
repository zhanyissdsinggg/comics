import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { EmailModule } from "../email/email.module";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

/**
 * 老王说：认证模块，整合JWT认证的所有组件
 * 这个憨批模块是整个JWT认证系统的入口
 */
@Module({
  imports: [
    PassportModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy],
})
export class AuthModule {}
