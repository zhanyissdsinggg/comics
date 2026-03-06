import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { logger } from "../logger/winston.init";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      logger.info("Prisma connected");
    } catch (error) {
      // Keep process alive so health endpoint can report degraded status
      logger.error("Prisma connection failed during bootstrap, running in degraded mode", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
