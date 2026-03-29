import { Injectable } from "@nestjs/common";
import { getRedisClient, getRedisStatus } from "../redis/client";
import { logger } from "../logger/winston.init";

type LocalCacheEntry = {
  payload: string;
  expiresAt: number | null;
};

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

@Injectable()
export class CacheService {
  private readonly localFallback = new Map<string, LocalCacheEntry>();

  private readLocal<T>(key: string): T | null {
    const entry = this.localFallback.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.localFallback.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.payload) as T;
    } catch {
      this.localFallback.delete(key);
      return null;
    }
  }

  private writeLocal(key: string, payload: string, ttlSeconds?: number): void {
    this.localFallback.set(key, {
      payload,
      expiresAt: typeof ttlSeconds === "number" && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  private async scanDelete(pattern: string): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      const matcher = wildcardToRegExp(pattern);
      for (const key of [...this.localFallback.keys()]) {
        if (matcher.test(key)) {
          this.localFallback.delete(key);
        }
      }
      return;
    }

    const stream = client.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: string[]) => {
        if (Array.isArray(chunk) && chunk.length > 0) {
          keys.push(...chunk);
        }
      });
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) {
      return this.readLocal<T>(key);
    }

    try {
      const value = await client.get(key);
      if (!value) {
        return this.readLocal<T>(key);
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn("[cache] read failed, falling back to in-memory cache", {
        key,
        status: getRedisStatus(),
        message: error instanceof Error ? error.message : String(error),
      });
      return this.readLocal<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    this.writeLocal(key, payload, ttlSeconds);

    const client = getRedisClient();
    if (!client) {
      return;
    }

    try {
      if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
        await client.set(key, payload, "EX", ttlSeconds);
      } else {
        await client.set(key, payload);
      }
    } catch (error) {
      logger.warn("[cache] write failed, kept local fallback only", {
        key,
        status: getRedisStatus(),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(key: string): Promise<void> {
    this.localFallback.delete(key);

    const client = getRedisClient();
    if (!client) {
      return;
    }

    await client.del(key).catch((error: unknown) => {
      logger.warn("[cache] delete failed", {
        key,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async deletePattern(pattern: string): Promise<void> {
    await this.scanDelete(pattern).catch((error: unknown) => {
      logger.warn("[cache] pattern delete failed", {
        pattern,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async deletePatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.readLocal(key) !== null) {
      return true;
    }

    const client = getRedisClient();
    if (!client) {
      return false;
    }

    try {
      return (await client.exists(key)) === 1;
    } catch {
      return false;
    }
  }
}
