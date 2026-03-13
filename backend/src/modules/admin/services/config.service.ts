import { Injectable } from "@nestjs/common";
import { logger } from "../../../common/logger/winston.init";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../common/utils/stored-json";

const CONFIG_CACHE_TTL_MS = 60_000;

type ConfigCacheEntry = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class ConfigService {
  private static readonly configCache = new Map<string, ConfigCacheEntry>();
  private static readonly configInflight = new Map<string, Promise<unknown>>();
  private static readonly configVersions = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  private getConfigVersion(key: string): number {
    return ConfigService.configVersions.get(key) || 0;
  }

  private bumpConfigVersion(key: string): number {
    const nextVersion = this.getConfigVersion(key) + 1;
    ConfigService.configVersions.set(key, nextVersion);
    return nextVersion;
  }

  private getCachedConfig<T>(key: string): T | null {
    const cached = ConfigService.configCache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      ConfigService.configCache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  private setCachedConfig<T>(key: string, value: T): T {
    this.bumpConfigVersion(key);
    ConfigService.configInflight.delete(key);
    ConfigService.configCache.set(key, {
      value,
      expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    });
    return value;
  }

  private clearCachedConfig(key: string) {
    this.bumpConfigVersion(key);
    ConfigService.configInflight.delete(key);
    ConfigService.configCache.delete(key);
  }

  async getConfig<T>(key: string, defaultValue: T): Promise<T> {
    const cached = this.getCachedConfig<T>(key);
    if (cached !== null) {
      return cached;
    }

    const inflight = ConfigService.configInflight.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    const loadVersion = this.getConfigVersion(key);
    const request = (async () => {
      try {
        const config = await this.prisma.trackingConfig.findUnique({
          where: { key },
        });

        const nextValue = config
          ? parseStoredJson(config.payload, defaultValue)
          : defaultValue;
        if (this.getConfigVersion(key) !== loadVersion) {
          const nextCached = this.getCachedConfig<T>(key);
          return nextCached !== null ? nextCached : nextValue;
        }

        return this.setCachedConfig(key, nextValue);
      } catch (error) {
        logger.error(`Failed to load config [${key}]`, { error });
        if (this.getConfigVersion(key) !== loadVersion) {
          const nextCached = this.getCachedConfig<T>(key);
          return nextCached !== null ? nextCached : defaultValue;
        }
        return this.setCachedConfig(key, defaultValue);
      }
    })().finally(() => {
      if (ConfigService.configInflight.get(key) === request) {
        ConfigService.configInflight.delete(key);
      }
    });

    ConfigService.configInflight.set(key, request);
    return request;
  }

  async setConfig<T>(key: string, payload: T): Promise<T> {
    try {
      await this.prisma.trackingConfig.upsert({
        where: { key },
        update: {
          payload: stringifyStoredJson(payload),
          updatedAt: new Date(),
        },
        create: {
          key,
          value: key,
          payload: stringifyStoredJson(payload),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return this.setCachedConfig(key, payload);
    } catch (error) {
      logger.error(`Failed to persist config [${key}]`, { error });
      throw error;
    }
  }

  async deleteConfig(key: string): Promise<void> {
    try {
      await this.prisma.trackingConfig.delete({
        where: { key },
      });
      this.clearCachedConfig(key);
    } catch (error) {
      logger.error(`Failed to delete config [${key}]`, { error });
      throw error;
    }
  }

  async getAllConfigs(): Promise<Record<string, unknown>> {
    try {
      const configs = await this.prisma.trackingConfig.findMany();
      const result: Record<string, unknown> = {};

      for (const config of configs) {
        result[config.key] = parseStoredJson<unknown>(config.payload, config.payload);
      }

      return result;
    } catch (error) {
      logger.error("Failed to load all configs", { error });
      return {};
    }
  }

  async setConfigs(configs: Record<string, unknown>): Promise<void> {
    try {
      await Promise.all(
        Object.entries(configs).map(([key, value]) => this.setConfig(key, value)),
      );
    } catch (error) {
      logger.error("Failed to persist configs in batch", { error });
      throw error;
    }
  }

  async hasConfig(key: string): Promise<boolean> {
    try {
      const config = await this.prisma.trackingConfig.findUnique({
        where: { key },
      });

      return Boolean(config);
    } catch (error) {
      logger.error(`Failed to check config [${key}]`, { error });
      return false;
    }
  }

  async mergeConfig<T extends Record<string, unknown>>(
    key: string,
    payload: Partial<T>,
  ): Promise<T> {
    try {
      const existing = await this.getConfig<T>(key, {} as T);
      const merged = {
        ...existing,
        ...payload,
      } as T;

      return this.setConfig(key, merged);
    } catch (error) {
      logger.error(`Failed to merge config [${key}]`, { error });
      throw error;
    }
  }
}
