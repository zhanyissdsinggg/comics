import { ExpiringValueCache } from "../../common/utils/runtime-cache";

const REGION_CONFIG_CACHE_MS = 60_000;

export type CachedRegionConfig = {
  countryCodes: Array<{ code: string; label: string }>;
  lengthRules: Record<string, number[]>;
  updatedAt?: string;
};

export const regionConfigCache = new ExpiringValueCache<CachedRegionConfig>(REGION_CONFIG_CACHE_MS);
