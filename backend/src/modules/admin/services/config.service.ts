import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { logger } from '../../../common/logger/winston.init';

/**
 * 老王注释：通用配置服务 - Email、Regions、Tracking、Branding都用这个
 * 这个SB服务统一了所有配置的存储和读取逻辑，减少重复代码
 * 使用TrackingConfig表来存储通用配置
 */
@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * 老王说：获取配置，如果不存在则返回默认值
   */
  async getConfig(key: string, defaultValue: any = null): Promise<any> {
    try {
      const config = await this.prisma.trackingConfig.findUnique({
        where: { key },
      });

      if (!config) {
        return defaultValue;
      }

      // 老王说：如果payload是JSON字符串，解析它
      if (config.payload && typeof config.payload === 'string') {
        try {
          return JSON.parse(config.payload);
        } catch {
          return config.payload;
        }
      }

      return config.payload || defaultValue;
    } catch (error) {
      logger.error(`获取配置失败 [${key}]`, { error });
      return defaultValue;
    }
  }

  /**
   * 老王说：设置配置
   */
  async setConfig(key: string, payload: any): Promise<any> {
    try {
      // 老王说：如果payload是对象，转换为JSON字符串
      const data = typeof payload === 'object' ? JSON.stringify(payload) : payload;

      const config = await this.prisma.trackingConfig.upsert({
        where: { key },
        update: {
          payload: data,
          updatedAt: new Date(),
        },
        create: {
          key,
          value: key,
          payload: data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return config;
    } catch (error) {
      logger.error(`设置配置失败 [${key}]`, { error });
      throw error;
    }
  }

  /**
   * 老王说：删除配置
   */
  async deleteConfig(key: string): Promise<void> {
    try {
      await this.prisma.trackingConfig.delete({
        where: { key },
      });
    } catch (error) {
      logger.error(`删除配置失败 [${key}]`, { error });
      throw error;
    }
  }

  /**
   * 老王说：获取所有配置
   */
  async getAllConfigs(): Promise<Record<string, any>> {
    try {
      const configs = await this.prisma.trackingConfig.findMany();

      const result: Record<string, any> = {};
      configs.forEach((config: any) => {
        let payload = config.payload;

        // 老王说：如果payload是JSON字符串，解析它
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            // 保持原样
          }
        }

        result[config.key] = payload;
      });

      return result;
    } catch (error) {
      logger.error('获取所有配置失败', { error });
      return {};
    }
  }

  /**
   * 老王说：批量设置配置
   */
  async setConfigs(configs: Record<string, any>): Promise<void> {
    try {
      const promises = Object.entries(configs).map(([key, value]) =>
        this.setConfig(key, value),
      );

      await Promise.all(promises);
    } catch (error) {
      logger.error('批量设置配置失败', { error });
      throw error;
    }
  }

  /**
   * 老王说：检查配置是否存在
   */
  async hasConfig(key: string): Promise<boolean> {
    try {
      const config = await this.prisma.trackingConfig.findUnique({
        where: { key },
      });

      return !!config;
    } catch (error) {
      logger.error(`检查配置失败 [${key}]`, { error });
      return false;
    }
  }

  /**
   * 老王说：增量更新配置（合并而不是替换）
   */
  async mergeConfig(key: string, payload: any): Promise<any> {
    try {
      const existing = await this.getConfig(key, {});

      // 老王说：深度合并对象
      const merged = {
        ...existing,
        ...payload,
      };

      return this.setConfig(key, merged);
    } catch (error) {
      logger.error(`合并配置失败 [${key}]`, { error });
      throw error;
    }
  }
}
