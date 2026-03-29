import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailRuntimeService } from "./email-runtime.service";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [EmailService, EmailRuntimeService],
  exports: [EmailService],
})
export class EmailModule {}
