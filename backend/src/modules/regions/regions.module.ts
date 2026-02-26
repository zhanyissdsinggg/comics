import { Module } from "@nestjs/common";
import { RegionsController } from "./regions.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [RegionsController],
})
export class RegionsModule {}
