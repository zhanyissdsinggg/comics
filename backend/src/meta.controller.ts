import { Controller, Get } from "@nestjs/common";

@Controller("meta")
export class MetaController {
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
}
