import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { ContentCacheInvalidationService } from "./content-cache-invalidation.service";

@Global()
@Module({
  providers: [CacheService, ContentCacheInvalidationService],
  exports: [CacheService, ContentCacheInvalidationService],
})
export class CacheModule {}
