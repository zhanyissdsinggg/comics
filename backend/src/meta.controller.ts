import { Controller, Get } from "@nestjs/common";
import { getRedisClient } from "./common/redis/client";
import { ObservabilityService } from "./common/observability/observability.service";

@Controller("meta")
export class MetaController {
  constructor(private readonly observability: ObservabilityService) {}

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
  observabilitySnapshot() {
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
