import { ContentCacheInvalidationService } from "./content-cache-invalidation.service";
import { CacheService } from "./cache.service";

describe("ContentCacheInvalidationService", () => {
  let service: ContentCacheInvalidationService;
  let cacheService: {
    deletePatterns: jest.Mock;
  };

  beforeEach(() => {
    cacheService = {
      deletePatterns: jest.fn().mockResolvedValue(undefined),
    };
    service = new ContentCacheInvalidationService(
      cacheService as unknown as CacheService,
    );
  });

  it("invalidates series-scoped and shared storefront caches for content changes", async () => {
    await service.invalidateSeriesContent(
      ["series-1", "series-2", "series-1"],
      "spec",
    );

    expect(cacheService.deletePatterns).toHaveBeenCalledWith([
      "series:detail:series-1",
      "episode:detail:series-1:*",
      "series:detail:series-2",
      "episode:detail:series-2:*",
      "series:list:*",
      "creators:*",
      "rankings:*",
      "recommendations:*",
      "search:results:*",
      "search:keywords:*",
      "search:suggest:*",
    ]);
  });

  it("invalidates discovery configuration caches explicitly", async () => {
    await service.invalidateDiscoveryConfiguration("spec");

    expect(cacheService.deletePatterns).toHaveBeenCalledWith([
      "recommendations:*",
      "rankings:*",
      "search:keywords:*",
    ]);
  });

  it("invalidates only search telemetry caches for log updates", async () => {
    await service.invalidateSearchTelemetry("spec");

    expect(cacheService.deletePatterns).toHaveBeenCalledWith(["search:hot:*"]);
  });
});
