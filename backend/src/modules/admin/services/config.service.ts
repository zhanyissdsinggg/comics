import { Injectable } from "@nestjs/common";
import { logger } from "../../../common/logger/winston.init";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../common/utils/stored-json";

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const config = await this.prisma.trackingConfig.findUnique({
        where: { key },
      });

      if (!config) {
        return defaultValue;
      }

      return parseStoredJson(config.payload, defaultValue);
    } catch (error) {
      logger.error(`Failed to load config [${key}]`, { error });
      return defaultValue;
    }
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

      return payload;
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
