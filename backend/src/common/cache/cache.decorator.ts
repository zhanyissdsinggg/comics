import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * 缓存装饰器 - 用于自动缓存方法返回值
 * 使用方式：
 * @Cacheable('series:list', 3600)
 * async getSeries() { ... }
 */
export function Cacheable(keyPrefix: string, ttlSeconds: number = 3600) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheService = this.cacheService as CacheService;

      // 构建缓存键
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      await cacheService.set(cacheKey, result, ttlSeconds);

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存清除装饰器 - 用于在方法执行后清除相关缓存
 * 使用方式：
 * @CacheEvict('series:*')
 * async updateSeries() { ... }
 */
export function CacheEvict(keyPattern: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheService = this.cacheService as CacheService;

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 清除相关缓存
      await cacheService.deletePattern(keyPattern);

      return result;
    };

    return descriptor;
  };
}
