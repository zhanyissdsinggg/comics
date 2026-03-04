import Redis from "ioredis";
import { logger } from "../logger/winston.init";

let client: Redis | null = null;
let initFailed = false;

export function getRedisClient() {
  if (initFailed) {
    return null;
  }
  if (client) {
    return client;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  try {
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    return client;
  } catch (err) {
    initFailed = true;
    logger.warn("Redis初始化失败", { error: err });
    return null;
  }
}
