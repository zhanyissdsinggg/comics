import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { SchemaCapabilitiesService } from "./schema-capabilities.service";

@Global()
@Module({
  providers: [PrismaService, SchemaCapabilitiesService],
  exports: [PrismaService, SchemaCapabilitiesService],
})
export class PrismaModule {}
