import { Controller, ForbiddenException, Get, Req } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { Request } from "express";
import { getRedisClient } from "./common/redis/client";
import { ObservabilityService } from "./common/observability/observability.service";

@Controller("meta")
export class MetaController {
  constructor(private readonly observability: ObservabilityService) {}

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private canReadObservability(req: Request): boolean {
    if (process.env.OBSERVABILITY_PUBLIC === "1") {
      return true;
    }

    if (process.env.NODE_ENV !== "production") {
      return true;
    }

    const configuredKey = String(process.env.OBSERVABILITY_KEY || "").trim();
    if (!configuredKey) {
      return false;
    }

    const requestKey = String(req.headers["x-observability-key"] || "").trim();
    if (!requestKey) {
      return false;
    }

    return this.safeEquals(configuredKey, requestKey);
  }

  @Get("version")
  version() {
    const commit =
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      "unknown";
    const deploymentId =
      process.env.RAILWAY_DEPLOYMENT_ID ||
      process.env.RAILWAY_DEPLOYMENT_TRIGGER_ID ||
      "unknown";

    return {
      name: "gush-backend",
      version: "0.1.0",
      commit,
      deploymentId,
      time: new Date().toISOString(),
    };
  }

  @Get("observability")
  observabilitySnapshot(@Req() req: Request) {
    if (!this.canReadObservability(req)) {
      throw new ForbiddenException("Observability endpoint is restricted");
    }

    const redis = getRedisClient();
    return {
      ...this.observability.getSnapshot(),
      redis: {
        configured: Boolean(process.env.REDIS_URL),
        connected: Boolean(redis && redis.status === "ready"),
        status: redis?.status || "disconnected",
      },
    };
  }
}
