import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "./cache.service";

const SERIES_CONTENT_CACHE_PATTERNS = [
  "series:list:*",
  "creators:*",
  "rankings:*",
  "recommendations:*",
  "search:results:*",
  "search:keywords:*",
  "search:suggest:*",
] as const;

const DISCOVERY_CONFIGURATION_CACHE_PATTERNS = [
  "recommendations:*",
  "rankings:*",
  "search:keywords:*",
] as const;

const SEARCH_TELEMETRY_CACHE_PATTERNS = ["search:hot:*"] as const;

export function buildSeriesContentInvalidationPatterns(
  seriesIds: string | string[],
): string[] {
  const normalizedSeriesIds = [
    ...new Set(
      (Array.isArray(seriesIds) ? seriesIds : [seriesIds])
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ];

  if (normalizedSeriesIds.length === 0) {
    return [];
  }

  const seriesScopedPatterns = normalizedSeriesIds.flatMap((seriesId) => [
    `series:detail:${seriesId}`,
    `episode:detail:${seriesId}:*`,
  ]);

  return [...seriesScopedPatterns, ...SERIES_CONTENT_CACHE_PATTERNS];
}

@Injectable()
export class ContentCacheInvalidationService {
  private readonly logger = new Logger(ContentCacheInvalidationService.name);

  constructor(private readonly cacheService: CacheService) {}

  private normalizeSeriesIds(seriesIds: string | string[]): string[] {
    const list = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
    return [
      ...new Set(list.map((item) => String(item || "").trim()).filter(Boolean)),
    ];
  }

  private async invalidatePatterns(
    patterns: readonly string[],
    reason: string,
  ): Promise<void> {
    const normalizedPatterns = [
      ...new Set(
        patterns.map((pattern) => String(pattern || "").trim()).filter(Boolean),
      ),
    ];
    if (normalizedPatterns.length === 0) {
      return;
    }

    this.logger.debug(
      `[cache] invalidating ${normalizedPatterns.length} pattern(s) for ${reason}`,
    );
    await this.cacheService.deletePatterns(normalizedPatterns);
  }

  async invalidateSeriesContent(
    seriesIds: string | string[],
    reason = "series-content-change",
  ): Promise<void> {
    const normalizedSeriesIds = this.normalizeSeriesIds(seriesIds);
    if (normalizedSeriesIds.length === 0) {
      return;
    }

    await this.invalidatePatterns(
      buildSeriesContentInvalidationPatterns(normalizedSeriesIds),
      reason,
    );
  }

  async invalidateDiscoveryConfiguration(
    reason = "discovery-configuration-change",
  ): Promise<void> {
    await this.invalidatePatterns(
      DISCOVERY_CONFIGURATION_CACHE_PATTERNS,
      reason,
    );
  }

  async invalidateSearchTelemetry(
    reason = "search-telemetry-change",
  ): Promise<void> {
    await this.invalidatePatterns(SEARCH_TELEMETRY_CACHE_PATTERNS, reason);
  }
}
