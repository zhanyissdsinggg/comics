import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "./common/cache/cache.module";
import { loadAndValidateAppConfig } from "./common/config/app-config";
import { CreatorCreditsModule } from "./common/creators/creator-credits.module";
import { ObservabilityService } from "./common/observability/observability.service";
import { PrismaModule } from "./common/prisma/prisma.module";
import { StatsModule } from "./common/services/stats.module";
import { HealthController } from "./health.controller";
import { MetaController } from "./meta.controller";
import { AdminRuntimeModule } from "./modules/runtime/admin-runtime.module";
import { CommercialRuntimeModule } from "./modules/runtime/commercial-runtime.module";
import { CorePublicRuntimeModule } from "./modules/runtime/core-public-runtime.module";
import { OpsRuntimeModule } from "./modules/runtime/ops-runtime.module";
import { UserRuntimeModule } from "./modules/runtime/user-runtime.module";

const isRuntimeEnabled = (rawValue: string | undefined, fallback = true): boolean => {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(normalized);
};

const optionalRuntimeImports = [
  ...(isRuntimeEnabled(process.env.ENABLE_COMMERCIAL_RUNTIME, true) ? [CommercialRuntimeModule] : []),
  ...(isRuntimeEnabled(process.env.ENABLE_OPS_RUNTIME, true) ? [OpsRuntimeModule] : []),
  ...(isRuntimeEnabled(process.env.ENABLE_ADMIN_RUNTIME, true) ? [AdminRuntimeModule] : []),
];

@Module({
  controllers: [HealthController, MetaController],
  providers: [ObservabilityService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (env) => loadAndValidateAppConfig(env),
    }),
    CacheModule,
    CreatorCreditsModule,
    PrismaModule,
    StatsModule,
    CorePublicRuntimeModule,
    UserRuntimeModule,
    ...optionalRuntimeImports,
  ],
})
export class AppModule {}
