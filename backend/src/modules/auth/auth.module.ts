import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { StatsModule } from "../../common/services/stats.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [PrismaModule, StatsModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
