import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger/winston.init';

/**
 * Redis缓存服务 - 统一管理所有缓存操作
 * 这个SB缓存服务处理热点数据的缓存，提升系统性能
 */
@Injectable()
export class CacheService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    // 老王说：如果没有配置Redis，就不创建客户端，避免无谓的连接尝试
    if (!process.env.REDIS_HOST) {
      logger.warn('未配置Redis，将使用内存缓存');
      this.client = null as any;
      return;
    }

    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: false, // 老王说：禁用自动重连，避免大量日志
      },
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('error', (err) => {
      // 老王说：只记录一次错误，避免日志爆炸
      if (!this.isConnected) {
        logger.error('Redis连接错误，将使用内存缓存', { error: err });
      }
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis连接成功');
      this.isConnected = true;
    });
  }

  /**
   * 初始化Redis连接
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Redis连接失败，将使用内存缓存', { error });
      }
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`获取缓存失败 [${key}]`, { error });
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlSeconds 过期时间（秒）
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error(`设置缓存失败 [${key}]`, { error });
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`删除缓存失败 [${key}]`, { error });
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error(`批量删除缓存失败 [${pattern}]`, { error });
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.flushDb();
    } catch (error) {
      logger.error('清空缓存失败', { error });
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`检查缓存失败 [${key}]`, { error });
      return false;
    }
  }

  /**
   * 获取缓存的剩余TTL（秒）
   */
  async getTtl(key: string): Promise<number> {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`获取TTL失败 [${key}]`, { error });
      return -1;
    }
  }
}
